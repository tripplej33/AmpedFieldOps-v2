import { Router, Request, Response } from 'express';
import { enqueueXeroJob } from '../jobs/queue';
import supabase from '../config/supabase';

const router = Router();

// Admin endpoints will require authentication middleware
// For now, these are placeholders

// POST /admin/xero/sync-clients - Trigger client sync (push to Xero)
router.post('/xero/sync-clients', async (_req: Request, res: Response) => {
  const job = await enqueueXeroJob('sync-clients');
  return res.json({ message: 'Client sync queued', jobId: job.id, status: 'queued' });
});

// POST /admin/xero/sync-pull-clients - Pull clients from Xero
router.post('/xero/sync-pull-clients', async (_req: Request, res: Response) => {
  const job = await enqueueXeroJob('pull-clients');
  return res.json({ message: 'Client pull queued', jobId: job.id, status: 'queued' });
});

// POST /admin/xero/sync-pull-invoices - Pull invoices from Xero
router.post('/xero/sync-pull-invoices', async (_req: Request, res: Response) => {
  const job = await enqueueXeroJob('pull-invoices');
  return res.json({ message: 'Invoice pull queued', jobId: job.id, status: 'queued' });
});

// POST /admin/xero/sync-items - Trigger product/item sync
router.post('/xero/sync-items', async (_req: Request, res: Response) => {
  const job = await enqueueXeroJob('sync-items');
  return res.json({ message: 'Item sync queued', jobId: job.id, status: 'queued' });
});

// POST /admin/xero/sync-payments - Trigger payment status sync
router.post('/xero/sync-payments', async (_req: Request, res: Response) => {
  const job = await enqueueXeroJob('sync-payments');
  return res.json({ message: 'Payment sync queued', jobId: job.id, status: 'queued' });
});

// POST /admin/xero/sync-all - Trigger all sync jobs sequentially
router.post('/xero/sync-all', async (_req: Request, res: Response) => {
  const job = await enqueueXeroJob('sync-all');
  return res.json({ message: 'Master sync queued', jobId: job.id, status: 'queued' });
});

// POST /admin/invoices/create - Create invoice from timesheets
router.post('/invoices/create', async (_req: Request, res: Response) => {
  const job = await enqueueXeroJob('sync-invoices');
  return res.json({ message: 'Invoice creation queued', jobId: job.id, status: 'queued' });
});

// GET /admin/xero/status - Get Xero connection status
router.get('/xero/status', async (_req: Request, res: Response) => {
  try {
    console.log('[XeroStatus] Fetching Xero status...')

    // Return early with defaults if tables don't exist or are inaccessible
    // This prevents hanging on missing tables
    let tokens = null;
    let credentialsSaved = false;
    let lastLog = null;

    try {
      console.log('[XeroStatus] Querying xero_tokens...')
      // First try the xero_oauth_tokens from app_settings (new approach)
      let result = await Promise.race([
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'xero_oauth_tokens')
          .maybeSingle(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]) as any;

      if (result && !result.error && result.data?.value) {
        try {
          const tokenData = JSON.parse(result.data.value);
          tokens = {
            tenant_id: tokenData.tenant_id,
            tenant_name: tokenData.tenant_name,
            expires_at: tokenData.expires_at,
            updated_at: new Date().toISOString()
          };
        } catch (e) {
          console.log('[XeroStatus] Failed to parse token data:', e);
        }
      }

      // Fallback: try old xero_tokens table
      if (!tokens) {
        result = await Promise.race([
          supabase
            .from('xero_tokens')
            .select('tenant_id, tenant_name, updated_at, expires_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 5000)
          )
        ]) as any;

        if (result && !result.error) {
          tokens = result.data;
        }
      }
    } catch (err) {
      console.log('[XeroStatus] xero_tokens query failed (table may not exist):', err instanceof Error ? err.message : 'unknown error');
    }

    try {
      console.log('[XeroStatus] Querying app_settings...')
      const result = await Promise.race([
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'xero_client_id')
          .maybeSingle(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]) as any;

      if (result && !result.error) {
        credentialsSaved = result.data?.value !== null && result.data?.value !== undefined;
      }
    } catch (err) {
      console.log('[XeroStatus] app_settings query failed (table may not exist):', err instanceof Error ? err.message : 'unknown error');
    }

    try {
      console.log('[XeroStatus] Querying xero_sync_log...')
      const result = await Promise.race([
        supabase
          .from('xero_sync_log')
          .select('sync_type, status, completed_at')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]) as any;

      if (result && !result.error) {
        lastLog = result.data;
      }
    } catch (err) {
      console.log('[XeroStatus] xero_sync_log query failed (table may not exist):', err instanceof Error ? err.message : 'unknown error');
    }

    console.log('[XeroStatus] Returning response', { connected: !!tokens, credentialsSaved })
    res.json({
      connected: Boolean(tokens),
      credentialsSaved,
      tenantId: tokens?.tenant_id || null,
      tenantName: tokens?.tenant_name || null,
      lastTokenUpdate: tokens?.updated_at || null,
      expiresAt: tokens?.expires_at || null,
      lastSync: lastLog || null
    });
  } catch (error) {
    console.error('[XeroStatus] Unexpected error:', error);
    res.status(500).json({
      error: 'Failed to fetch Xero status',
      connected: false,
      credentialsSaved: false,
      tenantId: null,
      tenantName: null,
      lastTokenUpdate: null,
      expiresAt: null,
      lastSync: null
    });
  }
});
// GET /admin/xero/sync-log - Get sync history
router.get('/xero/sync-log', async (_req: Request, res: Response) => {
  try {
    console.log('[XeroSyncLog] Fetching sync logs...')

    try {
      const result = await Promise.race([
        supabase
          .from('xero_sync_log')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(50),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]) as any;

      if (result?.error) {
        console.log('[XeroSyncLog] Query error (table may not exist):', result.error.message);
        return res.json({ logs: [] });
      }

      console.log('[XeroSyncLog] Sending response with', result?.data?.length || 0, 'logs');
      return res.json({ logs: result?.data || [] });
    } catch (err) {
      console.log('[XeroSyncLog] Query failed:', err instanceof Error ? err.message : 'unknown error');
      return res.json({ logs: [] });
    }
  } catch (error) {
    console.error('[XeroSyncLog] Unexpected error:', error);
    return res.json({ logs: [] });
  }
});

