import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Appointment, PatientMemory, SessionState } from '../shared/types.js';
import type { AgentStore, CampaignLogEntry } from './storeInterface.js';

interface StoreShape {
  patients: Record<string, PatientMemory>;
  sessions: Record<string, SessionState>;
  appointments: Appointment[];
  campaignLog: Array<{ patientId: string; campaignType: string; outcome: string; at: string }>;
}

const defaultStore: StoreShape = {
  patients: {},
  sessions: {},
  appointments: [],
  campaignLog: []
};

export class JsonStore implements AgentStore {
  private data: StoreShape = structuredClone(defaultStore);

  constructor(private readonly filePath = join(process.cwd(), 'data', 'store.json')) {}

  async load() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.data = { ...structuredClone(defaultStore), ...JSON.parse(raw) };
    } catch {
      await this.save();
    }
  }

  async save() {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async getPatient(patientId: string): Promise<PatientMemory | undefined> {
    return this.data.patients[patientId];
  }

  async upsertPatient(memory: PatientMemory) {
    this.data.patients[memory.patientId] = memory;
    await this.save();
  }

  async listPatients(): Promise<PatientMemory[]> {
    return Object.values(this.data.patients);
  }

  async updatePatient(patientId: string, updates: Partial<Pick<PatientMemory, 'languagePreference' | 'preferences'>>): Promise<PatientMemory | undefined> {
    const patient = this.data.patients[patientId];
    if (!patient) return undefined;
    this.data.patients[patientId] = { ...patient, ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    return this.data.patients[patientId];
  }

  async deletePatient(patientId: string): Promise<void> {
    delete this.data.patients[patientId];
    for (const [sid, session] of Object.entries(this.data.sessions)) {
      if (session.patientId === patientId) delete this.data.sessions[sid];
    }
    this.data.appointments = this.data.appointments.filter(a => a.patientId !== patientId);
    await this.save();
  }

  async getSession(sessionId: string): Promise<SessionState | undefined> {
    return this.data.sessions[sessionId];
  }

  async upsertSession(session: SessionState) {
    this.data.sessions[session.sessionId] = session;
    await this.save();
  }

  async listAppointments(patientId?: string): Promise<Appointment[]> {
    return this.data.appointments.filter((appointment) => !patientId || appointment.patientId === patientId);
  }

  async upsertAppointment(appointment: Appointment) {
    const index = this.data.appointments.findIndex((item) => item.id === appointment.id);
    if (index >= 0) this.data.appointments[index] = appointment;
    else this.data.appointments.push(appointment);
    await this.save();
  }

  async updateAppointment(id: string, updates: Partial<Pick<Appointment, 'status' | 'startIso'>>): Promise<Appointment | undefined> {
    const idx = this.data.appointments.findIndex(a => a.id === id);
    if (idx < 0) return undefined;
    this.data.appointments[idx] = { ...this.data.appointments[idx], ...updates };
    await this.save();
    return this.data.appointments[idx];
  }

  async deleteAppointment(id: string): Promise<void> {
    this.data.appointments = this.data.appointments.filter(a => a.id !== id);
    await this.save();
  }

  async logCampaign(patientId: string, campaignType: string, outcome: string) {
    this.data.campaignLog.push({ patientId, campaignType, outcome, at: new Date().toISOString() });
    await this.save();
  }

  async listCampaignLogs(): Promise<CampaignLogEntry[]> {
    return [...this.data.campaignLog];
  }
}
