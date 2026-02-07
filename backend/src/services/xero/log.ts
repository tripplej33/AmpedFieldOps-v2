import supabase from '../../config/supabase';

export type SyncType = 'sync-clients' | 'sync-items' | 'sync-invoices' | 'sync-payments' | 'pull-contacts' | 'pull-clients' | 'pull-invoices';

export interface SyncLogHandle {
  id: string;
  syncType: SyncType;
}

export async function startSync(syncType: SyncType): Promise<SyncLogHandle> {
  const { data, error } = await supabase
    .from('xero_sync_log')
    .insert({ sync_type: syncType, status: 'pending', records_processed: 0 })
    .select('id')
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create sync log');
  }

  return { id: data.id, syncType };
}

export async function completeSync(handle: SyncLogHandle, recordsProcessed: number): Promise<void> {
  await supabase
    .from('xero_sync_log')
    .update({ status: 'success', records_processed: recordsProcessed, completed_at: new Date().toISOString() })
    .eq('id', handle.id);
}

export async function failSync(handle: SyncLogHandle, message: string): Promise<void> {
  await supabase
    .from('xero_sync_log')
    .update({ status: 'error', error_message: message, completed_at: new Date().toISOString() })
    .eq('id', handle.id);
}
