# Phase 7 Mission Brief - Backend API & Xero Integration
*Date: January 24, 2026*
*Phase: 7 - Backend Services & Xero Sync*
*Duration: 2-3 days*

## Overview

Build the Express.js backend server to handle service-role operations, Xero OAuth integration, and automated data synchronization between AmpedFieldOps and Xero accounting.

**Scope:**
- Express.js API server with protected admin endpoints
- Xero OAuth 2.0 connection flow
- Two-way sync: Clients ↔ Xero Contacts
- One-way import: Xero Products/Services → Activity Types
- Invoice creation: Timesheets → Xero Invoices
- Payment status tracking from Xero
- BullMQ job queue for background sync
- Admin dashboard to trigger/monitor syncs

---

## Architecture

### Tech Stack
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Queue:** BullMQ + Redis
- **HTTP Client:** Axios
- **Auth:** Xero OAuth 2.0 (xero-node SDK)
- **Database:** Supabase (service role key)
- **Encryption:** Node.js crypto (AES-256-CBC for tokens & credentials)
- **Environment:** Docker-compose for local dev

### Folder Structure
```
backend/
├── src/
│   ├── index.ts                # Express app entry
│   ├── config/
│   │   ├── xero.ts             # Xero OAuth config
│   │   ├── supabase.ts         # Supabase service role client
│   │   └── redis.ts            # Redis connection
│   ├── routes/
│   │   ├── admin.ts            # Admin endpoints (protected)
│   │   ├── xero.ts             # Xero OAuth flow & callback
│   │   └── health.ts           # Health check
│   ├── services/
│   │   ├── xero/
│   │   │   ├── auth.ts         # OAuth flow & token management
│   │   │   ├── contacts.ts     # Client ↔ Contact sync
│   │   │   ├── items.ts        # Products → Activity Types
│   │   │   ├── invoices.ts     # Timesheet → Invoice creation
│   │   │   ├── payments.ts     # Payment status polling
│   │   │   └── log.ts          # Sync logging helpers
│   │   └── supabase/
│   │       ├── clients.ts      # Client CRUD
│   │       ├── activityTypes.ts # Activity type CRUD
│   │       └── timesheets.ts   # Timesheet queries
│   ├── lib/
│   │   └── crypto.ts           # Token & credential encryption/decryption (AES-256-CBC)
│   ├── jobs/
│   │   ├── syncContacts.ts     # BullMQ: sync clients
│   │   ├── syncItems.ts        # BullMQ: sync products
│   │   ├── syncPayments.ts     # BullMQ: poll payment status
│   │   └── worker.ts           # Job processor
│   ├── middleware/
│   │   ├── auth.ts             # Service role / admin check
│   │   └── errorHandler.ts    # Global error handler
│   └── types/
│       └── xero.ts             # Xero API types
├── Dockerfile
├── docker-compose.yml          # Backend + Redis
├── package.json
└── tsconfig.json
```

---

## Phase 7 Deliverables

### Part 1: Express Server Setup (Day 1 AM)
- [x] Initialize backend folder structure
- [x] Express.js app with TypeScript
- [x] Health check endpoint: `GET /health`
- [x] Error handling middleware
- [x] CORS configuration (allow frontend origin)
- [x] Environment variables (.env)
- [x] Docker setup (backend + Redis)

### Part 2: Xero OAuth Integration (Day 1 PM)
- [x] Install xero-node SDK
- [x] Encryption library: `lib/crypto.ts` — AES-256-CBC encrypt/decrypt functions
- [x] Database: `xero_tokens` table for encrypted OAuth tokens
- [x] Service: `xero/auth.ts` — Token load/decrypt, refresh, tenant management
- [x] Route: `GET /xero/auth` → Read credentials from env, redirect to Xero login
- [x] Route: `GET /xero/callback` → Exchange code for tokens, store encrypted tokens
- [x] Route: `POST /xero/disconnect` → Clear tokens from xero_tokens table
- [x] Token refresh logic (access tokens expire in 30 min, auto-refresh via ensureXeroAuth)
- [ ] **PENDING:** Admin UI Settings page with credentials form (to be added in Phase 7+)
- [ ] **PENDING:** `app_settings` table for database-stored credentials (migration needed)
- [ ] **PENDING:** Settings endpoints for credential management (POST /admin/settings/xero, GET /admin/settings/xero/status)

