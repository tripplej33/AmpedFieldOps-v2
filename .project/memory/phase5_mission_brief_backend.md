# Phase 5 Mission Brief - Backend: Operations & Scheduling
*Date: January 23, 2026*

## 🎯 Mission Objective
Build the backend infrastructure for **Operations & Scheduling** — database tables, RLS policies, Express.js API routes, and Xero integration for activity types and financial tracking.

**Target Duration:** 6-8 hours  
**Target Completion:** January 24, 2026  
**Priority:** P1

---

## 📋 What You're Building

### 1. **Activity Types Management** (2 hours)
Backend CRUD for service categories that map to Xero Products/Services.

#### Database Tables
```sql
-- Activity Types (managed by admin, synced to Xero)
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate >= 0),
  description TEXT,
  xero_code TEXT UNIQUE, -- Xero ProductCode for mapping
  xero_managed BOOLEAN DEFAULT FALSE, -- If true, updates come from Xero
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read enabled activity types
CREATE POLICY "Anyone can read enabled activity types"
  ON activity_types FOR SELECT
  USING (enabled = TRUE);

-- Only admins can write activity types
CREATE POLICY "Admins can CRUD activity types"
  ON activity_types FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

#### Express.js Routes
```typescript
// src/routes/activityTypes.ts

// GET /api/activity-types
router.get('/activity-types', async (req, res) => {
  // Query: SELECT * FROM activity_types WHERE enabled = TRUE
  // Return: ActivityType[]
});

// GET /api/activity-types/:id
router.get('/activity-types/:id', async (req, res) => {
  // Query: SELECT * FROM activity_types WHERE id = $1
  // Return: ActivityType
});

// POST /api/activity-types (admin only)
router.post('/activity-types', requireAdmin, async (req, res) => {
  // Validate: name, hourly_rate required
  // Insert: INSERT INTO activity_types (name, hourly_rate, ...) VALUES (...)
  // Return: Created ActivityType
  // Trigger: Sync to Xero if xero_code provided
});

// PUT /api/activity-types/:id (admin only)
router.put('/activity-types/:id', requireAdmin, async (req, res) => {
  // Validate: id exists
  // Update: UPDATE activity_types SET ... WHERE id = $1
  // Return: Updated ActivityType
  // Trigger: Sync to Xero if changed
});

// DELETE /api/activity-types/:id (admin only)
router.delete('/activity-types/:id', requireAdmin, async (req, res) => {
  // Check: Not used in any timesheets (soft delete or hard?)
  // Delete: UPDATE activity_types SET enabled = FALSE WHERE id = $1
  // Return: { success: true }
});

// POST /api/activity-types/bulk-import (admin only)
router.post('/activity-types/bulk-import', requireAdmin, async (req, res) => {
  // Input: CSV file with columns: name, hourly_rate, xero_code
  // Process: Parse CSV, validate each row
  // Insert: Batch insert validated rows
  // Return: { imported: 10, errors: [] }
});

