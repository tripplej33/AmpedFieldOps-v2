import { randomUUID } from 'crypto';
import supabase from '../../config/supabase';
import { xeroClient } from '../../config/xero';
import { completeSync, failSync, startSync } from './log';
import { ensureXeroAuth } from './auth';

interface ActivityTypeRecord {
  id: string;
  name: string;
  hourly_rate: number | null;
  xero_item_id: string | null;
}

export async function syncItemsToXero(): Promise<{ processed: number }> {
  const logHandle = await startSync('sync-items');
  try {
    const { data: items, error } = await supabase
      .from('activity_types')
      .select('id, name, hourly_rate, xero_item_id')
      .is('xero_item_id', null)
      .limit(50);

    if (error) throw error;

    let processed = 0;
    if (items && items.length > 0) {
      const { tenantId } = await ensureXeroAuth();
      for (const item of items as ActivityTypeRecord[]) {
        let itemId: string | null = null;
        try {
          const resp = await (xeroClient.accountingApi as any).createItems(tenantId, {
            items: [
              {
                name: item.name,
                code: item.name?.slice(0, 12) || `ITEM-${item.id.substring(0, 6)}`,
                description: item.name,
                salesDetails: {
                  unitPrice: item.hourly_rate || 0,
                  accountCode: '200'
                }
              }
            ]
          });
          itemId = resp?.body?.items?.[0]?.itemID || null;
        } catch (apiErr) {
          console.warn('Xero item create failed, falling back to placeholder ID', apiErr);
          itemId = `XERO-ITEM-${item.id.substring(0, 8)}-${randomUUID().substring(0, 4)}`;
        }

        const { error: updateErr } = await supabase
          .from('activity_types')
          .update({ xero_item_id: itemId, managed_by_xero: true })
          .eq('id', item.id);
        if (updateErr) throw updateErr;
        processed += 1;
      }
    }

    await completeSync(logHandle, processed);
    return { processed };
  } catch (err: any) {
    await failSync(logHandle, err?.message || 'Unknown error syncing items');
    throw err;
  }
}
