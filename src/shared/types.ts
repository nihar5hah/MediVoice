export type LanguageCode = 'en' | 'hi' | 'ta';

export type AppointmentStatus = 'booked' | 'cancelled' | 'completed';

export type ConversationMode = 'inbound' | 'outbound';

export type Intent = 'book' | 'reschedule' | 'cancel' | 'list' | 'check_availability' | 'campaign_response' | 'clarify';

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  startIso: string;
  status: AppointmentStatus;
}

export interface PatientMemory {
  patientId: string;
  languagePreference: LanguageCode;
  preferences: {
    name?: string;
    doctorId?: string;
    specialty?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
  history: string[];
  updatedAt: string;
}

export interface SessionState {
  sessionId: string;
  patientId: string;
  language: LanguageCode;
  currentIntent?: Intent;
  pendingConfirmation?: {
    action: Intent;
    appointmentId?: string;
    doctorId?: string;
    startIso?: string;
  };
  gatheringBook?: {
    step: 'doctor' | 'time' | 'name';
    doctorId?: string;
    startIso?: string;
  };
  turns: number;
  updatedAt: string;
}

export interface AgentTraceStep {
  at: string;
  step: string;
  detail: string;
  elapsedMs: number;
}

export interface VoiceTurnRequest {
  sessionId: string;
  patientId: string;
  utterance: string;
  mode?: ConversationMode;
}

export interface VoiceTurnResponse {
  reply: string;
  language: LanguageCode;
  latencyMs: number;
  trace: AgentTraceStep[];
  session: SessionState;
  appointments: Appointment[];
}

export interface CampaignRequest {
  patientId: string;
  campaignType: 'reminder' | 'follow_up';
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  languages: LanguageCode[];
}
