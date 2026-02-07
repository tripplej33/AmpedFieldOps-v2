import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

async function applyMigration() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  // Extract project reference from URL
  const match = supabaseUrl.match(/https:\/\/([a-z]+)/);
  const projectRef = match ? match[1] : null;
  
  if (!projectRef) {
    console.error('Could not extract project ref from:', supabaseUrl);
    return;
  }
  
  console.log('Project ref:', projectRef);
  
  // Try the direct connection URL format
  const connectionString = `postgresql://postgres:${serviceKey}@db.${projectRef}.supabase.co:5432/postgres`;
  
  console.log('Attempting connection...');
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    
    const sql = readFileSync('../supabase/migrations/20260207_align_clients_with_xero.sql', 'utf8');
    
    console.log('Executing migration...');
    await client.query(sql);
    
    console.log('✅ Migration applied successfully!\n');
    
    // Verify
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('name', 'contact_name', 'address', 'billing_address')
    `);
    
    console.log(`✓ Verified ${result.rows.length}/4 new columns exist`);
    result.rows.forEach(row => console.log(`  - ${row.column_name}`));
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.log('\nTrying alternative: Please run this in Supabase Dashboard SQL Editor:');
    console.log('---');
    console.log(readFileSync('../supabase/migrations/20260207_align_clients_with_xero.sql', 'utf8'));
    console.log('---');
  } finally {
    await client.end();
  }
}

applyMigration();
