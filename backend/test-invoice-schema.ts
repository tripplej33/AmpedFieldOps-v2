
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

async function testInsertInvoice() {
    console.log('🔄 Testing invoice insertion...');

    // Get a client ID first
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .limit(1)
        .single();

    if (!client) {
        console.error('❌ No clients found to link invoice to.');
        return;
    }

    const dummyInvoice = {
        client_id: client.id,
        xero_invoice_id: 'test-invoice-id-' + Date.now(),
        invoice_number: 'INV-TEST-001',
        status: 'DRAFT',
        payment_status: 'draft',
        issue_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        subtotal: 100.00,
        tax: 15.00,
        total: 115.00,
        amount_paid: 0.00,
        amount_due: 115.00,
        currency: 'NZD'
    };

    const { data, error } = await supabase
        .from('xero_invoices')
        .insert(dummyInvoice)
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', error);
    } else {
        console.log('✅ Insert successful!', data);

        // Cleanup
        await supabase.from('xero_invoices').delete().eq('id', data.id);
        console.log('✅ Changes cleaned up (deleted test invoice)');
    }
}

testInsertInvoice();
