import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config();

const client = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const migrations = [
  '20260123_create_activity_types_table.sql',
  '20260123_create_activity_log_table.sql',
  '20260123_create_xero_sync_log_table.sql'
];

async function runMigrations() {
  for (const migration of migrations) {
    console.log(`\n🔧 Running: ${migration}`);
    const sql = fs.readFileSync(`supabase/migrations/${migration}`, 'utf8');
    const { error } = await client.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.error(`❌ Error: ${error.message || JSON.stringify(error)}`);
      process.exit(1);
    } else {
      console.log('✅ Completed');
    }
  }
  console.log('\n🎉 All Phase 5 migrations completed successfully!');
}

runMigrations();
