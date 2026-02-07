import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
    try {
        console.log('Running migration: align clients with Xero...');

        const migration = readFileSync('./supabase/migrations/20260207_align_clients_with_xero.sql', 'utf8');

        // Split by semicolon and run each statement
        const statements = migration
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        for (const statement of statements) {
            if (!statement) continue;
            console.log('Executing:', statement.substring(0, 80) + '...');
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error) {
                console.error('Error:', error);
            } else {
                console.log('✓ Success');
            }
        }

        console.log('\nMigration complete!');
    } catch (err: any) {
        console.error('Migration failed:', err.message);
    }
}

runMigration();