// POST /api/activity-types/sync-from-xero (admin only)
router.post('/activity-types/sync-from-xero', requireAdmin, async (req, res) => {
  // Fetch Xero Products/Services
  // For each: Check if activity_type exists by xero_code
  //   If exists: Update (if xero_managed = TRUE)
  //   If not: Create new
  // Return: { synced: 5, created: 3, updated: 2, errors: [] }
});
```

#### Types & Validation
```typescript
// src/types/ActivityType.ts
export interface ActivityType {
  id: string;
  name: string;
  hourly_rate: number;
  description?: string;
  xero_code?: string;
  xero_managed: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// src/lib/validators/activityTypes.ts
import { z } from 'zod';

export const CreateActivityTypeSchema = z.object({
  name: z.string().min(1).max(255),
  hourly_rate: z.number().min(0),
  description: z.string().max(1000).optional(),
  xero_code: z.string().max(50).optional(),
  enabled: z.boolean().default(true),
});

export const UpdateActivityTypeSchema = CreateActivityTypeSchema.partial();
```

---

### 2. **Dashboard Activity Feed** (2 hours)
Denormalized activity log for efficient timeline queries.

#### Database Tables
```sql
-- Activity log (denormalized for performance)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'timesheet_submitted', 'timesheet_approved', 'job_created', 'project_updated', etc.
  resource_type TEXT NOT NULL, -- 'timesheet', 'job', 'project', 'activity_type'
  resource_id UUID,
  resource_name TEXT, -- Denormalized for display (e.g., "John Smith's Timesheet")
  details JSONB, -- { old_status: 'draft', new_status: 'approved', ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX activity_log_created_at_idx ON activity_log(created_at DESC);
CREATE INDEX activity_log_user_id_idx ON activity_log(user_id);
CREATE INDEX activity_log_resource_idx ON activity_log(resource_type, resource_id);

-- RLS: Users can only see activity from their organization/projects
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read activity"
  ON activity_log FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    -- Later: add org check
  );
```

#### Express.js Routes
```typescript
// src/routes/dashboard.ts

// GET /api/dashboard/activity-feed?limit=20&offset=0
router.get('/dashboard/activity-feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  
  // Query: SELECT * FROM activity_log 
  //        WHERE user_id = $1 (or org check)
  //        ORDER BY created_at DESC
  //        LIMIT $2 OFFSET $3
  // Return: ActivityLogEntry[]
});

// GET /api/dashboard/stats
router.get('/dashboard/stats', async (req, res) => {
  // Query multiple counts:
  // 1. Total jobs (COUNT from jobs table)
  // 2. Completed today (COUNT from jobs WHERE completed_date = TODAY AND status = 'completed')
  // 3. Pending approvals (COUNT from timesheets WHERE status = 'submitted')
  // 4. Revenue today (SUM from timesheets WHERE created_at TODAY * activity_type.hourly_rate)
  // 
  // For role-based:
  // - Technician: Only their own stats
  // - Manager: Their team's stats
  // - Admin: Company-wide stats
  //
  // Return: {
  //   totalJobs: 45,
  //   completedToday: 3,
  //   pendingApprovals: 2,
  //   revenueToday: 2400.00
  // }
});

// POST /api/dashboard/refresh (admin only)
router.post('/dashboard/refresh', requireAdmin, async (req, res) => {
  // Manually trigger recalculation of dashboard stats
  // (if using caching layer)
  // Return: { success: true, timestamp: Date.now() }
});
```

#### Helper Functions
```typescript
// src/lib/activityLog.ts

export async function logActivity(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  resourceName?: string,
  details?: Record<string, any>
) {
  // Insert into activity_log table
  // Called from other route handlers
}

// Usage in other routes:
// After timesheet approved:
// await logActivity(userId, 'timesheet_approved', 'timesheet', timesheetId, 'John Smith Timesheet', { status: 'approved' });
```

---

### 3. **Financial Summary & Xero Integration** (2 hours)
Financial overview and Xero sync status tracking.

#### Database Tables
```sql
-- Xero sync tracking
CREATE TABLE xero_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL, -- 'activity_types', 'contacts', 'invoices', 'payments'
  status TEXT NOT NULL, -- 'pending', 'success', 'error'
  error_message TEXT,
  records_processed INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  synced_by UUID REFERENCES auth.users(id)
);

CREATE INDEX xero_sync_log_started_at_idx ON xero_sync_log(started_at DESC);
```

#### Express.js Routes
```typescript
// src/routes/financials.ts

// GET /api/financials/summary
router.get('/financials/summary', async (req, res) => {
  // Queries:
  // 1. COUNT invoices by status (draft, sent, paid, overdue)
  // 2. SUM revenue (from timesheets * hourly rates, month-to-date)
  // 3. Calculate target (if exists)
  // 4. Status: green if on track, red if behind
  //
  // Return: {
  //   invoices: { draft: 5, sent: 3, paid: 12, overdue: 1 },
  //   revenue: { mtd: 8500, target: 10000, status: 'warning' },
  //   revenuePercent: 85
  // }
});

