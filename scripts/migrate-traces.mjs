import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Check if table exists already
const { error: checkError } = await client.from('call_traces').select('id').limit(1);
if (!checkError) {
  console.log('call_traces table already exists — nothing to do.');
  process.exit(0);
}

console.log('Table missing. Please run the following SQL in your Supabase SQL editor:');
console.log(`
CREATE TABLE IF NOT EXISTS call_traces (
  id          BIGSERIAL PRIMARY KEY,
  call_id     TEXT        NOT NULL,
  patient_id  TEXT        NOT NULL,
  turn        INTEGER     NOT NULL,
  utterance   TEXT        NOT NULL,
  reply       TEXT        NOT NULL,
  intent      TEXT,
  language    TEXT,
  latency_ms  INTEGER     NOT NULL,
  trace       JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS call_traces_call_id_idx    ON call_traces(call_id);
CREATE INDEX IF NOT EXISTS call_traces_patient_id_idx ON call_traces(patient_id);
CREATE INDEX IF NOT EXISTS call_traces_created_at_idx ON call_traces(created_at DESC);
ALTER TABLE call_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON call_traces FOR ALL USING (true) WITH CHECK (true);
`);