### Part 3: Client ↔ Contact Sync (Day 2 AM)
- [x] Service: `xero/contacts.ts`
  - `syncClientToXero(clientId)` → Create/update Xero Contact
  - `syncContactToClient(xeroContactId)` → Update client from Xero
- [x] BullMQ job: `syncContacts.ts` (via worker.ts)
  - Runs every 15 minutes
  - Queries Supabase for clients with `xero_contact_id = null` or updated since last sync
  - Creates/updates Xero Contact
  - Stores `xero_contact_id` in clients table
- [x] Logs sync status to `xero_sync_log` table
- [x] Admin endpoint: `POST /admin/xero/sync-clients` (manual trigger)

### Part 4: Products → Activity Types (Day 2 PM)
- [x] Service: `xero/items.ts`
  - `importProducts()` → Fetch Xero Products/Services
  - Map to Activity Types (name, default_rate, xero_item_id, xero_item_code)
- [x] BullMQ job: `syncItems.ts` (via worker.ts)
  - Runs daily at 2 AM
  - Fetches all Products/Services from Xero
  - Updates Activity Types table (upsert by xero_item_id)
  - Marks `managed_by_xero = true`
- [x] Admin endpoint: `POST /admin/xero/sync-items` (manual trigger)

### Part 5: Timesheet → Invoice Creation (Day 3 AM)
- [x] Service: `xero/invoices.ts`
  - `createInvoiceFromTimesheets(costCenterId)`
  - Queries all approved timesheets for cost center
  - Groups by activity type
  - Creates Xero Invoice with line items
  - Sets Reference = customer PO number
  - Sets Notes = "PROJECT001 - Labor"
  - Marks timesheets as `invoiced`
  - Stores invoice ID in `invoices` table
- [x] Admin endpoint: `POST /admin/invoices` (via admin.ts)
- [x] Logs to `xero_sync_log`

### Part 6: Payment Status Polling (Day 3 PM)
- [x] Service: `xero/payments.ts`
  - `pollPaymentStatus()` → Fetch invoice status from Xero
  - Update `invoices` table with payment status (Paid/Unpaid/Overdue)
- [x] BullMQ job: `syncPayments.ts` (via worker.ts)
  - Runs every 6 hours
  - Queries invoices with `xero_invoice_id` and status != 'Paid'
  - Updates payment status
- [x] Admin endpoint: `POST /admin/xero/sync-payments` (manual trigger)

### Part 7: Admin Dashboard Integration (Phase 7+ / Frontend)
- [ ] Frontend: Add "Xero Settings" page (`/app/settings/xero`) with:
  - [ ] Credentials form (Client ID, Secret, auto-filled Redirect URI)
  - [ ] "Save Credentials" button → POST /admin/settings/xero
  - [ ] "Connect to Xero" button → Opens OAuth flow (GET /xero/auth)
  - [ ] Status indicator: Connected / Disconnected with org name
  - [ ] Manual sync buttons: Sync Clients, Sync Items, Sync Payments, Create Invoices
  - [ ] Sync log table: Last 20 operations with status
  - [ ] "Disconnect" button → Clear tokens
- [ ] Navigation: Add Settings link to sidebar (admin-only)
- [ ] Environment variable: `VITE_BACKEND_URL` configured in .env
- [ ] Form validation: Client ID must be 32 chars, hex only
- [ ] Dynamic redirect URI: Auto-fill from `${window.location.origin}/api/xero/callback`
- [ ] Domain shift detection: Warn if saved URI is localhost but app is on production

---

## API Endpoints

### Health & OAuth (✅ Implemented)
```
GET  /health                       → { status: "ok", uptime: 12345 }
GET  /xero/auth                    → Read credentials from env, redirect to Xero login
GET  /xero/callback?code=...       → Exchange code, store encrypted tokens, redirect to frontend
POST /xero/disconnect              → Clear tokens from xero_tokens table
```

### Admin Endpoints - Sync Operations (✅ Implemented)
```
POST /admin/xero/sync-clients      → Enqueue client ↔ contact sync job
POST /admin/xero/sync-items        → Enqueue products → activity types job
POST /admin/xero/sync-payments     → Enqueue payment status poll job
POST /admin/xero/sync-invoices     → Enqueue invoice creation job
GET  /admin/xero/status            → { synced_at, next_sync, errors: [] }
GET  /admin/xero/log?limit=20      → Last N sync log entries from xero_sync_log
```