// GET /api/financials/invoices?status=draft&limit=10
router.get('/financials/invoices', async (req, res) => {
  // Query invoices table by status
  // Return paginated invoice list
  // Return: Invoice[]
});

// GET /api/financials/xero-sync-status
router.get('/financials/xero-sync-status', async (req, res) => {
  // Query: SELECT * FROM xero_sync_log ORDER BY started_at DESC LIMIT 5
  // Return latest sync attempts with status and errors
  // Return: {
  //   lastSync: { type: 'activity_types', status: 'success', completedAt: '2026-01-23T14:30:00Z' },
  //   recentSyncs: [ ... ],
  //   nextScheduledSync: '2026-01-24T00:00:00Z'
  // }
});

// POST /api/financials/xero-sync (admin only)
router.post('/financials/xero-sync', requireAdmin, async (req, res) => {
  // Trigger manual sync with Xero
  // Create entry in xero_sync_log with status = 'pending'
  // Return immediately with sync ID
  // Actual sync happens in BullMQ job
  // Return: { syncId: 'uuid', status: 'pending' }
});

// GET /api/financials/xero-sync/:syncId
router.get('/financials/xero-sync/:syncId', async (req, res) => {
  // Check sync status
  // Return: { syncId, status, progress: 50, errors: [] }
});
```

#### Xero Integration (BullMQ Job)
```typescript
// src/jobs/xeroSyncJob.ts

export const xeroSyncQueue = new Queue('xero-sync', {
  connection: redis,
});

xeroSyncQueue.process('sync-activity-types', async (job) => {
  const logId = job.data.logId;
  
  try {
    // 1. Fetch from Xero API
    const xeroProducts = await xeroClient.getProducts();
    
    // 2. Map to activity_types table
    for (const product of xeroProducts) {
      const exists = await db.query(
        'SELECT id FROM activity_types WHERE xero_code = $1',
        [product.Code]
      );
      
      if (exists.rows.length > 0) {
        // Update if xero_managed = TRUE
        await db.query(
          'UPDATE activity_types SET name = $1, hourly_rate = $2, updated_at = NOW() WHERE id = $3 AND xero_managed = TRUE',
          [product.Name, product.UnitAmount, exists.rows[0].id]
        );
      } else {
        // Create new
        await db.query(
          'INSERT INTO activity_types (name, hourly_rate, xero_code, xero_managed) VALUES ($1, $2, $3, TRUE)',
          [product.Name, product.UnitAmount, product.Code]
        );
      }
    }
    
    // 3. Log success
    await db.query(
      'UPDATE xero_sync_log SET status = $1, completed_at = NOW(), records_processed = $2 WHERE id = $3',
      ['success', xeroProducts.length, logId]
    );
    
    return { synced: xeroProducts.length };
  } catch (error) {
    // Log error
    await db.query(
      'UPDATE xero_sync_log SET status = $1, error_message = $2, completed_at = NOW() WHERE id = $3',
      ['error', error.message, logId]
    );
    throw error;
  }
});

