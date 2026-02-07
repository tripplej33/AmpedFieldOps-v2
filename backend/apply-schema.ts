import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
    console.log('Applying schema changes to clients table...\n');

    try {
        // Add new columns
        console.log('1. Adding name column...');
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS name VARCHAR(255)' });

        console.log('2. Adding contact_name column...');
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)' });

        console.log('3. Adding address column...');
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT' });

        console.log('4. Adding billing_address column...');
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address TEXT' });

        console.log('5. Making first_name nullable...');
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ALTER COLUMN first_name DROP NOT NULL' });

        console.log('6. Making last_name nullable...');
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ALTER COLUMN last_name DROP NOT NULL' });

        console.log('7. Making email nullable...');
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ALTER COLUMN email DROP NOT NULL' });

        console.log('\n✓ Migration complete!');
        console.log('\nNow testing with a simple query...');

        const { data, error } = await supabase.from('clients').select('id, name, xero_contact_id').limit(1);
        if (error) {
            console.error('Query test failed:', error);
        } else {
            console.log('✓ Query test passed. Schema is ready for Xero sync.');
        }

    } catch (err: any) {
        console.error('Migration error:', err.message);
    }
}

applyMigration();