### Settings Endpoints (⏳ Pending - Phase 7+)
```
POST /admin/settings/xero          → Save Client ID, Secret to app_settings (body: { clientId, clientSecret })
GET  /admin/settings/xero/status   → { connected: true, tenant_name: "...", redirect_uri: "...", credentials_saved: true }
DELETE /admin/settings/xero        → Clear both credentials and tokens
```

---

## Database Schema Updates

### ✅ Implemented: `xero_tokens` table (Phase 7 migration)
```sql
CREATE TABLE IF NOT EXISTS xero_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,              -- Xero tenant ID
  tenant_name TEXT,                     -- Xero organization name
  access_token TEXT NOT NULL,           -- Encrypted (AES-256-CBC)
  refresh_token TEXT NOT NULL,          -- Encrypted (AES-256-CBC)
  id_token TEXT,                        -- Encrypted (AES-256-CBC)
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xero_tokens_tenant ON xero_tokens(tenant_id);
CREATE INDEX idx_xero_tokens_expires ON xero_tokens(expires_at);

-- RLS: Only service role can access (backend only)
ALTER TABLE xero_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON xero_tokens FOR ALL USING (false);
```

### ⏳ Pending: `app_settings` table (Phase 7+ migration needed)
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,                        -- Encrypted for sensitive values
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rows to store:
-- key = 'xero_client_id'     → value = encrypted client ID
-- key = 'xero_client_secret' → value = encrypted client secret
-- key = 'xero_redirect_uri'  → value = plain text URI (public)

-- RLS: Only admins can read/write
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only" ON app_settings FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Existing Tables: Add Xero Fields
```sql
-- clients: Add xero_contact_id
ALTER TABLE clients ADD COLUMN xero_contact_id TEXT;
ALTER TABLE clients ADD COLUMN xero_synced_at TIMESTAMPTZ;

-- activity_types: Already has xero_item_id, xero_item_code, managed_by_xero

-- invoices: Add xero_invoice_id, payment_status
ALTER TABLE invoices ADD COLUMN xero_invoice_id TEXT;
ALTER TABLE invoices ADD COLUMN payment_status TEXT; -- Paid, Unpaid, Overdue

-- timesheets: Add invoiced flag (if not exists)
ALTER TABLE timesheets ADD COLUMN invoiced BOOLEAN DEFAULT false;
```

---

## Xero API Integration Details

### OAuth 2.0 Flow - Current Implementation (Phase 7)
**Status:** ✅ Backend implemented, ⏳ Frontend UI pending

**Current Flow (Env-based credentials):**
1. Admin clicks "Connect to Xero" button (frontend TBD)
2. Frontend redirects: `window.location.href = '/api/xero/auth'`
3. Backend `GET /xero/auth`:
   - Reads `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` from env
   - Constructs Xero OAuth URL with scopes
   - Returns 302 redirect to Xero
4. User logs in and grants permissions in Xero
5. Xero redirects to: `GET /api/xero/callback?code=ABC123&state=...`
6. Backend callback handler:
   - Exchanges code for tokens via xero-node SDK
   - Encrypts access_token, refresh_token, id_token (AES-256-CBC)
   - Stores in `xero_tokens` table with tenant info
   - Returns 302 redirect to frontend: `${FRONTEND_URL}/app/settings?xero_connected=true`
7. Frontend shows "Connected" status

**Planned Flow (Phase 7+ with Settings UI):**
1. Admin goes to Settings > Integrations > Xero
2. Form shows:
   - Client ID input (32 chars, hex validation)
   - Client Secret input (password field)
   - Redirect URI (auto-filled: `${window.location.origin}/api/xero/callback`)
3. Admin clicks "Save Credentials"
   - Frontend: `POST /admin/settings/xero { clientId, clientSecret }`
   - Backend stores encrypted in `app_settings` table
4. Admin clicks "Connect to Xero"
   - Backend reads credentials from `app_settings` (not env)
   - OAuth flow proceeds as above
5. Dynamic redirect URI:
   - If saved URI = `http://localhost:3001/api/xero/callback`
   - But app is on `https://app.ampedfieldops.com`
   - Auto-update to production URI and re-save to `app_settings`

