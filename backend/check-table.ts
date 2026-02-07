
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
    console.log('Checking for xero_invoices table...');

    // Try to select from the table
    const { data: _data, error } = await supabase
        .from('xero_invoices')
        .select('id')
        .limit(1);

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.log('❌ xero_invoices table does NOT exist yet.');
            console.log('Please run the migration SQL in Supabase Dashboard.');
        } else {
            console.error('❌ Error checking table:', error.message);
        }
    } else {
        console.log('✅ xero_invoices table exists!');
    }
}

checkTable();
