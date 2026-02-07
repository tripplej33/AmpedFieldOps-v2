import { Queue } from 'bullmq';
import { redis } from '../config/redis';

export type XeroJobName = 'sync-clients' | 'sync-items' | 'sync-invoices' | 'sync-payments' | 'pull-clients' | 'pull-invoices' | 'sync-all';

export const xeroQueue = new Queue<any, any, XeroJobName>('xero-sync', {
  connection: redis as unknown as any
});

export async function enqueueXeroJob(name: XeroJobName, data: Record<string, any> = {}) {
  return xeroQueue.add(name, data, { removeOnComplete: true, removeOnFail: true });
}
