import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(url, key);

async function checkTable(table: string) {
  // Try a lightweight select to verify the table and its columns are in the schema cache
  const { data, error } = await client.from(table).select('*').limit(0);
  if (error) {
    console.log(`❌ Table '${table}' missing or schema cache error: ${error.message}`);
    return false;
  }
  console.log(`✅ Table '${table}' exists`);
  return true;
}

async function main() {
  console.log('Checking Supabase tables...\n');
  const tables = ['patients', 'sessions', 'appointments', 'campaign_logs'];
  const results = await Promise.all(tables.map(checkTable));
  
  if (results.every(Boolean)) {
    console.log('\n✅ All tables exist. Supabase is ready!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tables are missing.');
    console.log('Please run supabase-schema.sql in your Supabase SQL Editor:');
    console.log('1. Go to https://app.supabase.com/project/_/sql');
    console.log('2. Paste the contents of supabase-schema.sql');
    console.log('3. Click "Run"');
    process.exit(1);
  }
}

main();
