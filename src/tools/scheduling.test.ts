import { describe, it, expect, beforeEach } from 'vitest';
import { JsonStore } from '../memory/store.js';
import { bookAppointment, cancelAppointment, checkAvailability, findActiveAppointment, rescheduleAppointment } from './scheduling.js';
import type { Appointment } from '../shared/types.js';

async function freshStore(): Promise<JsonStore> {
  const s = new JsonStore(':memory:' as never);
  // Skip file IO for tests
  (s as any).data = { patients: {}, sessions: {}, appointments: [], campaignLog: [] };
  (s as any).save = async () => {};
  return s;
}

function futureISO(hour: number, daysFromNow = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe('checkAvailability', () => {
  it('rejects 1pm (hour=13, not in working hours) and returns alternatives', async () => {
    const store = await freshStore();
    const result = await checkAvailability({ startIso: futureISO(13), language: 'en' }, store);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/outside working hours/i);
    expect(result.data?.slots.length).toBeGreaterThan(0);
  });

  it('accepts a valid working hour slot (10am)', async () => {
    const store = await freshStore();
    const result = await checkAvailability({ startIso: futureISO(10), language: 'en' }, store);
    expect(result.ok).toBe(true);
  });

  it('rejects a past time', async () => {
    const store = await freshStore();
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const result = await checkAvailability({ startIso: past, language: 'en' }, store);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/past/i);
  });

  it('rejects a conflicting slot', async () => {
    const store = await freshStore();
    const slot = futureISO(9);
    await bookAppointment('p1', { startIso: slot, language: 'en' }, store);
    // confirm the booking (2 turns: first returns pending confirmation, second executes)
    // For direct tool test, upsert manually
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [{ id: 'x', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: slot, status: 'booked' }];
    const result = await checkAvailability({ doctorId: doctors[0].id, startIso: slot, language: 'en' }, store);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/booked/i);
  });
});

describe('bookAppointment', () => {
  it('creates exactly one appointment for a valid working-hour slot', async () => {
    const store = await freshStore();
    const slot = futureISO(9);
    const result = await bookAppointment('p1', { startIso: slot, language: 'en' }, store);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    const appts = await store.listAppointments('p1');
    expect(appts).toHaveLength(1);
    expect(appts[0].status).toBe('booked');
  });

  it('does not create an appointment for 1pm (outside working hours)', async () => {
    const store = await freshStore();
    const result = await bookAppointment('p1', { startIso: futureISO(13), language: 'en' }, store);
    expect(result.ok).toBe(false);
    const appts = await store.listAppointments('p1');
    expect(appts).toHaveLength(0);
  });
});

describe('cancelAppointment + findActiveAppointment', () => {
  it('cancels the appointment matching doctorId', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'booked' },
      { id: 'a2', patientId: 'p1', doctorId: doctors[1].id, doctorName: doctors[1].name, specialty: doctors[1].specialty, startIso: futureISO(10), status: 'booked' },
    ];
    const sel = await findActiveAppointment('p1', { doctorId: doctors[1].id }, store);
    expect(sel.status).toBe('matched');
    if (sel.status === 'matched') {
      expect(sel.appointment.id).toBe('a2');
      sel.appointment.status = 'cancelled';
      await store.upsertAppointment(sel.appointment);
    }
    const remaining = (await store.listAppointments('p1')).filter(a => a.status === 'booked');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('a1');
  });

  it('returns ambiguous when multiple active appointments and no doctor given', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'old', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9, 1), status: 'booked' },
      { id: 'recent', patientId: 'p1', doctorId: doctors[1].id, doctorName: doctors[1].name, specialty: doctors[1].specialty, startIso: futureISO(9, 3), status: 'booked' },
    ];
    const sel = await findActiveAppointment('p1', {}, store);
    expect(sel.status).toBe('ambiguous');
  });

  it('returns none when no active appointments', async () => {
    const store = await freshStore();
    const result = await findActiveAppointment('p1', {}, store);
    expect(result.status).toBe('none');
  });
});

describe('rescheduleAppointment', () => {
  it('rejects a reschedule to an invalid working-hour slot', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'booked' },
    ];
    const result = await rescheduleAppointment('p1', { startIso: futureISO(13), language: 'en' }, store);
    expect(result.ok).toBe(false);
    const appts = await store.listAppointments('p1');
    expect(new Date(appts[0].startIso).getHours()).toBe(9);
  });

  it('mutates only the appointment matching appointmentId', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'booked' },
      { id: 'a2', patientId: 'p1', doctorId: doctors[1].id, doctorName: doctors[1].name, specialty: doctors[1].specialty, startIso: futureISO(10), status: 'booked' },
    ];
    const result = await rescheduleAppointment('p1', { language: 'en' }, store, 'a2');
    expect(result.ok).toBe(true);
    expect(result.data?.id).toBe('a2');
    const appts = await store.listAppointments('p1');
    // a1 must be untouched at hour 9
    const a1 = appts.find(a => a.id === 'a1')!;
    expect(new Date(a1.startIso).getHours()).toBe(9);
  });

  it('returns failure when appointmentId is missing from store', async () => {
    const store = await freshStore();
    const result = await rescheduleAppointment('p1', { language: 'en' }, store, 'does-not-exist');
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no matching/i);
  });

  it('returns failure when appointmentId points to a cancelled appointment', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'cancelled' },
    ];
    const result = await rescheduleAppointment('p1', { language: 'en' }, store, 'a1');
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no matching/i);
  });

  it('returns failure without appointmentId when multiple active appointments exist', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'booked' },
      { id: 'a2', patientId: 'p1', doctorId: doctors[1].id, doctorName: doctors[1].name, specialty: doctors[1].specialty, startIso: futureISO(10), status: 'booked' },
    ];
    const result = await rescheduleAppointment('p1', { language: 'en' }, store);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/multiple/i);
  });
});

describe('findActiveAppointment discriminated union', () => {
  it('returns matched when only one active appointment exists (no doctor given)', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'booked' },
    ];
    const result = await findActiveAppointment('p1', {}, store);
    expect(result.status).toBe('matched');
    if (result.status === 'matched') expect(result.appointment.id).toBe('a1');
  });

  it('returns ambiguous when multiple active appointments exist and no disambiguator', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'booked' },
      { id: 'a2', patientId: 'p1', doctorId: doctors[1].id, doctorName: doctors[1].name, specialty: doctors[1].specialty, startIso: futureISO(10), status: 'booked' },
    ];
    const result = await findActiveAppointment('p1', {}, store);
    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') expect(result.appointments).toHaveLength(2);
  });

  it('returns matched by doctorId even when multiple active appointments exist', async () => {
    const store = await freshStore();
    const { doctors } = await import('./scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: doctors[0].id, doctorName: doctors[0].name, specialty: doctors[0].specialty, startIso: futureISO(9), status: 'booked' },
      { id: 'a2', patientId: 'p1', doctorId: doctors[1].id, doctorName: doctors[1].name, specialty: doctors[1].specialty, startIso: futureISO(10), status: 'booked' },
    ];
    const result = await findActiveAppointment('p1', { doctorId: doctors[1].id }, store);
    expect(result.status).toBe('matched');
    if (result.status === 'matched') expect(result.appointment.id).toBe('a2');
  });

  it('returns none when no active appointments', async () => {
    const store = await freshStore();
    const result = await findActiveAppointment('p1', {}, store);
    expect(result.status).toBe('none');
  });
});
