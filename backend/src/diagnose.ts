
import dotenv from 'dotenv';
dotenv.config();

import { xeroClient } from './config/xero';
import { ensureXeroAuth } from './services/xero/auth';

async function diagnose() {
    try {
        console.log('--- Starting Xero Diagnostics (Backend Context) ---');
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
        } catch (e: any) {
            console.log('Filter IsCustomer==true failed:', e.message);
        }

        console.log('Attempting to fetch ALL contacts...');
        const allResponse = await xeroClient.accountingApi.getContacts(tenantId);
        const allContacts = allResponse.body.contacts || [];
        console.log('Total contacts found in Xero:', allContacts.length);

        if (allContacts.length > 0) {
            console.log('Sample contact (raw):', {
                name: allContacts[0].name,
                contactID: allContacts[0].contactID,
                isCustomer: allContacts[0].isCustomer,
                isSupplier: allContacts[0].isSupplier,
                emailAddress: allContacts[0].emailAddress
            });

            const customers = allContacts.filter(c => c.isCustomer === true);
            console.log('Contacts with isCustomer=true in object:', customers.length);
        }

    } catch (err: any) {
        console.error('Diagnostic failed:', err.message);
        if (err.response) {
            console.error('Response data:', JSON.stringify(err.response.body, null, 2));
        }
    }
}

diagnose();