**Key Features (to implement in Phase 7+):**
- ✅ Token encryption (AES-256-CBC)
- ✅ Token auto-refresh (ensureXeroAuth checks expiry)
- ⏳ Database-stored credentials (needs migration + UI)
- ⏳ Dynamic redirect URI calculation
- ⏳ Domain shift detection (localhost → production)

### API Scopes Required
```
accounting.transactions
accounting.contacts
accounting.settings
offline_access
```

### Token Refresh
- Access tokens expire in 30 minutes
- Refresh tokens valid for 60 days
- Before each API call, check if token expired
- If expired, use refresh token to get new access token
- Update `xero_tokens` table

---

## BullMQ Job Queue

### Job Types
```typescript
type JobName = 
  | 'sync-contacts'    // Client ↔ Contact sync
  | 'sync-items'       // Products → Activity Types
  | 'sync-payments'    // Payment status poll

interface JobData {
  jobName: JobName
  triggeredBy?: 'manual' | 'scheduled'
  params?: Record<string, any>
}
```

### Job Processor
```typescript
// jobs/worker.ts
worker.on('sync-contacts', async (job) => {
  const { triggeredBy } = job.data
  await syncContacts()
  await logSync('sync-contacts', 'success', triggeredBy)
})
```

### Schedule
```typescript
// Cron schedules
repeatableJobs.add('sync-contacts', { repeat: { cron: '*/15 * * * *' } }) // Every 15 min
repeatableJobs.add('sync-items', { repeat: { cron: '0 2 * * *' } })       // Daily 2 AM
repeatableJobs.add('sync-payments', { repeat: { cron: '0 */6 * * *' } })   // Every 6 hours
```

---

## Environment Variables

```bash
# .env (backend/)
NODE_ENV=development
PORT=3001

# Supabase
SUPABASE_URL=https://dcssbsxjtfibwfxoagxl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Xero OAuth (Phase 7 - Current)
# Currently used directly from env; will be moved to database in Phase 7+
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
XERO_REDIRECT_URI=http://localhost:3001/api/xero/callback

# Xero OAuth (Phase 7+ - Future)
# After Settings UI is implemented, credentials will be stored in app_settings table
# Env vars above will only be used as fallback if database is empty

# Redis (for BullMQ job queue)
REDIS_URL=redis://localhost:6379

# Encryption (AES-256-CBC for tokens & credentials)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-char-hex-key

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## Security & Error Handling

### Admin Auth Middleware
```typescript
// middleware/auth.ts
export const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  req.user = user
  next()
}
```

### Error Handling
```typescript
// middleware/errorHandler.ts
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)
  
  if (err.name === 'XeroApiError') {
    return res.status(502).json({ error: 'Xero API error', message: err.message })
  }

  res.status(500).json({ error: 'Internal server error' })
}
```

### Token Encryption
```typescript
import crypto from 'crypto'

const algorithm = 'aes-256-cbc'
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

---

## Testing Strategy

### Unit Tests
- Xero service functions (mocked API responses)
- Encryption/decryption (token & credential strings)
- Redirect URI auto-detection (localhost → production domain)
- Job processors (mocked Supabase)

### Integration Tests
- OAuth flow (use Xero sandbox)
  - Save credentials → form validation
  - Click "Connect to Xero" → verify redirect
  - Callback → verify tokens encrypted in DB
- Contact sync (create test client → verify in Xero sandbox)
- Product import (fetch from Xero sandbox → verify Activity Types)
- Invoice creation (create test timesheets → verify invoice in Xero)
- Domain shift (localhost → production) → verify redirect URI auto-updated

### Manual Testing (QA)
1. Go to Settings > Integrations > Xero
2. Enter Client ID (must be 32 chars)
3. Enter Client Secret
4. Verify Redirect URI is auto-filled with current domain
5. Click "Save Credentials" → verify stored in database
6. Click "Connect to Xero" → verify OAuth flow works
7. After OAuth, verify "Connected" badge shows org name
8. Click "Disconnect" → verify tokens cleared
9. Create client → verify Contact created in Xero
10. Update Contact in Xero → verify synced back to AmpedFieldOps
11. Trigger manual syncs → verify logs show success
12. Test domain shift (deploy to production) → verify redirect URI auto-updates

