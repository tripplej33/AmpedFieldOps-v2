#!/usr/bin/env node
/**
 * Supabase Connection Diagnostic Script
 * Tests connectivity, credentials, and database state
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️ ${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${colors.reset} ${msg}`),
};

async function testConnection() {
  log.info('Testing Supabase Connection...\n');

  // Check credentials
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    log.error('Missing environment variables');
    console.log('  VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.log('  VITE_SUPABASE_ANON_KEY:', ANON_KEY ? '✓' : '✗');
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
    return false;
  }

  log.success('Environment variables loaded');

  // Test anon client
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // Test tables exist
    console.log('\n📊 Checking Database Tables:\n');
    
    const tables = [
      'users',
      'clients',
      'projects',
      'activity_types',
      'activity_log',
      'xero_sync_log',
      'timesheets',
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await anonClient
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          if (error.code === 'PGRST116') {
            log.warn(`${table} - Table not found (needs migration)`);
          } else {
            log.error(`${table} - ${error.message}`);
          }
        } else {
          log.success(`${table} - Accessible`);
        }
      } catch (err) {
        log.error(`${table} - ${err.message}`);
      }
    }

    // Test service role capabilities
    console.log('\n🔐 Checking Service Role Permissions:\n');
    
    try {
      const { data, error } = await serviceClient
        .from('users')
        .select('count(*)', { count: 'exact', head: true });
      
      if (!error) {
        log.success('Service role can access users table');
      } else {
        log.warn('Service role access issue: ' + error.message);
      }
    } catch (err) {
      log.error('Service role error: ' + err.message);
    }

    log.success('\n✨ Diagnostic complete!');
    return true;

  } catch (err) {
    log.error('Connection test failed: ' + err.message);
    return false;
  }
}

testConnection();
