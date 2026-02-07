import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyNewMigration() {
    console.log('Applying ONLY the new migration SQL directly...\n');

    const sql = readFileSync('../supabase/migrations/20260207_align_clients_with_xero.sql', 'utf8');

    console.log('SQL to execute:');
    console.log(sql);
    console.log('\n---\n');

    // Since we can't use RPC, let's just try to insert test data to see if columns exist
    console.log('Testing if we can insert with new schema...');

    const testData = {
        user_id: null,
        name: 'Test Xero Contact',
        contact_name: 'John Doe',
        email: 'test@xero.placeholder',
        address: '123 Test St, City, State',
        billing_address: '456 Billing Ave',
        xero_contact_id: 'test-' + Date.now(),
        status: 'active'
    };

    const { data, error } = await supabase
        .from('clients')
        .insert(testData)
        .select();

    if (error) {
        console.error('❌ Insert failed:', error.message);
        console.log('\n📋 Please run this SQL in Supabase Dashboard → SQL Editor:');
        console.log('---');
        console.log(sql);
        console.log('---');
    } else {
        console.log('✅ Insert successful! Schema is ready.');
        console.log('Created test record:', data);

        // Clean up test record
        await supabase.from('clients').delete().eq('xero_contact_id', testData.xero_contact_id);
        console.log('✓ Test record cleaned up');
    }
}

applyNewMigration();
