#!/usr/bin/env node
/**
 * Production-ready migration runner for Supabase
 * Uses service role client for admin operations
 * 
 * Usage: npm run migrate
 * Environment variables required:
 *  - VITE_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const SUPABASE_CA_CERT_PATH = process.env.SUPABASE_CA_CERT_PATH || path.join(__dirname, 'supabase', 'ssl', 'prod-ca-2021.crt');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️ ${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}━━━${colors.reset} ${msg}\n`),
};

const migrations = [
  '20260121_create_users_table.sql',
  '20260121_fix_users_rls.sql',
  '20260121_create_clients_table.sql',
  '20260121_create_projects_table.sql',
  '20260122_fix_users_rls_circular_dependency.sql',
  '20260123_create_timesheets_tables.sql',
  '20260123_phase5_operations.sql',
];

async function runMigrations() {
  try {
    // Validate credentials
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      log.error('Missing environment variables:');
      console.log('  VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
      console.log('  SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
      process.exit(1);
    }

    log.header('🚀 Supabase Migration Runner');

    // Initialize admin client (for RPC) and PG client (direct SQL)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let pgClient = null;
    if (SUPABASE_DB_URL) {
      let sslConfig = { rejectUnauthorized: false };
      if (SUPABASE_CA_CERT_PATH && fs.existsSync(SUPABASE_CA_CERT_PATH)) {
        sslConfig = {
          ca: fs.readFileSync(SUPABASE_CA_CERT_PATH, 'utf8'),
          rejectUnauthorized: true,
        };
        log.info(`Using CA cert at ${SUPABASE_CA_CERT_PATH}`);
      }

      pgClient = new PgClient({ connectionString: SUPABASE_DB_URL, ssl: sslConfig });
      await pgClient.connect();
      log.info('Postgres client connected');
    } else {
      log.warn('SUPABASE_DB_URL not set; will attempt RPC/REST only');
    }

    let successCount = 0;
    let failureCount = 0;

    for (const migration of migrations) {
      const filePath = path.join(__dirname, 'supabase', 'migrations', migration);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        log.warn(`${migration} - File not found, skipping`);
        continue;
      }

      // Read migration SQL
      const sql = fs.readFileSync(filePath, 'utf8');

      log.info(`Executing ${migration}...`);

      try {
        // Execute migration using RPC
        const { error } = await supabase.rpc('exec_sql', { query: sql });

        if (!error) {
          log.success(`${migration}`);
          successCount++;
          continue;
        }

        log.warn(`${migration} - RPC failed (${error.message}), trying direct REST...`);

        // Try direct execution via REST
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ query: sql }),
        });

        if (response.ok) {
          log.success(`${migration}`);
          successCount++;
          continue;
        }

        const data = await response.text();
        log.warn(`${migration} - REST failed (${response.status}: ${data.slice(0, 120)})`);

        // Fallback: direct Postgres connection
        if (pgClient) {
          try {
            await pgClient.query(sql);
            log.success(`${migration} (direct PG)`);
            successCount++;
            continue;
          } catch (pgErr) {
            log.error(`${migration} - PG error: ${pgErr.message}`);
            failureCount++;
          }
        } else {
          log.error(`${migration} - No PG client available and RPC/REST failed`);
          failureCount++;
        }
      } catch (fallbackErr) {
        log.error(`${migration} - ${fallbackErr.message}`);
        failureCount++;
      }

      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Summary
    log.header('📊 Migration Summary');
    console.log(`Successful: ${colors.green}${successCount}${colors.reset}`);
    console.log(`Failed: ${colors.red}${failureCount}${colors.reset}`);
    console.log(`Total: ${migrations.length}`);

    if (pgClient) await pgClient.end();

    if (failureCount === 0) {
      log.success('All migrations completed successfully!');
      process.exit(0);
    } else {
      log.warn(`${failureCount} migration(s) failed. Please review and retry.`);
      process.exit(1);
    }
  } catch (err) {
    log.error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

runMigrations();
