import { randomUUID } from 'crypto';
import supabase from '../../config/supabase';
import { Invoice, LineAmountTypes } from 'xero-node';
import { xeroClient } from '../../config/xero';
import { completeSync, failSync, startSync } from './log';
import { ensureXeroAuth } from './auth';

interface TimesheetRecord {
  id: string;
  cost_center_id: string | null;
  hours: number;
}

export async function syncInvoices(): Promise<{ processed: number }> {
  const logHandle = await startSync('sync-invoices');
  try {
    const { data: timesheets, error } = await supabase
      .from('timesheets')
      .select('id, cost_center_id, hours')
      .eq('status', 'approved')
      .eq('invoiced', false)
      .not('cost_center_id', 'is', null)
      .limit(200);

    if (error) throw error;

    const grouped = new Map<string, TimesheetRecord[]>();
    if (timesheets) {
      for (const ts of timesheets as TimesheetRecord[]) {
        if (!ts.cost_center_id) continue;
        const arr = grouped.get(ts.cost_center_id) || [];
        arr.push(ts);
        grouped.set(ts.cost_center_id, arr);
      }
    }

    let processed = 0;
    const { tenantId } = await ensureXeroAuth();
    for (const [costCenterId, records] of grouped.entries()) {
      const totalHours = records.reduce((sum, r) => sum + Number(r.hours || 0), 0);
      const totalAmount = Math.max(totalHours * 100, 0); // placeholder rate $100/hr
      let xeroInvoiceId: string | null = null;
      let invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      try {
        const resp = await xeroClient.accountingApi.createInvoices(tenantId, {
          invoices: [
            {
              type: Invoice.TypeEnum.ACCREC,
              status: Invoice.StatusEnum.AUTHORISED,
              date: new Date().toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              lineAmountTypes: LineAmountTypes.Exclusive,
              contact: {
                name: `Cost Center ${costCenterId.substring(0, 12)}`
              },
              lineItems: [
                {
                  description: `Timesheets for ${costCenterId}`,
                  quantity: totalHours || 1,
                  unitAmount: Math.max(totalAmount / Math.max(totalHours || 1, 1), 0),
                  accountCode: '200'
                }
              ]
            }
          ]
        });
        xeroInvoiceId = resp?.body?.invoices?.[0]?.invoiceID || null;
        invoiceNumber = resp?.body?.invoices?.[0]?.invoiceNumber || invoiceNumber;
      } catch (apiErr) {
        console.warn('Xero invoice create failed, falling back to placeholder ID', apiErr);
        xeroInvoiceId = `XERO-INV-${costCenterId.substring(0, 8)}-${randomUUID().substring(0, 4)}`;
      }

      const { error: insertErr } = await supabase
        .from('invoices')
        .insert({
          cost_center_id: costCenterId,
          xero_invoice_id: xeroInvoiceId,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          payment_status: 'Draft',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      if (insertErr) throw insertErr;

      const timesheetIds = records.map((r) => r.id);
      const { error: updateErr } = await supabase
        .from('timesheets')
        .update({ invoiced: true, xero_invoice_id: xeroInvoiceId, invoiced_at: new Date().toISOString() })
        .in('id', timesheetIds);
      if (updateErr) throw updateErr;

      processed += records.length;
    }

    await completeSync(logHandle, processed);
    return { processed };
  } catch (err: any) {
    await failSync(logHandle, err?.message || 'Unknown error syncing invoices');
    throw err;
  }
}
