import supabase from '../../config/supabase';
import { xeroClient } from '../../config/xero';
import { completeSync, failSync, startSync } from './log';
import { ensureXeroAuth } from './auth';

/**
 * Pull contacts (clients) from Xero and sync to local database
 */
export async function pullContactsFromXero(): Promise<{ created: number; updated: number; skipped: number; total: number }> {
  const logHandle = await startSync('pull-clients');
  try {
    const { tenantId } = await ensureXeroAuth();

    // Fetch contacts from Xero - get ALL contacts to be safe
    console.log('[pullContacts] Fetching all contacts from Xero...');
    const response = await xeroClient.accountingApi.getContacts(tenantId);
    const xeroContacts = response.body.contacts || [];
    console.log(`[pullContacts] Found ${xeroContacts.length} contacts in Xero`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Get the current user's ID from auth session or use a default org-wide user
    // For now, we'll use a default null (org-wide clients) or get from auth context if available
    const defaultUserId = null; // Org-wide clients accessible to all users

    for (const contact of xeroContacts) {
      try {
        // Check if client exists by xero_contact_id
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('xero_contact_id', contact.contactID)
          .maybeSingle();

        // Get phone number (prefer mobile, then default)
        const phone = contact.phones?.find((p: any) => p.phoneType === 'MOBILE')?.phoneNumber ||
          contact.phones?.find((p: any) => p.phoneType === 'DEFAULT')?.phoneNumber || null;

        // Get address
        const streetAddress = contact.addresses?.find((a: any) => a.addressType === 'STREET');
        const postalAddress = contact.addresses?.find((a: any) => a.addressType === 'POBOX');

        const address = streetAddress ?
          [streetAddress.addressLine1, streetAddress.city, streetAddress.region, streetAddress.postalCode]
            .filter(Boolean).join(', ') : null;

        const billingAddress = postalAddress ?
          [postalAddress.addressLine1, postalAddress.city, postalAddress.region, postalAddress.postalCode]
            .filter(Boolean).join(', ') : null;

        // Contact name from first/last or use company name
        const contactName = (contact.firstName && contact.lastName)
          ? `${contact.firstName} ${contact.lastName}`
          : null;

        if (existing) {
          // Update existing client
          const { error } = await supabase
            .from('clients')
            .update({
              name: contact.name,
              contact_name: contactName,
              email: contact.emailAddress,
              phone,
              address,
              billing_address: billingAddress,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (error) {
            console.error('Error updating client:', error);
            skipped++;
          } else {
            updated++;
          }
        } else {
          // Check if client exists by name (to avoid duplicates)
          const { data: existingByName } = await supabase
            .from('clients')
            .select('id')
            .ilike('name', contact.name || '')
            .maybeSingle();

          if (existingByName) {
            // Link existing client to Xero contact
            const { error } = await supabase
              .from('clients')
              .update({
                xero_contact_id: contact.contactID,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingByName.id);

            if (error) {
              console.error('Error linking client:', error);
              skipped++;
            } else {
              updated++;
            }
          } else {
            // Create new client from Xero contact
            console.log(`[pullContacts] Creating new client: ${contact.name} (${contact.contactID})`);
            const { error: insertError } = await supabase
              .from('clients')
              .insert({
                user_id: defaultUserId,
                name: contact.name,
                contact_name: contactName,
                email: contact.emailAddress || `noemail-${contact.contactID}@xero.placeholder`,
                phone,
                address,
                billing_address: billingAddress,
                xero_contact_id: contact.contactID,
                status: 'active'
              });

            if (insertError) {
              console.error(`[pullContacts] Error creating client ${contact.name}:`, insertError);
              skipped++;
            } else {
              created++;
            }
          }
        }
      } catch (err) {
        console.error('Error processing contact:', contact.contactID, err);
        skipped++;
      }
    }

    await completeSync(logHandle, created + updated);
    return { created, updated, skipped, total: xeroContacts.length };
  } catch (err: any) {
    await failSync(logHandle, err?.message || 'Unknown error pulling contacts');
    throw err;
  }
}

/**
 * Pull invoices from Xero and sync to local database
 */
export async function pullInvoicesFromXero(): Promise<{ created: number; updated: number; skipped: number; total: number }> {
  const logHandle = await startSync('pull-invoices'); // Corrected from pull-clients
  try {
    const { tenantId } = await ensureXeroAuth();

    // Fetch invoices from Xero
    const response = await xeroClient.accountingApi.getInvoices(tenantId);

    const xeroInvoices = response.body.invoices || [];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const invoice of xeroInvoices) {
      try {
        // Check if invoice exists by xero_invoice_id
        const { data: existing } = await supabase
          .from('xero_invoices')
          .select('id')
          .eq('xero_invoice_id', invoice.invoiceID)
          .maybeSingle();

        // Find matching client by xero_contact_id
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('xero_contact_id', invoice.contact?.contactID)
          .maybeSingle();

        if (!client) {
          console.warn(`No matching client for invoice ${invoice.invoiceNumber} (contact ${invoice.contact?.contactID})`);
          skipped++;
          continue;
        }

        const invoiceData = {
          client_id: client.id,
          xero_invoice_id: invoice.invoiceID,
          invoice_number: invoice.invoiceNumber || '',
          status: invoice.status ? String(invoice.status).toUpperCase() : 'DRAFT',
          payment_status: mapPaymentStatus(invoice.status, invoice.amountDue, invoice.dueDate),
          issue_date: invoice.date ? new Date(invoice.date).toISOString() : new Date().toISOString(),
          due_date: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
          subtotal: invoice.subTotal,
          tax: invoice.totalTax,
          total: invoice.total,
          amount_paid: invoice.amountPaid,
          amount_due: invoice.amountDue,
          currency: invoice.currencyCode || 'NZD',
          updated_at: new Date().toISOString()
        };

        if (existing) {
          // Update existing invoice
          const { error } = await supabase
            .from('xero_invoices')
            .update(invoiceData)
            .eq('id', existing.id);

          if (error) {
            console.error('Error updating invoice:', error);
            skipped++;
          } else {
            updated++;
          }
        } else {
          // Create new invoice
          const { error } = await supabase
            .from('xero_invoices')
            .insert(invoiceData);

          if (error) {
            console.error('Error creating invoice:', error);
            skipped++;
          } else {
            created++;
          }
        }
      } catch (err) {
        console.error('Error processing invoice:', invoice.invoiceID, err);
        skipped++;
      }
    }

    await completeSync(logHandle, created + updated);
    return { created, updated, skipped, total: xeroInvoices.length };
  } catch (err: any) {
    await failSync(logHandle, err?.message || 'Unknown error pulling invoices');
    throw err;
  }
}

/**
 * Map Xero invoice status to payment status
 */
function mapPaymentStatus(status: any, amountDue?: number, dueDate?: string): string {
  if (!status) return 'draft';

  const statusUpper = String(status).toUpperCase();

  if (statusUpper === 'DRAFT') return 'draft';
  if (statusUpper === 'SUBMITTED') return 'awaiting_approval';
  if (statusUpper === 'AUTHORISED') {
    // Check if overdue
    if (dueDate && new Date(dueDate) < new Date() && amountDue && amountDue > 0) {
      return 'overdue';
    }
    return 'awaiting_payment';
  }
  if (statusUpper === 'PAID') return 'paid';
  if (statusUpper === 'VOIDED' || statusUpper === 'DELETED') return 'void';

  return 'draft';
}
