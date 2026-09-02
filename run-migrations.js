#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use environment variables instead of hardcoded credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('   Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

async function executeSql(sql, filename) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    const data = await response.text();

    if (response.ok) {
      console.log(`✅ ${filename} - Success`);
      return data;
    } else {
      console.error(`❌ ${filename} - Failed (${response.status}): ${data}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ ${filename} - Error: ${error.message}`);
    return null;
  }
}

async function runMigrations() {
  console.log('🚀 Running Supabase Migrations...\n');

  for (const migration of migrations) {
    const filePath = path.join(__dirname, 'supabase', 'migrations', migration);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${migration} - File not found, skipping`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`📝 Executing ${migration}...`);
    
    await executeSql(sql, migration);
    
    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✨ Migration run complete!');
}

runMigrations().catch(console.error);
