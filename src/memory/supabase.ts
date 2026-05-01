import { createClient } from '@supabase/supabase-js';
import type { Appointment, PatientMemory, SessionState } from '../shared/types.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseStore {
  async load() {
    // No-op for Supabase — data is always live
  }

  async save() {
    // No-op for Supabase — data is persisted immediately
  }

  async getPatient(patientId: string): Promise<PatientMemory | undefined> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_id', patientId)
      .single();
    
    if (error || !data) return undefined;
    
    return {
      patientId: data.patient_id,
      languagePreference: data.language_preference,
      preferences: data.preferences || {},
      history: data.history || [],
      updatedAt: data.updated_at
    };
  }

  async upsertPatient(memory: PatientMemory): Promise<void> {
    await supabase
      .from('patients')
      .upsert({
        patient_id: memory.patientId,
        language_preference: memory.languagePreference,
        preferences: memory.preferences,
        history: memory.history,
        updated_at: memory.updatedAt
      });
  }

  async getSession(sessionId: string): Promise<SessionState | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error || !data) return undefined;
    
    return {
      sessionId: data.session_id,
      patientId: data.patient_id,
      language: data.language,
      currentIntent: data.current_intent || undefined,
      pendingConfirmation: data.pending_confirmation || undefined,
      turns: data.turns,
      updatedAt: data.updated_at
    };
  }

  async upsertSession(session: SessionState): Promise<void> {
    await supabase
      .from('sessions')
      .upsert({
        session_id: session.sessionId,
        patient_id: session.patientId,
        language: session.language,
        current_intent: session.currentIntent || null,
        pending_confirmation: session.pendingConfirmation || null,
        turns: session.turns,
        updated_at: session.updatedAt
      });
  }

  async listAppointments(patientId?: string): Promise<Appointment[]> {
    let query = supabase.from('appointments').select('*').order('start_iso', { ascending: true });
    
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    
    const { data, error } = await query;
    
    if (error || !data) return [];
    
    return data.map((row) => ({
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      specialty: row.specialty,
      startIso: row.start_iso,
      status: row.status
    }));
  }

  async upsertAppointment(appointment: Appointment): Promise<void> {
    await supabase
      .from('appointments')
      .upsert({
        id: appointment.id,
        patient_id: appointment.patientId,
        doctor_id: appointment.doctorId,
        doctor_name: appointment.doctorName,
        specialty: appointment.specialty,
        start_iso: appointment.startIso,
        status: appointment.status
      });
  }

  async logCampaign(patientId: string, campaignType: string, outcome: string): Promise<void> {
    await supabase
      .from('campaign_logs')
      .insert({
        patient_id: patientId,
        campaign_type: campaignType,
        outcome
      });
  }
}
