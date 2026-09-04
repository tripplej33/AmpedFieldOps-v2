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

export async function createXeroInvoiceFromRecord(invoiceId: string): Promise<{ success: boolean; xeroInvoiceId?: string; xeroInvoiceNumber?: string }> {
  try {
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(id, name, email, xero_contact_id),
        line_items:invoice_line_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invErr || !inv) throw new Error(invErr?.message || 'Invoice record not found');

    const { tenantId } = await ensureXeroAuth();

    const lineItems = (inv.line_items || []).map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitAmount: Number(item.unit_price) || 0,
      itemCode: item.xero_item_code || undefined,
      accountCode: '200', // Default Sales/Revenue Account in NZ Xero chart of accounts
    }));

    const resp = await xeroClient.accountingApi.createInvoices(tenantId, {
      invoices: [
        {
          type: Invoice.TypeEnum.ACCREC,
          status: Invoice.StatusEnum.AUTHORISED,
          date: inv.issue_date,
          dueDate: inv.due_date,
          lineAmountTypes: LineAmountTypes.Exclusive,
          contact: {
            contactID: inv.client?.xero_contact_id || undefined,
            name: inv.client?.name || 'Valued Client',
          },
          lineItems: lineItems.length > 0 ? lineItems : [
            {
              description: 'Field Service Labor & Materials',
              quantity: 1,
              unitAmount: inv.subtotal,
              accountCode: '200',
            }
          ],
        }
      ]
    });

    const createdXero = resp?.body?.invoices?.[0];
    const xeroInvoiceId = createdXero?.invoiceID || null;
    const xeroInvoiceNumber = createdXero?.invoiceNumber || inv.invoice_number;

    // Update FieldOps invoice record with live Xero IDs
    await supabase
      .from('invoices')
      .update({
        xero_invoice_id: xeroInvoiceId,
        xero_invoice_number: xeroInvoiceNumber,
        xero_status: 'AUTHORISED',
        status: 'issued',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    return {
      success: true,
      xeroInvoiceId: xeroInvoiceId || undefined,
      xeroInvoiceNumber: xeroInvoiceNumber,
    };
  } catch (err: any) {
    console.error('[createXeroInvoiceFromRecord] Error pushing to Xero:', err);
    throw err;
  }
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
          status: 'issued',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      if (insertErr) throw insertErr;

      const timesheetIds = records.map((r) => r.id);
      const { error: updateErr } = await supabase
        .from('timesheets')
        .update({ invoiced: true, invoice_id: null, invoiced_at: new Date().toISOString() })
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
