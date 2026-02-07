# Phase 7 Xero Integration Analysis: Old vs New Approach
*Date: January 28, 2026*
*Status: Analysis Only (No Changes Made)*

## Executive Summary

The **old app's Xero integration** uses a **settings-based approach** where:
1. Admin enters Xero credentials (Client ID, Secret) directly on the Settings page
2. Credentials are **saved to the database** (`settings` table with keys: `xero_client_id`, `xero_client_secret`, `xero_redirect_uri`)
3. **Redirect URI is dynamically calculated** from the current domain (auto-adjusts from localhost to production)
4. OAuth connects **directly from the frontend** (redirect happens after credentials saved)

The **Phase 7 brief plans** a more traditional **backend OAuth approach** where:
1. Backend has credentials in environment variables only
2. Frontend gets OAuth URL from backend
3. Backend exchanges code for tokens
4. Tokens stored in `xero_tokens` table

---

## Old App Implementation (What Works)

### 1. Frontend: Settings Page
**File:** `/root/AmpedFieldOps/src/components/pages/Settings.tsx`

**UI Flow:**
```
Settings > Integrations Tab > Xero Integration Card
├─ Shows connection status (Connected / Not Connected)
├─ If NOT connected:
│  ├─ Input: Client ID (32 chars)
│  ├─ Input: Client Secret (password)
│  ├─ Input: Redirect URI (auto-filled, editable)
│  ├─ Button: "Save Credentials"
│  └─ Button: "Connect to Xero" (enabled only after save)
└─ If connected:
   ├─ Shows: Organization name, Last sync
   ├─ Toggle: Auto-sync
   ├─ Buttons: Pull Contacts, Push Contacts, Sync All, Disconnect
```

**Key Features:**
- **Local state** for credentials (not auto-saved until user clicks "Save Credentials")
- **Validation**:
  - Client ID must be exactly 32 chars
  - Warns if not hexadecimal
  - Rejects email addresses
- **Auto-calculated redirect URI**:
  ```typescript
  const currentRedirectUri = `${window.location.origin}/api/xero/callback`
  ```
- **Smart URI handling**: If saved URI is localhost but we're on production, automatically updates
- **OAuth postMessage listener**: Listens for messages from OAuth callback popup
- **Error handling**: Detailed error messages with client ID/redirect URI shown for debugging

### 2. Backend: Database Storage
**File:** `/root/AmpedFieldOps/backend/src/lib/xero/auth.ts`

**Storage Pattern:**
```typescript
// Credentials stored in 'settings' table, not env vars
SELECT value FROM settings WHERE key = 'xero_client_id' AND user_id IS NULL
SELECT value FROM settings WHERE key = 'xero_client_secret' AND user_id IS NULL
SELECT value FROM settings WHERE key = 'xero_redirect_uri' AND user_id IS NULL

// OAuth tokens stored in 'xero_tokens' table
SELECT * FROM xero_tokens ORDER BY created_at DESC LIMIT 1
```

**Token Management:**
- Check if token expired: `if (expiresAt < new Date())`
- Auto-refresh using refresh token
- Clear tokens if refresh fails

### 3. OAuth Flow
**Step-by-step:**
1. User enters credentials on Settings page
2. User clicks "Save Credentials" → stored in `settings` table
3. User clicks "Connect to Xero" → frontend calls `api.getXeroAuthUrl()`
4. Backend returns OAuth redirect URL with saved credentials
5. Frontend redirects to Xero: `window.location.href = response.url`
6. User authorizes in Xero
7. Xero redirects to: `/api/xero/callback?code=ABC123`
8. Backend exchanges code for tokens
9. Backend stores tokens in `xero_tokens` table
10. Backend redirects back to frontend with success status
11. Frontend shows "Connected" badge

---

## What Needs to Change in Phase 7

### Problem 1: Where Credentials Live
**Old App:** Database (`settings` table)  
**Phase 7 Brief:** Environment variables only

**What This Means:**
- ❌ Phase 7 brief says "only env vars" — **but frontend has no UI to set them**
- ✅ Old app approach is better — **UI allows admin to configure without redeploying**
- **Solution:** Keep the database-based approach; update Phase 7 to match

