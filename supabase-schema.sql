-- Run this SQL in your Supabase SQL Editor to create the tables needed for the voice agent

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  patient_id TEXT PRIMARY KEY,
  language_preference TEXT NOT NULL CHECK (language_preference IN ('en', 'hi', 'ta')),
  preferences JSONB DEFAULT '{}',
  history JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'hi', 'ta')),
  current_intent TEXT CHECK (current_intent IN ('book', 'reschedule', 'cancel', 'list', 'campaign_response', 'clarify')),
  pending_confirmation JSONB DEFAULT NULL,
  turns INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  start_iso TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('booked', 'cancelled', 'completed'))
);

-- Campaign logs table
CREATE TABLE IF NOT EXISTS campaign_logs (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (optional but recommended for production)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for service_role (admin access)
CREATE POLICY "Service role full access" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON campaign_logs FOR ALL USING (true) WITH CHECK (true);
