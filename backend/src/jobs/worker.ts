import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { syncClientsToXero } from '../services/xero/contacts';
import { syncItemsToXero } from '../services/xero/items';
import { syncInvoices } from '../services/xero/invoices';
import { syncPayments } from '../services/xero/payments';
import { pullContactsFromXero, pullInvoicesFromXero } from '../services/xero/pull';
import { XeroJobName } from './queue';

export const xeroWorker = new Worker<XeroJobName>(
  'xero-sync',
  async (job) => {
    switch (job.name) {
      case 'sync-clients':
        return syncClientsToXero();
      case 'sync-items':
        return syncItemsToXero();
      case 'sync-invoices':
        return syncInvoices();
      case 'sync-payments':
        return syncPayments();
      case 'pull-clients':
        return pullContactsFromXero();
      case 'pull-invoices':
        return pullInvoicesFromXero();
      case 'sync-all':
        console.log('--- Starting Master Sync Job ---');
        await pullContactsFromXero();
        await syncItemsToXero();
        await pullInvoicesFromXero();
        return syncPayments();
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  {
    connection: redis as unknown as any
  }
);

xeroWorker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.name} completed`, result);
});

xeroWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.name} failed`, err);
});