### Problem 2: Redirect URI Handling
**Old App:** Calculated dynamically from current domain  
**Phase 7 Brief:** Static from environment variables

**Old App Advantage:**
```typescript
// Auto-fixes localhost → production redirect URI
if (redirectUri.includes('localhost') && !window.location.hostname.includes('localhost')) {
  redirectUri = window.location.origin + '/api/xero/callback'
  // Updates in database
  await api.updateSetting('xero_redirect_uri', redirectUri, true)
}
```

**Phase 7 Issue:**
- If redirect URI in `.env` is `http://localhost:3001/api/xero/callback`
- Deploying to production breaks OAuth (Xero mismatch)
- **Solution:** Implement the old app's dynamic calculation

### Problem 3: OAuth Direction
**Old App:** Frontend-initiated OAuth (user clicks button, browser redirects)  
**Phase 7 Brief:** Backend-initiated OAuth (backend generates URL, returns to frontend)

**Comparison:**
```
Old App (Works):
Frontend → User clicks "Connect to Xero"
  ↓
Frontend calls api.getXeroAuthUrl()
  ↓
Backend reads credentials from settings table
  ↓
Backend constructs Xero URL
  ↓
Frontend redirects: window.location.href = response.url
  ↓
(OAuth happens in same browser window)
  ↓
Xero redirects to /api/xero/callback
  ↓
Backend handles callback, redirects back to frontend

---

Phase 7 Brief (Popup Model):
Frontend → Shows "Connect to Xero" button
  ↓
Frontend calls api.getXeroAuthUrl()
  ↓
Backend reads credentials from env or settings
  ↓
Frontend opens in popup: window.open(response.url)
  ↓
(OAuth happens in popup)
  ↓
Xero redirects to /api/xero/callback
  ↓
Backend handles callback, postMessage to parent window
  ↓
Parent window sees "connected" message
```

**Old App Advantage:** Simpler, no popup, works better on mobile  
**Phase 7 Advantage:** Doesn't navigate away from settings page

### Problem 4: Token Storage & Encryption
**Old App:** Tokens stored in `xero_tokens` table (plain text, no encryption)  
**Phase 7 Brief:** Mentions encryption with `crypto` module

**What Needs to Change:**
- Phase 7 is **correct to add encryption**
- Old app stores tokens unencrypted (security gap)
- **Solution:** Keep Phase 7's encryption approach

### Problem 5: Admin Settings Storage
**Old App:** All settings (Client ID, Secret, Redirect URI) in `settings` table  
**Phase 7 Brief:** Uses `xero_auth` table for tokens, but doesn't specify where credentials go

**Missing from Phase 7:**
- Where are Client ID and Secret stored?
- Should they go in `xero_auth` table or `app_settings`?
- **Solution:** Define a clear table structure

---

## Recommended Integration Strategy

### Hybrid Approach: Combine Old + New Best Practices