// GET /admin/xero/invoices - Get all invoices
router.get('/xero/invoices', async (req: Request, res: Response) => {
  try {
    console.log('[XeroInvoices] Fetching invoices...');

    const { status, client_id, date_from, date_to } = req.query;

    try {
      let query = supabase
        .from('xero_invoices')
        .select('*, clients(name)', { count: 'exact' })
        .is('deleted_at', null)
        .order('issue_date', { ascending: false });

      if (status) {
        query = query.eq('status', status as string);
      }

      if (client_id) {
        query = query.eq('client_id', client_id as string);
      }

      if (date_from) {
        query = query.gte('issue_date', date_from as string);
      }

      if (date_to) {
        query = query.lte('issue_date', date_to as string);
      }

      const result = await Promise.race([
        query,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]) as any;

      if (result?.error) {
        console.log('[XeroInvoices] Query error (table may not exist):', result.error.message);
        return res.json([]);
      }

      const invoices = (result?.data || []).map((invoice: any) => ({
        ...invoice,
        client_name: invoice.clients?.name || null
      }));

      console.log('[XeroInvoices] Returning', invoices.length, 'invoices');
      return res.json(invoices);
    } catch (err) {
      console.log('[XeroInvoices] Query failed:', err instanceof Error ? err.message : 'unknown error');
      return res.json([]);
    }
  } catch (error) {
    console.error('[XeroInvoices] Unexpected error:', error);
    return res.json([]);
  }
});

// GET /admin/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', async (_req: Request, res: Response) => {
  try {
    // Query job statistics
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('id, created_at, status, estimated_hours')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.warn('[DashboardStats] Error fetching jobs:', jobsError);
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const jobsToday = (jobsData || []).filter(job => {
      const createdAt = new Date(job.created_at);
      return createdAt >= today && createdAt < tomorrow;
    });

    // Calculate statistics
    const completedToday = jobsToday.filter(j => j.status === 'completed').length;
    const totalJobs = jobsData?.length || 0;
    const pendingApprovals = (jobsData || []).filter(j => j.status === 'pending_approval').length;

    // Revenue calculation (mock - would come from invoices/timesheets in real scenario)
    const revenueToday = completedToday * 150; // Mock: $150 per completed job

    // Trends (mock data - would need proper calculation from historical data)
    const completedTodayTrend = 3;
    const pendingApprovalsTrend = -2;
    const revenueTodayTrend = 520;

    return res.json({
      totalJobs,
      completedToday: Math.max(0, completedToday),
      pendingApprovals: Math.max(0, pendingApprovals),
      revenueToday,
      completedTodayTrend,
      pendingApprovalsTrend,
      revenueTodayTrend
    });
  } catch (error: any) {
    console.error('[DashboardStats] Unexpected error:', error);
    return res.json({
      totalJobs: 0,
      completedToday: 0,
      pendingApprovals: 0,
      revenueToday: 0,
      completedTodayTrend: 0,
      pendingApprovalsTrend: 0,
      revenueTodayTrend: 0
    });
  }
});

// GET /admin/dashboard/activity-feed - Get dashboard activity feed
router.get('/dashboard/activity-feed', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    // Fetch recent activity from activity_log
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ActivityFeed] Error fetching logs:', error);
      return res.json({ items: [] });
    }

    return res.json({ items: data || [] });
  } catch (error) {
    console.error('[ActivityFeed] Unexpected error:', error);
    return res.json({ items: [] });
  }
});

// GET /admin/clients - Get all clients (pulled from Xero or from clients table)
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    console.log('[AdminClients] Fetching clients...');

    // Try to fetch from clients table first (user-specific)
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!clientsError && clientsData && clientsData.length > 0) {
      console.log('[AdminClients] Found clients from clients table:', clientsData.length);
      return res.json(clientsData);
    }

    // Fallback: return empty array if no clients table or no data
    console.log('[AdminClients] No clients found or table missing');
    return res.json([]);
  } catch (error: any) {
    console.error('[AdminClients] Unexpected error:', error);
    return res.json([]);
  }
});

export default router;
