const BASE = '/api';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  startIso: string;
  status: 'booked' | 'cancelled' | 'completed';
}

export interface Patient {
  patient_id: string;
  language_preference: 'en' | 'hi' | 'ta';
  preferences: Record<string, unknown>;
  history: string[];
  updated_at: string;
}

export interface Campaign {
  id: number;
  patient_id: string;
  campaign_type: string;
  outcome: string;
  at: string;
}

export interface CampaignJob {
  id: string;
  patientId: string;
  campaignType: 'reminder' | 'follow_up';
  destinationNumber: string;
  scheduledAt: string;
  attempts: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  appointments: number;
}

export interface Analytics {
  totalAppointments: number;
  booked: number;
  cancelled: number;
  completed: number;
  totalPatients: number;
  languageDistribution: Record<string, number>;
  specialtyDistribution: Record<string, number>;
  doctorDistribution: Record<string, number>;
  totalCampaigns: number;
  campaignAccepted: number;
  avgTurns: number;
}

interface PatientApiShape {
  patient_id?: string;
  language_preference?: 'en' | 'hi' | 'ta';
  updated_at?: string;
  patientId?: string;
  languagePreference?: 'en' | 'hi' | 'ta';
  updatedAt?: string;
  preferences?: Record<string, unknown>;
  history?: string[];
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function normalizePatient(patient: PatientApiShape): Patient {
  return {
    patient_id: patient.patient_id ?? patient.patientId ?? '',
    language_preference: patient.language_preference ?? patient.languagePreference ?? 'en',
    preferences: patient.preferences ?? {},
    history: patient.history ?? [],
    updated_at: patient.updated_at ?? patient.updatedAt ?? new Date(0).toISOString(),
  };
}

export const api = {
  getAppointments: () => req<{ appointments: Appointment[] }>('/appointments').then(d => d.appointments),
  updateAppointment: (id: string, body: Partial<Appointment>) => req<{ ok: boolean }>(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAppointment: (id: string) => req<{ ok: boolean }>(`/appointments/${id}`, { method: 'DELETE' }),

  getPatients: () => req<{ patients: PatientApiShape[] }>('/patients').then(d => d.patients.map(normalizePatient)),
  updatePatient: (patientId: string, body: Partial<Patient>) => req<{ ok: boolean }>(`/patients/${patientId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePatient: (patientId: string) => req<{ ok: boolean }>(`/patients/${patientId}`, { method: 'DELETE' }),

  scheduleCampaign: (body: { patientId: string; campaignType: 'reminder' | 'follow_up'; destinationNumber: string; delayMinutes?: number }) =>
    req<{ ok: boolean; job: CampaignJob }>('/campaigns/schedule', { method: 'POST', body: JSON.stringify(body) }),
  getCampaignJobs: () => req<{ jobs: CampaignJob[] }>('/campaigns/jobs').then(d => d.jobs),
  cancelCampaignJob: (id: string) => req<{ ok: boolean }>(`/campaigns/jobs/${id}`, { method: 'DELETE' }),
  getDoctors: () => req<{ doctors: Doctor[] }>('/doctors').then(d => d.doctors),
  getCampaigns: () => req<{ campaigns: Campaign[] }>('/campaigns').then(d => d.campaigns),
  getAnalytics: () => req<Analytics>('/analytics'),
  getHealth: () => req<{ ok: boolean; services: Record<string, boolean> }>('/health'),
};