// Trigger from Express route:
// await xeroSyncQueue.add('sync-activity-types', { logId }, { attempts: 3 });
```

---

## 🔧 Implementation Order

### Backend Development Sequence
1. **Create Activity Types tables & RLS** (30 min)
   - SQL migrations
   - RLS policies (read all, write admin only)

2. **Create Activity Types routes** (45 min)
   - GET /api/activity-types (list)
   - GET /api/activity-types/:id (detail)
   - POST /api/activity-types (create, admin)
   - PUT /api/activity-types/:id (update, admin)
   - DELETE /api/activity-types/:id (delete, admin)
   - POST /api/activity-types/bulk-import (CSV upload)

3. **Create Dashboard tables & routes** (1 hour)
   - CREATE activity_log table
   - Create GET /api/dashboard/stats
   - Create GET /api/dashboard/activity-feed
   - Implement logging helper (call from other routes)

4. **Create Financial tables & routes** (1 hour)
   - CREATE xero_sync_log table
   - GET /api/financials/summary
   - GET /api/financials/invoices
   - GET /api/financials/xero-sync-status
   - POST /api/financials/xero-sync (trigger job)

5. **Implement Xero sync jobs** (1.5 hours)
   - Setup BullMQ queue
   - Create xeroSyncJob for activity types
   - Test job processing
   - Add error handling and retries

6. **Testing & Documentation** (1 hour)
   - Test all endpoints with Postman
   - Document in swagger/OpenAPI
   - Add error cases

---

## 🔌 Database Design Notes

**Activity Types**
- Should have unique constraint on (name, organization_id) when org support added
- xero_code should be unique across all activity types
- enabled flag allows soft-delete without losing history

**Activity Log**
- Keep denormalized (no joins) for performance
- created_at index critical for feed queries
- Consider archiving old entries (>1 year) later
- Use JSON for flexible details (don't normalize)

**Xero Sync Log**
- Track all sync attempts for audit trail
- Include record count and error details
- Schedule daily syncs via cron job (not in scope for Phase 5)

---

## 🔗 Integration Points

**From Phase 4 (Timesheets):**
- When timesheet status changes: Call `logActivity()`
- Example: Timesheet submitted → Insert into activity_log

**From Clients/Projects:**
- When project created/updated: Call `logActivity()`
- Activity log aggregates all system events

**Xero API:**
- Use existing Xero client library
- Get Products/Services for activity type sync
- Handle Xero API rate limits

---

## ✅ Acceptance Criteria

### Activity Types
- [ ] Can create activity type with all fields
- [ ] Can edit activity type (admin only)
- [ ] Can delete activity type (sets enabled = false)
- [ ] Can bulk import CSV
- [ ] Bulk import validates and reports errors
- [ ] All endpoints require proper authorization
- [ ] Unique constraint on name prevents duplicates
- [ ] Rate must be >= 0

### Dashboard Stats
- [ ] Returns correct job counts
- [ ] Returns correct completion counts
- [ ] Returns correct pending approval counts
- [ ] Returns correct revenue calculations
- [ ] Different users see appropriate data (role-based)
- [ ] Performance: queries complete in <100ms

### Activity Feed
- [ ] Returns activity in reverse chronological order
- [ ] Pagination works (limit, offset)
- [ ] Can fetch user-specific activities
- [ ] Contains resource details (not just IDs)
- [ ] Performance: queries complete in <200ms

### Financial Summary
- [ ] Invoice counts are accurate
- [ ] Revenue calculation is correct (sum of timesheet hours * rates)
- [ ] Status indicator shows correct color
- [ ] Response includes all required fields

### Xero Sync
- [ ] Can trigger manual sync
- [ ] Sync log records created
- [ ] Activity types synced from Xero Products
- [ ] Errors captured and reported
- [ ] No data loss on sync failures

---

## 📝 Notes for Frontend Developer

Frontend will call these endpoints:
```
GET  /api/dashboard/stats
GET  /api/dashboard/activity-feed?limit=20&offset=0

GET  /api/activity-types
POST /api/activity-types
PUT  /api/activity-types/:id
DELETE /api/activity-types/:id
POST /api/activity-types/bulk-import

GET  /api/financials/summary
GET  /api/financials/invoices?status=draft
GET  /api/financials/xero-sync-status
POST /api/financials/xero-sync
```

**Provide type definitions** for all response objects so frontend can use them in TypeScript.

---

## 🚀 Ready to Start?

1. Create SQL migration file for activity_types table
2. Create SQL migration file for activity_log table
3. Create SQL migration file for xero_sync_log table
4. Create Express routes file: `src/routes/activityTypes.ts`
5. Create Express routes file: `src/routes/dashboard.ts`
6. Create Express routes file: `src/routes/financials.ts`
7. Test endpoints with curl/Postman
8. Coordinate with frontend on type definitions

**Questions?** Check Phase 4 backend handoff for patterns (similar structure).