---

## Success Criteria

### Phase 7 Backend (✅ COMPLETE)
✅ Backend server running on port 3001 (Express + TypeScript)  
✅ Encryption library for tokens (AES-256-CBC via lib/crypto.ts)  
✅ Database table created: `xero_tokens` (Phase 7 migration)  
✅ OAuth endpoints: `/xero/auth`, `/xero/callback`, `/xero/disconnect`  
✅ Tokens stored securely (encrypted) and auto-refresh (ensureXeroAuth)  
✅ Client ↔ Contact sync service (contacts.ts with Xero API + fallback)  
✅ Products → Activity Types sync (items.ts with Xero API + fallback)  
✅ Invoice creation from timesheets (invoices.ts with Xero API + fallback)  
✅ Payment status polling service (payments.ts placeholder)  
✅ BullMQ job queue + worker (sync-clients/items/invoices/payments)  
✅ Admin sync endpoints: POST /admin/xero/sync-*, GET /admin/xero/status, GET /admin/xero/log  
✅ Error handling middleware + logging  
✅ TypeScript compiles with no errors  
✅ Docker setup: Dockerfile + docker-compose.yml (backend + Redis)  

### Phase 7+ Pending (⏳ TODO)
⏳ Database table: `app_settings` (credentials storage migration)  
⏳ Settings endpoints: POST/GET /admin/settings/xero  
⏳ Frontend Settings UI: Xero credentials form (Client ID, Secret, URI)  
⏳ Dynamic redirect URI calculation with domain shift detection  
⏳ Form validation: 32-char hex Client ID, credential save/load from DB  
⏳ Admin dashboard: Xero status, sync buttons, log display  

**Backend Phase 7: ✅ COMPLETE** (requires migration execution + credentials for testing)  
**Frontend Phase 7+: ⏳ PENDING** (Settings UI + credential management)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Xero API rate limits | HIGH | Cache responses, batch operations, exponential backoff |
| Token expiry mid-sync | MEDIUM | Refresh before each API call |
| Duplicate contacts | MEDIUM | Use email as unique key; check before creating |
| Invoice creation errors | HIGH | Validate timesheet data; log errors; alert admin |
| Redis connection loss | MEDIUM | Graceful fallback; retry logic |
| Xero sandbox limitations | LOW | Test with real Xero account (demo company) |

---

## Development Workflow

### Day 1: Setup + OAuth + Credentials
1. Initialize backend project
2. Express server + health check
3. Docker-compose (backend + Redis)
4. Encryption service (AES-256-CBC for tokens & credentials)
5. Database tables: `app_settings`, `xero_tokens`
6. OAuth endpoints: `GET /xero/auth`, `GET /xero/callback`
7. Settings endpoints: `POST /settings/xero/credentials`, `GET /settings/xero/status`
8. Dynamic redirect URI calculation (with domain shift detection)
9. Frontend: Add Settings page with Xero tab (credentials form, status, buttons)

### Day 2: Token Management + Data Sync
1. Token refresh logic (auto-refresh on expired check)
2. Client ↔ Contact sync service
3. Products → Activity Types import
4. BullMQ jobs + schedules
5. Manual trigger endpoints

### Day 3: Invoicing + Polish
1. Invoice creation from timesheets
2. Payment status polling
3. Admin dashboard sync buttons (on Settings page)
4. Sync log display
5. Error handling and logging
6. Testing and bug fixes

---

## Documentation Deliverables

1. **API.md** - All endpoints with request/response examples
2. **XERO_SETUP.md** - Step-by-step Xero app creation and OAuth setup
3. **DEPLOYMENT.md** - Docker setup, environment variables, production checklist
4. **TROUBLESHOOTING.md** - Common errors and solutions

---

## Next Steps

1. Backend developer creates project structure
2. Sets up Express + TypeScript + Docker
3. Implements OAuth flow (can use Xero sandbox)
4. Builds sync services incrementally
5. Tests each feature as it's built
6. Frontend developer integrates admin dashboard
7. QA tests full integration workflow

---

**Estimated Duration:** 2-3 days (16-24 hours)  
**Priority:** P1 (required for production)  
**Dependencies:** Phase 1-6 complete  
**Blockers:** None

---

**Status: Ready for Backend Developer to begin Phase 7 implementation.**
