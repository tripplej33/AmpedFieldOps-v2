import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSchema() {
    console.log('Testing current clients table schema...\n');

    try {
        // Try to select with new columns
        const { data, error } = await supabase
            .from('clients')
            .select('id, name, contact_name, address, billing_address, xero_contact_id, first_name, last_name, company, email')
            .limit(1);

        if (error) {
            console.error('❌ Schema test failed:', error.message);
            console.log('\n📋 You need to manually apply the migration:');
            console.log('   File: /root/AmpedFieldOps-v2/supabase/migrations/20260207_align_clients_with_xero.sql');
            console.log('\n   Options:');
            console.log('   1. Run it in Supabase SQL Editor (dashboard)');
            console.log('   2. Or use: supabase db push (if linked to project)');
            return false;
        }

        console.log('✓ Schema looks good!');
        console.log('Columns available:', Object.keys(data?.[0] || {}).join(', '));
        return true;

    } catch (err: any) {
        console.error('Test error:', err.message);
        return false;
    }
}

testSchema();