**1. Credentials Storage (Use Old App's Approach)**
```sql
-- Store in app_settings table with encryption
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,           -- Store encrypted credentials here
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credentials stored as:
key = 'xero_client_id'     → encrypted value
key = 'xero_client_secret' → encrypted value
key = 'xero_redirect_uri'  → can be plain (public URI)
```

**2. Token Storage (Use Phase 7's Approach)**
```sql
-- Separate table for OAuth tokens
CREATE TABLE xero_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,      -- Encrypted
  refresh_token TEXT NOT NULL,     -- Encrypted
  expires_at TIMESTAMPTZ NOT NULL,
  organization_id TEXT,            -- Xero tenant ID
  organization_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**3. Redirect URI Strategy (Use Old App's Approach)**
```typescript
// Backend function to get redirect URI
function getRedirectUri(): string {
  // Try database first
  const saved = db.getSetting('xero_redirect_uri')
  if (saved) return saved
  
  // Auto-calculate from environment
  const domainFromEnv = process.env.FRONTEND_URL || process.env.BACKEND_URL
  return `${domainFromEnv}/api/xero/callback`
}
```

**4. OAuth Flow (Use Old App's Approach)**
```typescript
// Frontend-initiated, same-window redirect
GET /admin/xero/auth
  ↓
GET /api/xero/callback?code=ABC123
  ↓
Browser redirected to Xero, then back to /settings?xero_connected=true
```

**5. Frontend UI (Use Old App's Approach)**
```tsx
// Settings page shows:
├─ Credentials inputs (Client ID, Secret)
├─ "Save Credentials" button
├─ Auto-filled Redirect URI
├─ "Connect to Xero" button
└─ If connected: status, sync buttons, disconnect
```

---

## File Structure Changes Needed

### Backend
```
backend/src/
├── config/
│   ├── encryption.ts      (NEW - crypto utilities)
│   └── supabase.ts        (modify - add xero auth queries)
├── routes/
│   ├── xero.ts            (modify - from Phase 7)
│   └── admin.ts           (modify - add settings endpoints)
├── services/
│   ├── xero/
│   │   ├── auth.ts        (modify - use db + encryption)
│   │   ├── contacts.ts    (from Phase 7)
│   │   ├── items.ts       (from Phase 7)
│   │   ├── invoices.ts    (from Phase 7)
│   │   └── payments.ts    (from Phase 7)
│   └── encryption.ts      (NEW - token encryption)
└── jobs/
    ├── syncContacts.ts    (from Phase 7)
    ├── syncItems.ts       (from Phase 7)
    └── syncPayments.ts    (from Phase 7)
```

### Frontend
```
src/
├── pages/
│   ├── Settings.tsx       (add Xero tab with credentials form)
│   └── [AdminXero].tsx    (optional - dedicated Xero admin page)
└── components/
    └── XeroIntegration.tsx (component for credentials + status)
```

### Database
```
supabase/migrations/
├── 20260128_create_xero_tables.sql
│  ├── xero_auth table (tokens + metadata)
│  ├── app_settings table (credentials + config)
│  ├── RLS policies
│  └── Encryption functions
└── 20260128_create_xero_sync_log.sql
   └── Existing (already in Phase 5)
```

---

## Summary of Changes Needed

| Aspect | Phase 7 Brief | Should Be | Why |
|--------|---------------|-----------|-----|
| **Credentials Storage** | Env vars only | Database + env fallback | Users need UI to configure |
| **Redirect URI** | Static from env | Dynamic from domain | Localhost → prod auto-fix |
| **OAuth Flow** | Popup (via postMessage) | Same-window redirect | Simpler, works on mobile |
| **Token Encryption** | ✅ Yes (crypto module) | ✅ Keep it | Security best practice |
| **Credentials UI** | ❌ Not specified | Settings page form | Old app pattern proven to work |
| **Sync Services** | ✅ Correct (contacts, items, invoices) | ✅ Keep them | Implementation is solid |
| **BullMQ Jobs** | ✅ Correct (scheduled sync) | ✅ Keep them | Job queue pattern proven |

---

## Conclusion

**Phase 7 Brief needs to be updated to:**
1. **Move credentials from env-only to database** (like old app)
2. **Implement dynamic redirect URI calculation** (from old app)
3. **Use same-window OAuth redirect** instead of popup (from old app)
4. **Add Settings page UI** for admin to input credentials (from old app)
5. **Keep token encryption** (already in brief, good)
6. **Keep all sync services** (contacts, items, invoices, payments)
7. **Keep BullMQ job queue** (scheduled + manual sync)

This hybrid approach gives you:
- ✅ User-friendly admin UI (from old app)
- ✅ Secure token storage (from Phase 7)
- ✅ Automatic production handling (from old app)
- ✅ Robust sync services (from Phase 7)
- ✅ Proven OAuth flow (from old app)

---

## Next Steps (When You Approve)

1. Update `phase7_mission_brief.md` with hybrid approach
2. Add Settings page component spec to Phase 7
3. Update database schema section (credentials storage)
4. Update OAuth flow section (redirect vs popup)
5. Add encryption module to services section
6. Keep all sync services as-is

Ready to make these updates when you confirm.
