import { Request, Response, Router } from 'express';
import supabase from '../config/supabase';
import { ensureXeroAuth } from '../services/xero/auth';
import { xeroClient } from '../config/xero';

const router = Router();

// POST /clients - Create client and push to Xero
router.post('/', async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, ...rest } = req.body;
    // 1. Create client locally (without xero_contact_id)
    const { data: inserted, error: insertErr } = await supabase
      .from('clients')
      .insert({ first_name, last_name, email, ...rest })
      .select()
      .maybeSingle();
    if (insertErr || !inserted) {
      return res.status(500).json({ error: 'Failed to create client', details: insertErr?.message });
    }
    // 2. Push to Xero
    let contactId: string | null = null;
    try {
      const { tenantId } = await ensureXeroAuth();
      const resp = await (xeroClient.accountingApi as any).createContacts(tenantId, {
        contacts: [
          {
            name: `${first_name || ''} ${last_name || ''}`.trim() || email || 'Unnamed Contact',
            emailAddress: email || undefined
          }
        ]
      });
      contactId = resp?.body?.contacts?.[0]?.contactID || null;
    } catch (apiErr) {
      contactId = null;
    }
    // 3. Update local client with xero_contact_id if available
    if (contactId) {
      await supabase
        .from('clients')
        .update({ xero_contact_id: contactId, xero_synced_at: new Date().toISOString() })
        .eq('id', inserted.id);
    }
    return res.status(201).json({ ...inserted, xero_contact_id: contactId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

export default router;
