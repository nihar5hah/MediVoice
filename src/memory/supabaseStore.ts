import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Appointment, PatientMemory, SessionState } from '../shared/types.js';
import type { AgentStore, CampaignLogEntry, TraceEntry } from './storeInterface.js';

export class SupabaseStore implements AgentStore {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment');
    }
    this.client = createClient(url, key);
  }

  async getPatient(patientId: string): Promise<PatientMemory | undefined> {
    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .eq('patient_id', patientId)
      .single();
    if (error || !data) return undefined;
    return this.rowToPatient(data);
  }

  async listPatients(): Promise<PatientMemory[]> {
    const { data } = await this.client.from('patients').select('*');
    return (data ?? []).map((row) => this.rowToPatient(row as Record<string, unknown>));
  }

  async updatePatient(patientId: string, updates: Partial<Pick<PatientMemory, 'languagePreference' | 'preferences'>>): Promise<PatientMemory | undefined> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.languagePreference !== undefined) dbUpdates.language_preference = updates.languagePreference;
    if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
    const { data } = await this.client.from('patients').update(dbUpdates).eq('patient_id', patientId).select().single();
    if (!data) return undefined;
    return this.rowToPatient(data as Record<string, unknown>);
  }

  async deletePatient(patientId: string): Promise<void> {
    await this.client.from('sessions').delete().eq('patient_id', patientId);
    await this.client.from('appointments').delete().eq('patient_id', patientId);
    await this.client.from('patients').delete().eq('patient_id', patientId);
  }

  async upsertPatient(memory: PatientMemory): Promise<void> {
    await this.client.from('patients').upsert({
      patient_id: memory.patientId,
      language_preference: memory.languagePreference,
      preferences: memory.preferences,
      history: memory.history,
      updated_at: memory.updatedAt
    });
  }

  async getSession(sessionId: string): Promise<SessionState | undefined> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    if (error || !data) return undefined;
    return this.rowToSession(data);
  }

  async upsertSession(session: SessionState): Promise<void> {
    await this.client.from('sessions').upsert({
      session_id: session.sessionId,
      patient_id: session.patientId,
      language: session.language,
      current_intent: session.currentIntent ?? null,
      pending_confirmation: session.pendingConfirmation ?? null,
      gathering_book: session.gatheringBook ?? null,
      turns: session.turns,
      updated_at: session.updatedAt
    });
  }

  async listAppointments(patientId?: string): Promise<Appointment[]> {
    let query = this.client.from('appointments').select('*');
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => this.rowToAppointment(row));
  }

  async updateAppointment(id: string, updates: Partial<Pick<Appointment, 'status' | 'startIso'>>): Promise<Appointment | undefined> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.startIso !== undefined) dbUpdates.start_iso = updates.startIso;
    const { data } = await this.client.from('appointments').update(dbUpdates).eq('id', id).select().single();
    if (!data) return undefined;
    return this.rowToAppointment(data as Record<string, unknown>);
  }

  async deleteAppointment(id: string): Promise<void> {
    await this.client.from('appointments').delete().eq('id', id);
  }

  async upsertAppointment(appointment: Appointment): Promise<void> {
    await this.client.from('appointments').upsert({
      id: appointment.id,
      patient_id: appointment.patientId,
      patient_name: appointment.patientName ?? null,
      doctor_id: appointment.doctorId,
      doctor_name: appointment.doctorName,
      specialty: appointment.specialty,
      start_iso: appointment.startIso,
      status: appointment.status
    });
  }

  async listCampaignLogs(): Promise<CampaignLogEntry[]> {
    const { data } = await this.client.from('campaign_logs').select('*').order('at', { ascending: false });
    return (data ?? []).map((row) => ({
      patientId: row.patient_id as string,
      campaignType: row.campaign_type as string,
      outcome: row.outcome as string,
      at: row.at as string,
    }));
  }

  async logCampaign(patientId: string, campaignType: string, outcome: string): Promise<void> {
    await this.client.from('campaign_logs').insert({
      patient_id: patientId,
      campaign_type: campaignType,
      outcome,
      at: new Date().toISOString()
    });
  }

  async logTrace(entry: TraceEntry): Promise<void> {
    await this.client.from('call_traces').insert({
      call_id:    entry.callId,
      patient_id: entry.patientId,
      turn:       entry.turn,
      utterance:  entry.utterance,
      reply:      entry.reply,
      intent:     entry.intent ?? null,
      language:   entry.language ?? null,
      latency_ms: entry.latencyMs,
      trace:      entry.trace,
      created_at: entry.createdAt
    });
  }

  async listTraces(limit = 100): Promise<TraceEntry[]> {
    const { data } = await this.client
      .from('call_traces')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map(row => ({
      id:         row.id as number,
      callId:     row.call_id as string,
      patientId:  row.patient_id as string,
      turn:       row.turn as number,
      utterance:  row.utterance as string,
      reply:      row.reply as string,
      intent:     (row.intent as string) || undefined,
      language:   (row.language as string) || undefined,
      latencyMs:  row.latency_ms as number,
      trace:      (row.trace as TraceEntry['trace']) ?? [],
      createdAt:  row.created_at as string
    }));
  }

  private rowToPatient(row: Record<string, unknown>): PatientMemory {
    return {
      patientId: row.patient_id as string,
      languagePreference: row.language_preference as PatientMemory['languagePreference'],
      preferences: (row.preferences as PatientMemory['preferences']) ?? {},
      history: (row.history as string[]) ?? [],
      updatedAt: row.updated_at as string
    };
  }

  private rowToSession(row: Record<string, unknown>): SessionState {
    return {
      sessionId: row.session_id as string,
      patientId: row.patient_id as string,
      language: row.language as SessionState['language'],
      currentIntent: (row.current_intent as SessionState['currentIntent']) ?? undefined,
      pendingConfirmation: (row.pending_confirmation as SessionState['pendingConfirmation']) ?? undefined,
      gatheringBook: (row.gathering_book as SessionState['gatheringBook']) ?? undefined,
      turns: row.turns as number,
      updatedAt: row.updated_at as string
    };
  }

  private rowToAppointment(row: Record<string, unknown>): Appointment {
    return {
      id: row.id as string,
      patientId: row.patient_id as string,
      patientName: (row.patient_name as string) || undefined,
      doctorId: row.doctor_id as string,
      doctorName: row.doctor_name as string,
      specialty: row.specialty as string,
      startIso: row.start_iso as string,
      status: row.status as Appointment['status']
    };
  }
}
