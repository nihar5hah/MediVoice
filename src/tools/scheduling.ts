import { nanoid } from 'nanoid';
import type { Appointment, Doctor, LanguageCode } from '../shared/types.js';
import type { AgentStore } from '../memory/storeInterface.js';

export const doctors: Doctor[] = [
  { id: 'doc-rao', name: 'Dr. Rao', specialty: 'general medicine', languages: ['en', 'hi'] },
  { id: 'doc-mehta', name: 'Dr. Mehta', specialty: 'cardiology', languages: ['en', 'hi'] },
  { id: 'doc-iyer', name: 'Dr. Iyer', specialty: 'dermatology', languages: ['en', 'ta'] }
];

const workingHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // 9 AM – 6 PM IST (Asia/Kolkata, UTC+5:30)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const toIST  = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS);
const fromIST = (d: Date) => new Date(d.getTime() - IST_OFFSET_MS);

export interface SlotCandidate {
  doctorId?: string;
  specialty?: string;
  startIso?: string;
  language: LanguageCode;
}

export interface ToolResult<T> {
  ok: boolean;
  message: string;
  data?: T;
}

export function findDoctor(candidate: SlotCandidate): Doctor | undefined {
  if (candidate.doctorId) return doctors.find((doctor) => doctor.id === candidate.doctorId);
  if (candidate.specialty) return doctors.find((doctor) => doctor.specialty.includes(candidate.specialty ?? ''));
  return doctors.find((doctor) => doctor.languages.includes(candidate.language)) ?? doctors[0];
}

export async function nextSlots(candidate: SlotCandidate, store: AgentStore, limit = 3) {
  const doctor = findDoctor(candidate) ?? doctors[0];
  const appointments = await store.listAppointments();
  const booked = new Set(
    appointments
      .filter((appointment) => appointment.doctorId === doctor.id && appointment.status === 'booked')
      .map((appointment) => new Date(appointment.startIso).toISOString())
  );
  const now = new Date();
  const nowIST = toIST(now);
  const slots: string[] = [];

  for (let day = 0; day < 10 && slots.length < limit; day += 1) {
    for (const hour of workingHours) {
      // Build the slot as IST, then convert to UTC for storage
      const slotIST = new Date(nowIST);
      slotIST.setUTCDate(nowIST.getUTCDate() + day);
      slotIST.setUTCHours(hour, 0, 0, 0);
      const slot = fromIST(slotIST);
      if (slot <= now) continue;
      const iso = slot.toISOString();
      if (!booked.has(iso)) slots.push(iso);
      if (slots.length >= limit) break;
    }
  }
  return { doctor, slots };
}

export type AppointmentSelectionResult =
  | { status: 'none' }
  | { status: 'matched'; appointment: Appointment }
  | { status: 'ambiguous'; appointments: Appointment[] };

export async function findActiveAppointment(
  patientId: string,
  candidate: { doctorId?: string; specialty?: string },
  store: AgentStore
): Promise<AppointmentSelectionResult> {
  const appointments = await store.listAppointments(patientId);
  const active = appointments.filter(a => a.status === 'booked');
  if (!active.length) return { status: 'none' };
  if (candidate.doctorId) {
    const match = active.find(a => a.doctorId === candidate.doctorId);
    if (match) return { status: 'matched', appointment: match };
  }
  if (candidate.specialty) {
    const match = active.find(a => a.specialty.toLowerCase().includes(candidate.specialty!.toLowerCase()));
    if (match) return { status: 'matched', appointment: match };
  }
  if (active.length === 1) return { status: 'matched', appointment: active[0] };
  return { status: 'ambiguous', appointments: active };
}

export async function checkAvailability(candidate: SlotCandidate, store: AgentStore): Promise<ToolResult<{ doctor: Doctor; slots: string[] }>> {
  const doctor = findDoctor(candidate);
  if (!doctor) return { ok: false, message: 'No matching doctor was found.' };
  const requested = candidate.startIso ? new Date(candidate.startIso) : undefined;
  if (requested && requested <= new Date()) return { ok: false, message: 'Requested time is in the past.', data: await nextSlots(candidate, store) };
  const requestedISTHour = requested ? toIST(requested).getUTCHours() : undefined;
  if (requested && !workingHours.includes(requestedISTHour!)) {
    return { ok: false, message: 'Requested time is outside working hours (9 AM to 6 PM IST). Please choose a time in that range.', data: await nextSlots(candidate, store) };
  }
  const appointments = await store.listAppointments();
  const conflict = requested
    ? appointments.some((appointment) => appointment.doctorId === doctor.id && new Date(appointment.startIso).toISOString() === requested.toISOString() && appointment.status === 'booked')
    : false;
  if (conflict) return { ok: false, message: 'Requested slot is already booked.', data: await nextSlots(candidate, store) };
  return { ok: true, message: 'Slot is available.', data: { doctor, slots: requested ? [requested.toISOString()] : (await nextSlots(candidate, store)).slots } };
}

export async function bookAppointment(patientId: string, candidate: SlotCandidate, store: AgentStore): Promise<ToolResult<Appointment>> {
  const availability = await checkAvailability(candidate, store);
  if (!availability.ok || !availability.data?.slots[0]) return { ok: false, message: availability.message, data: undefined };
  const doctor = availability.data.doctor;
  const appointment: Appointment = {
    id: nanoid(8),
    patientId,
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    startIso: availability.data.slots[0],
    status: 'booked'
  };
  await store.upsertAppointment(appointment);
  return { ok: true, message: 'Appointment booked.', data: appointment };
}

export async function cancelAppointment(patientId: string, store: AgentStore): Promise<ToolResult<Appointment>> {
  const appointments = await store.listAppointments(patientId);
  const appointment = appointments.find((item) => item.status === 'booked');
  if (!appointment) return { ok: false, message: 'No active appointment found.' };
  appointment.status = 'cancelled';
  await store.upsertAppointment(appointment);
  return { ok: true, message: 'Appointment cancelled.', data: appointment };
}

export async function rescheduleAppointment(patientId: string, candidate: SlotCandidate, store: AgentStore, appointmentId?: string): Promise<ToolResult<Appointment>> {
  const appointments = await store.listAppointments(patientId);
  let current: Appointment | undefined;
  if (appointmentId) {
    current = appointments.find(a => a.id === appointmentId && a.status === 'booked');
    if (!current) return { ok: false, message: 'No matching active appointment found.' };
  } else {
    const active = appointments.filter(a => a.status === 'booked');
    if (active.length === 0) return { ok: false, message: 'No active appointment found to reschedule.' };
    if (active.length > 1) return { ok: false, message: 'Multiple active appointments found. Please specify which one to reschedule.' };
    current = active[0];
  }
  const availability = await checkAvailability({ ...candidate, doctorId: candidate.doctorId ?? current.doctorId }, store);
  if (!availability.ok || !availability.data?.slots[0]) return { ok: false, message: availability.message };
  current.startIso = availability.data.slots[0];
  current.doctorId = availability.data.doctor.id;
  current.doctorName = availability.data.doctor.name;
  current.specialty = availability.data.doctor.specialty;
  await store.upsertAppointment(current);
  return { ok: true, message: 'Appointment rescheduled.', data: current };
}
