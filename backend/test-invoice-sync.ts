
import dotenv from 'dotenv';
import path from 'path';
import { pullInvoicesFromXero } from './src/services/xero/pull';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testInvoiceSync() {
    console.log('🔄 Starting manual invoice sync test...');

    try {
        const result = await pullInvoicesFromXero();
        console.log('✅ Sync completed successfully!');
        console.log('Results:', result);
    } catch (error) {
        console.error('❌ Sync failed:', error);
    }
}

testInvoiceSync();
