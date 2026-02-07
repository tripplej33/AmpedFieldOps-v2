import dotenv from 'dotenv';
import { XeroClient } from 'xero-node';
import supabase from './src/config/supabase';
import { decrypt } from './src/lib/crypto';

dotenv.config({ path: './.env' });

async function testPull() {
    console.log('--- Starting Xero Contact Pull Test ---');

    // 1. Get credentials
    const settingsRow = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'xero_oauth_tokens')
        .maybeSingle();

    if (!settingsRow?.data?.value) {
        console.error('Xero tokens not found in app_settings');
        return;
    }

    const parsed = JSON.parse(settingsRow.data.value);
    const tokenData = {
        tenant_id: parsed.tenant_id,
        access_token: decrypt(parsed.access_token),
        refresh_token: parsed.refresh_token ? decrypt(parsed.refresh_token) : null,
    };

    const creds = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['xero_client_id', 'xero_client_secret', 'xero_redirect_uri']);

    const clientId = decrypt(creds.data.find(s => s.key === 'xero_client_id').value);
    const clientSecret = decrypt(creds.data.find(s => s.key === 'xero_client_secret').value);

    // 2. Setup Xero Client
    const xero = new XeroClient({
        clientId,
        clientSecret,
        redirectUris: ['http://localhost:3001/xero/callback'],
        scopes: ['accounting.contacts']
    });

    await xero.setTokenSet({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
    });

    console.log(`Using Tenant ID: ${tokenData.tenant_id}`);

    // 3. Try pulling without specific filter first
    try {
        console.log('Fetching ALL contacts (no filter)...');
        const allContacts = await xero.accountingApi.getContacts(tokenData.tenant_id);
        console.log(`Total contacts found: ${allContacts.body.contacts?.length || 0}`);

        console.log('Fetching CUSTOMER contacts (IsCustomer==true)...');
        const customers = await xero.accountingApi.getContacts(tokenData.tenant_id, undefined, 'IsCustomer==true');
        console.log(`Customer contacts found: ${customers.body.contacts?.length || 0}`);

        if (customers.body.contacts && customers.body.contacts.length > 0) {
            console.log('Sample contact name:', customers.body.contacts[0].name);
        }
    } catch (err) {
        console.error('Error during API call:', err.response?.body || err.message);
    }
}

testPull();
