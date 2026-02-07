# Backend API - Phase 7 Setup Guide

## Overview

The backend API server provides Xero integration and admin-level operations for AmpedFieldOps. Built with Express.js, it handles OAuth authentication, data synchronization, and invoice management.

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── config/
│   │   ├── supabase.ts       # Supabase service role client
│   │   ├── xero.ts           # Xero OAuth configuration
│   │   └── redis.ts          # Redis connection
│   ├── routes/
│   │   ├── admin.ts          # Admin endpoints (stub)
│   │   └── xero.ts           # Xero OAuth flow
│   ├── services/             # Business logic (to be implemented)
│   ├── jobs/                 # BullMQ background jobs (to be implemented)
│   └── middleware/           # Auth & error handling (to be implemented)
├── .env                      # Environment variables
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- Redis (for BullMQ job queue)
- Supabase account with service role key
- Xero Developer account (for OAuth credentials)

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Xero OAuth
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
XERO_REDIRECT_URI=http://localhost:3001/xero/callback

# Redis
REDIS_URL=redis://localhost:6379

# Encryption key (32-byte hex) - generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-encryption-key-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Development

```bash
# Run in watch mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## API Endpoints

### Health Check
```
GET /health
Response: { status: "ok", uptime: 12345, timestamp: "...", environment: "development" }
```

### Xero OAuth
```
GET /xero/auth
→ Redirects to Xero login

GET /xero/callback?code=...
→ Exchanges code for tokens, stores in database, redirects to frontend

POST /xero/disconnect
→ Removes Xero connection
```

### Admin Endpoints (Stubs)
```
POST /admin/xero/sync-clients
POST /admin/xero/sync-items
POST /admin/xero/sync-payments
POST /admin/invoices/create
GET  /admin/xero/status
GET  /admin/xero/sync-log
```

## Database Migrations

Run the Phase 7 migration to create required tables:

```sql
-- Located at: /root/AmpedFieldOps-v2/supabase/migrations/20260124_phase7_xero_integration.sql

Tables created:
- xero_tokens       # OAuth credentials (encrypted)
- invoices          # Invoice tracking
- clients           # Added xero_contact_id column
- timesheets        # Added invoiced flag
```

## Xero Setup

1. Create a Xero app at https://developer.xero.com/
2. Set redirect URI to: `http://localhost:3001/xero/callback`
3. Enable scopes: `openid profile email accounting.transactions accounting.contacts accounting.settings offline_access`
4. Copy Client ID and Client Secret to `.env`

## Security

- Tokens are encrypted using AES-256-CBC before storage
- Service role key bypasses RLS (use only in backend)
- Admin endpoints require authentication middleware (to be implemented)

## Next Steps

1. Implement sync services (contacts, items, payments)
2. Create BullMQ job workers
3. Add authentication middleware for admin routes
4. Build invoice creation logic
5. Set up Docker Compose for Redis
6. Add comprehensive error handling and logging

## Status

✅ Express server running
✅ Health endpoint working
✅ Xero OAuth configuration
✅ Admin endpoint stubs
✅ Database migration created
✅ TypeScript compilation successful

🔄 In Progress:
- Xero sync services implementation
- BullMQ job queue setup
- Authentication middleware
- Docker Compose configuration
