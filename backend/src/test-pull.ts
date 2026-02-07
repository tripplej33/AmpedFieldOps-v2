
import dotenv from 'dotenv';
dotenv.config();

import { pullContactsFromXero } from './services/xero/pull';
import supabase from './config/supabase';

async function testPull() {
    try {
        console.log('--- Starting Xero Pull Test ---');

        // Check initial count
        const { count: beforeCount } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true });

        console.log('Clients in DB before pull:', beforeCount);

        console.log('Triggering pullContactsFromXero()...');
        const result = await pullContactsFromXero();

        console.log('Pull Result:', result);

        // Check final count
        const { count: afterCount } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true });

        console.log('Clients in DB after pull:', afterCount);
        console.log('Net change:', (afterCount || 0) - (beforeCount || 0));

        if (result.created > 0 || result.updated > 0) {
            console.log('SUCCESS: Contacts were processed.');
        } else if (result.total > 0) {
            console.log('WARNING: Contacts found in Xero but none were created or updated. Check for duplicate logic or silent errors.');
        } else {
            console.log('No contacts found in Xero.');
        }

    } catch (err: any) {
        console.error('Test failed:', err.message);
    }
}

testPull();
