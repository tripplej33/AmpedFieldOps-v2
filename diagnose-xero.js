
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from backend
dotenv.config({ path: './backend/.env' });

// Import using tsx and relative paths (no extension or .js depending on tsconfig)
import { xeroClient } from './backend/src/config/xero.ts';
import { ensureXeroAuth } from './backend/src/services/xero/auth.ts';

async function diagnose() {
    try {
        console.log('--- Starting Xero Diagnostics ---');
        const { tenantId } = await ensureXeroAuth();
        console.log('Tenant ID:', tenantId);

        console.log('Attempting to fetch contacts with IsCustomer==true...');
        try {
            let response = await xeroClient.accountingApi.getContacts(
                tenantId,
                undefined,
                'IsCustomer==true'
            );
            console.log('Found with filter (IsCustomer==true):', response.body.contacts?.length || 0);

            if (response.body.contacts && response.body.contacts.length > 0) {
                console.log('First filtered contact name:', response.body.contacts[0].name);
            }
        } catch (e) {
            console.log('Filter IsCustomer==true failed:', e.message);
        }

        console.log('Attempting to fetch ALL contacts...');
        const allResponse = await xeroClient.accountingApi.getContacts(tenantId);
        const allContacts = allResponse.body.contacts || [];
        console.log('Total contacts found in Xero:', allContacts.length);

        if (allContacts.length > 0) {
            console.log('Sample contact (raw):', JSON.stringify(allContacts[0], null, 2));

            // Count how many would match "IsCustomer" flag in the object itself if returned
            const customers = allContacts.filter(c => c.isCustomer === true);
            console.log('Contacts with isCustomer=true in object:', customers.length);

            const supplier = allContacts.filter(c => c.isSupplier === true);
            console.log('Contacts with isSupplier=true in object:', supplier.length);
        } else {
            console.log('No contacts found at all in Xero for this tenant.');
        }

    } catch (err) {
        console.error('Diagnostic failed:', err.message);
        if (err.response) {
            console.error('Response data:', JSON.stringify(err.response.body, null, 2));
        }
    }
}

diagnose();
