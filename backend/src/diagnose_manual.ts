import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { XeroClient } from 'xero-node';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    try {
        console.log('--- Starting Manual Xero Diagnostics ---');

        const { data: settings } = await supabase
            .from('app_settings')
            .select('*')
            .in('key', ['xero_oauth_tokens', 'xero_tenant_id', 'xero_client_id', 'xero_client_secret']);

        if (!settings) throw new Error('Failed to fetch settings');

        const tokensRaw = settings.find(s => s.key === 'xero_oauth_tokens')?.value;
        const tenantId = settings.find(s => s.key === 'xero_tenant_id')?.value;
        const clientIdRaw = settings.find(s => s.key === 'xero_client_id')?.value;
        const clientSecretRaw = settings.find(s => s.key === 'xero_client_secret')?.value;

        if (!clientIdRaw || !clientSecretRaw) {
            console.error('Missing Xero client ID or secret in DB');
            return;
        }

        console.log('Client ID found. Tenant ID found:', !!tenantId);
        console.log('Tokens found:', !!tokensRaw);

        if (!tokensRaw) {
            console.log('No tokens to test.');
            return;
        }

        // Try to initialize Xero Client
        const xero = new XeroClient({
            clientId: clientIdRaw,
            clientSecret: clientSecretRaw,
            grantType: 'client_credentials'
        });

        const tokenSet = JSON.parse(tokensRaw);
        xero.setTokenSet(tokenSet);

        console.log('Access token expires at:', new Date((tokenSet.expires_at || 0) * 1000).toISOString());

        try {
            console.log('\nTesting API access (getContacts)...');
            if (!tenantId) throw new Error('No tenant ID');

            const contacts = await xero.accountingApi.getContacts(tenantId);
            console.log('Contacts found:', contacts.body.contacts?.length);
        } catch (err: any) {
            console.error('API call failed');
            if (err?.response) {
                console.error('Status:', err.response.status);
                // console.error('Data:', JSON.stringify(err.response.data, null, 2));
            }
            console.error('Error:', err?.message || err);
        }

    } catch (err: any) {
        console.error('Diagnostic error:', err?.message || err);
    }
}

diagnose();
