import type { AgentTraceStep, Appointment, PatientMemory, SessionState } from '../shared/types.js';

export interface TraceEntry {
  id?: number;
  callId: string;
  patientId: string;
  turn: number;
  utterance: string;
  reply: string;
  intent?: string;
  language?: string;
  latencyMs: number;
  trace: AgentTraceStep[];
  createdAt: string;
}

export interface CampaignLogEntry {
  patientId: string;
  campaignType: string;
  outcome: string;
  at: string;
}

export interface AgentStore {
  getPatient(patientId: string): Promise<PatientMemory | undefined>;
  upsertPatient(memory: PatientMemory): Promise<void>;
  listPatients(): Promise<PatientMemory[]>;
  updatePatient(patientId: string, updates: Partial<Pick<PatientMemory, 'languagePreference' | 'preferences'>>): Promise<PatientMemory | undefined>;
  deletePatient(patientId: string): Promise<void>;

  getSession(sessionId: string): Promise<SessionState | undefined>;
  upsertSession(session: SessionState): Promise<void>;

  listAppointments(patientId?: string): Promise<Appointment[]>;
  upsertAppointment(appointment: Appointment): Promise<void>;
  updateAppointment(id: string, updates: Partial<Pick<Appointment, 'status' | 'startIso'>>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<void>;

  logCampaign(patientId: string, campaignType: string, outcome: string): Promise<void>;
  listCampaignLogs(): Promise<CampaignLogEntry[]>;

  logTrace(entry: TraceEntry): Promise<void>;
  listTraces(limit?: number): Promise<TraceEntry[]>;
}
