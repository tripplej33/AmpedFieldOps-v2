
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkClients() {
    const { data, error } = await supabase
        .from('clients')
        .select('name, xero_contact_id');

    if (error) {
        console.error('Error fetching clients:', error);
    } else {
        console.log('Current Clients:', data);
    }
}

checkClients();
