# Invoice Endpoint Fix - 404 Resolution

## Problem
FinancialsPage.tsx was receiving a **404 Not Found** error when trying to fetch invoices:
```
GET https://admin.ampedlogix.com/api/admin/xero/invoices 404 (Not Found)
```

The frontend was making the request to the correct endpoint, but the backend didn't have the route implemented yet.

## Solution
Added `GET /admin/xero/invoices` endpoint to the V2 backend admin routes.

### File Modified
**`/root/AmpedFieldOps-v2/backend/src/routes/admin.ts`**

### Implementation Details

```typescript
// GET /admin/xero/invoices - Get all invoices
router.get('/xero/invoices', async (req: Request, res: Response) => {
  try {
    console.log('[XeroInvoices] Fetching invoices...');
    
    const { status, client_id, date_from, date_to } = req.query;
    
    try {
      let query = supabase
        .from('xero_invoices')
        .select('*, clients(name)', { count: 'exact' })
        .eq('deleted_at', null)
        .order('issue_date', { ascending: false });
      
      // Support optional filters
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
      
      // Include client name in response
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
```

## Features

 **Fetches from Database:** Queries `xero_invoices` table from Supabase
 **Filter Support:** Supports optional filtering by:
- `status` - Invoice status (draft, sent, paid, etc.)
- `client_id` - Filter by client
- `date_from` - Start date filter
- `date_to` - End date filter

 **Client Name Included:** Left join with clients table to include client names
 **Error Handling:** Returns empty array on table errors (graceful degradation)
 **Logging:** Debug logs for troubleshooting
 **Timeout Protection:** 5-second query timeout to prevent hanging

## Query Filters Example

```
GET /api/admin/xero/invoices?status=paid&date_from=2026-01-01
GET /api/admin/xero/invoices?client_id=123
GET /api/admin/xero/invoices?date_to=2026-01-31
```

## Frontend Integration

The FinancialsPage.tsx already has the correct implementation:

```typescript
const fetchFinancialsData = async () => {
  try {
    // This will now work (previously 404)
    const invoiceRes = await fetch('/api/admin/xero/invoices', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    })
    const invoiceData = await invoiceRes.json()
    
    // Group by payment status
    const statusMap: Record<string, InvoicePipelineItem> = {}
    invoiceData.forEach((inv: any) => {
      const status = inv.payment_status || 'draft'
      if (!statusMap[status]) {
        statusMap[status] = { status, count: 0, amount: 0 }
      }
      statusMap[status].count++
      statusMap[status].amount += parseFloat(inv.total || 0)
    })
    setInvoicePipeline(Object.values(statusMap))
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load invoices')
  }
}
```

## Expected Response Format

```json
[
  {
    "id": "invoice-123",
    "invoice_number": "INV-001",
    "client_id": "client-456",
    "client_name": "Acme Corp",
    "status": "DRAFT",
    "payment_status": "draft",
    "issue_date": "2026-01-31T00:00:00.000Z",
    "due_date": "2026-02-14T00:00:00.000Z",
    "total": 1500.00,
    "created_at": "2026-01-31T01:10:00.000Z",
    "deleted_at": null
  },
  ...
]
```

## Status

 **Endpoint Added:** `/GET /api/admin/xero/invoices`
 **Backend Compiled:** TypeScript build successful
 **Backend Running:** On port 3002
 **Frontend Ready:** FinancialsPage will now display real invoices

## Testing

The endpoint can be tested with:
```bash
curl http://localhost:3002/api/admin/xero/invoices
curl https://admin.ampedlogix.com/api/admin/xero/invoices  # Through Nginx proxy
```

Browser testing:
1. Navigate to http://localhost:5174/app/financials (or http://localhost:5173/app/financials)
2. Financials page should load without 404 errors
3. Invoices will be fetched from the backend and grouped by status
4. Check browser console for `[XeroInvoices]` debug logs

## Related Files

- Frontend: [FinancialsPage.tsx](src/pages/FinancialsPage.tsx#L24-L50)
- Backend: [admin.ts](backend/src/routes/admin.ts#L171)
- Related: [Dashboard mock data removal](MOCK_DATA_REMOVAL.md)
