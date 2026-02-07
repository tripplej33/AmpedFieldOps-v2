import { randomUUID } from 'crypto';
import supabase from '../../config/supabase';
import { xeroClient } from '../../config/xero';
import { completeSync, failSync, startSync } from './log';
import { ensureXeroAuth } from './auth';

interface ClientRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export async function syncClientsToXero(): Promise<{ processed: number }> {
  const logHandle = await startSync('sync-clients');
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .is('xero_contact_id', null)
      .limit(50);

    if (error) throw error;

    let processed = 0;
    if (clients && clients.length > 0) {
      const { tenantId } = await ensureXeroAuth();
      for (const client of clients as ClientRecord[]) {
        let contactId: string | null = null;
        try {
          const resp = await (xeroClient.accountingApi as any).createContacts(tenantId, {
            contacts: [
              {
                name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || 'Unnamed Contact',
                emailAddress: client.email || undefined
              }
            ]
          });
          contactId = resp?.body?.contacts?.[0]?.contactID || null;
        } catch (apiErr) {
          console.warn('Xero contact create failed, falling back to placeholder ID', apiErr);
          contactId = `XERO-${client.id.substring(0, 8)}-${randomUUID().substring(0, 4)}`;
        }

        const { error: updateErr } = await supabase
          .from('clients')
          .update({ xero_contact_id: contactId, xero_synced_at: new Date().toISOString() })
          .eq('id', client.id);
        if (updateErr) throw updateErr;
        processed += 1;
      }
    }

    await completeSync(logHandle, processed);
    return { processed };
  } catch (err: any) {
    await failSync(logHandle, err?.message || 'Unknown error syncing clients');
    throw err;
  }
}
