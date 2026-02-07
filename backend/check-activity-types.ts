
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

async function checkActivityTypes() {
    console.log('Checking activity_types schema...');

    const { data: _data, error } = await supabase
        .from('activity_types')
        .select('xero_item_id')
        .limit(1);

    if (error) {
        console.error('❌ Error or column missing:', error.message);
    } else {
        console.log('✅ xero_item_id column exists in activity_types!');
    }
}

checkActivityTypes();
