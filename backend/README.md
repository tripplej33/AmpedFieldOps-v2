# Backend API & Worker Service ⚡

## Overview

The AmpedFieldOps backend API server is built with Node.js, Express, TypeScript, and BullMQ. It powers background Xero accounting synchronization, administrative user lifecycle operations (soft deactivation and permanent cascading deletion), secure user invitation acceptance, and system-level RPC calls using the Supabase Service Role.

---

## 🏗️ Architecture & Services

- **Express REST API (`src/index.ts`)**: Serves admin endpoints, authentication flows, invitation verification, and Xero OAuth endpoints.
- **Supabase Admin Client (`src/config/supabase.ts`)**: Service-role initialized client for operations requiring elevated privileges (`auth.admin.createUser`, `auth.admin.deleteUser`, `auth.admin.signOut`, etc.).
- **Xero OAuth & Sync Engine (`src/routes/xero.ts`, `src/services/`)**: Connects to Xero API with AES-256-CBC encrypted token storage in `app_settings` / `xero_tokens`.
- **Job Queues (`src/jobs/queue.ts`, `src/jobs/worker.ts`)**: Redis-backed BullMQ queues for asynchronous synchronization of contacts, products/inventory items, and sales invoices.

---

## 📡 API Endpoints Reference

### 1. System Health
- `GET /health`: Uptime, server timestamp, Redis connectivity status, and environment.

### 2. User Lifecycle Management (`/admin`)
- `POST /admin/users/:id/disable`:
  - Soft-deactivates user via `public.admin_toggle_user_active(target_user_id, false)`.
  - Sets `banned_until` on `auth.users` and revokes active JWT sessions (`supabase.auth.admin.signOut`).
  - Completely preserves timesheets, compliance certificates, and safety sign-offs.
  - Guarded against self-deactivation and disabling the last active admin.
- `POST /admin/users/:id/enable`:
  - Reactivates a deactivated user via `public.admin_toggle_user_active(target_user_id, true)`.
  - Clears `banned_until` on `auth.users`, restoring login capability.
- `DELETE /admin/users/:id`:
  - Executes permanent cascading deletion via `public.admin_delete_user(target_user_id)`.
  - Safely deletes credentials, notifications, memberships, and nullifies/annotates historical timesheets, snags, and schedules.
  - Purges auth record from `auth.users` via `supabase.auth.admin.deleteUser`.
  - Guarded against deleting the last remaining system admin.
- `POST /admin/accept-invite`:
  - Validates cryptographically secure invitation token from `user_invitations`.
  - Sets user password in `auth.users` via Supabase Auth Admin.
  - Upserts `public.users` with assigned role and marks invitation as `accepted`.

### 3. CRM & Client Endpoints (`/admin`)
- `GET /admin/clients`: Returns client accounts with Xero contact mapping.

### 4. Xero OAuth & Manual Sync (`/xero` & `/admin/xero`)
- `GET /xero/auth`: Initiates OAuth 2.0 authorization flow.
- `GET /xero/callback`: Exchanges authorization code for tokens, encrypts credentials, and stores them in database.
- `GET /admin/xero/status`: Real-time tenant connection state, token expiry, and last sync log.
- `POST /admin/xero/sync-clients`: Queues background push of clients to Xero contacts.
- `POST /admin/xero/sync-pull-clients`: Queues background pull of Xero contacts into AmpedFieldOps.
- `POST /admin/xero/sync-items`: Queues product catalog synchronization.
- `POST /admin/xero/sync-pull-invoices`: Queues import of Xero invoices.
- `POST /admin/xero/sync-all`: Queues full master synchronization job.

---

## 🚀 Environment Variables (`backend/.env`)

```ini
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://admin.ampedlogix.com
SUPABASE_URL=https://dcssbsxjtfibwfxoagxl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
XERO_REDIRECT_URI=https://admin.ampedlogix.com/api/xero/callback
```

---

## 🛠️ Development & Production Commands

```bash
# Install dependencies
npm install

# Run TypeScript compiler check
npx tsc --noEmit

# Run development server with hot-reload
npm run dev

# Build production distribution
npm run build

# Start production server
npm start
```

