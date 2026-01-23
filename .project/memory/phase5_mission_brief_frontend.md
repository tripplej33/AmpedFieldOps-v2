# Phase 5 Mission Brief - Frontend: Operations & Scheduling
*Date: January 23, 2026*

## 🎯 Mission Objective
Build the **Operations & Scheduling Hub** — a comprehensive dashboard and management system for viewing field operations, managing activity types, and visualizing financials.

**Target Duration:** 6-8 hours  
**Target Completion:** January 24, 2026  
**Priority:** P1

---

## 📋 What You're Building

### 1. **Operations Dashboard** (4-5 hours)
Main hub showing real-time operations status with role-based content.

#### UI Components
- **Stat Cards:** Total jobs, completed today, pending approvals, revenue today
- **Activity Feed:** Recent timesheet submissions, approvals, project updates (live stream)
- **Quick Filters:** Date range, project, technician, status
- **Role-Based Views:**
  - **Admin/Manager:** All operations, all team members
  - **Technician:** Personal schedule, my jobs, my timesheets
  - **Accountant:** Invoice pipeline, approval pending items

#### Key Deliverables
```typescript
// src/pages/DashboardPage.tsx
- Layout with stat cards (top)
- Activity feed (main content area)
- Quick action buttons (New job, New timesheet, etc.)
- Real-time refresh (5s polling or WebSocket when ready)
- Role-based visibility for sensitive data

// src/components/DashboardCard.tsx
- Stat card with icon, label, value, trend
- Color coding (green=good, red=alert, blue=neutral)

// src/components/ActivityFeed.tsx
- Timeline view of recent actions
- Activity type icons (timesheet, approval, update)
- Clickable to navigate to detail pages
- Pagination (load more)

// src/hooks/useDashboard.ts
- fetchDashboardStats()
- fetchActivityFeed()
- Real-time subscription (later)
```

**Database Queries Needed (from Backend):**
- `GET /api/dashboard/stats` → { totalJobs, completedToday, pendingApprovals, revenueToday }
- `GET /api/dashboard/activity-feed?limit=20&offset=0` → Activity items with timestamps
- `GET /api/dashboard/technician-schedule?date=2026-01-24` → Today's jobs for technician

---

### 2. **Activity Types Management** (2-3 hours)
Admin interface for managing activity types (service categories).

#### UI Components
- **Activity Types List:** Table with name, rate, Xero code, status, actions
- **Add/Edit Form:** Modal with fields (name, hourly rate, Xero mapping, enabled flag)
- **Bulk Import:** Upload CSV with activity types
- **Xero Integration:** Show sync status, last sync timestamp

#### Key Deliverables
```typescript
// src/pages/ActivityTypesPage.tsx
- Table view with CRUD actions
- Add new activity type button
- Bulk import button
- Filter by active/inactive
- Search by name

// src/components/ActivityTypeModal.tsx
- Form for create/edit
- Fields: name, hourly_rate, xero_code, enabled, description
- Validation (required fields, rate > 0)
- Save on submit

// src/hooks/useActivityTypes.ts
- fetchActivityTypes()
- createActivityType(data)
- updateActivityType(id, data)
- deleteActivityType(id)
- bulkImportActivityTypes(csvFile)

// src/lib/validators/activityTypes.ts
- Zod schema for validation
```

**Database Queries Needed:**
- `GET /api/activity-types` → All activity types
- `POST /api/activity-types` → Create new
- `PUT /api/activity-types/:id` → Update
- `DELETE /api/activity-types/:id` → Delete
- `POST /api/activity-types/bulk-import` → CSV upload

---

### 3. **Financials Dashboard** (1-2 hours)
Overview page showing financial status and Xero integration health.

#### UI Components
- **Invoice Pipeline:** Count of draft, sent, paid, overdue invoices
- **Revenue Tracker:** Month-to-date revenue, target, status
- **Xero Sync Status:** Last sync time, sync status, sync errors (if any)
- **Quick Actions:** Create invoice from timesheet, view Xero, sync now

#### Key Deliverables
```typescript
// src/pages/FinancialsPage.tsx
- Stat cards for invoice pipeline
- Revenue progress bar
- Xero sync status panel
- Recent invoices table
- Sync logs viewer

// src/components/XeroSyncStatus.tsx
- Shows last sync time
- Sync status (success/pending/error)
- Error messages if sync failed
- Manual sync button (requires admin)

// src/components/InvoicePipeline.tsx
- Breakdown of invoices by status
- Pie chart or bar chart visualization

// src/hooks/useFinancials.ts
- fetchFinancialsSummary()
- fetchInvoicePipeline()
- fetchXeroSyncStatus()
- triggerManualSync()
```

**Database Queries Needed:**
- `GET /api/financials/summary` → Revenue, invoice counts
- `GET /api/financials/invoices?status=draft` → Filtered invoices
- `GET /api/financials/xero-sync-status` → Sync info and logs

---

## 🔧 Implementation Order

### Frontend Development Sequence
1. **Setup Phase 5 types & hooks**
   - Add to `src/types/index.ts`: ActivityType, DashboardStats, FinancialsSummary
   - Create hook files in `src/hooks/`
   - Create validator files in `src/lib/validators/`

2. **Build Operations Dashboard** (easiest first, high impact)
   - Create DashboardPage.tsx
   - Create DashboardCard, ActivityFeed components
   - Implement useDashboard hook
   - Add route `/app/dashboard` (might already exist, update it)
   - Test with mock data

3. **Build Activity Types Management** (CRUD pattern you know)
   - Copy ClientsPage pattern
   - Create ActivityTypesPage, ActivityTypeModal, table
   - Implement useActivityTypes hook
   - Add route `/app/settings/activity-types`
   - Test CRUD operations

4. **Build Financials Dashboard** (easiest, builds on dashboard pattern)
   - Create FinancialsPage
   - Create XeroSyncStatus, InvoicePipeline components
   - Implement useFinancials hook
   - Add route `/app/financials`
   - Test with mock data

---

## 📊 Database Schema (Backend Creates These)

**Note:** Backend developer creates these tables. Frontend just queries them.

```sql
-- Activity Types (managed by admin)
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  hourly_rate DECIMAL(10,2) NOT NULL,
  description TEXT,
  xero_code TEXT,
  xero_managed BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Activity Feed (denormalized for performance)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'timesheet_submitted', 'timesheet_approved', 'job_created', etc.
  resource_type TEXT, -- 'timesheet', 'job', 'project', 'activity_type'
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 UI/UX Guidelines

**Colors:**
- Stat cards: Blue (total), Green (completed), Orange (pending), Red (urgent)
- Activity feed: Muted colors for old items, bright for new
- Charts: Teal primary, grays secondary

**Responsive Design:**
- Dashboard: Stat cards stack on mobile, responsive grid on desktop
- Tables: Convertible to cards on mobile (like ClientsPage pattern)
- Forms: Full-width inputs on mobile, split layout on desktop

---

## ✅ Acceptance Criteria

### Operations Dashboard
- [ ] Stat cards display correct values (matches API response)
- [ ] Activity feed loads and displays timeline
- [ ] Filters work (date range, project, technician)
- [ ] Role-based visibility works (test as different user roles)
- [ ] Mobile responsive (test on 375px width)
- [ ] No console errors or warnings
- [ ] Accessible (keyboard navigation, ARIA labels)

### Activity Types Management
- [ ] Can create new activity type
- [ ] Can edit existing activity type
- [ ] Can delete activity type (with confirmation)
- [ ] Can bulk import from CSV
- [ ] Search and filter works
- [ ] Form validation shows errors
- [ ] Xero mapping displays correctly
- [ ] Mobile responsive

### Financials Dashboard
- [ ] Invoice pipeline shows correct counts
- [ ] Revenue progress bar displays correctly
- [ ] Xero sync status shows (time, status, errors)
- [ ] Can trigger manual sync (if admin)
- [ ] Recent invoices table loads and displays
- [ ] Mobile responsive

---

## 🔗 API Dependencies

Backend needs to provide these endpoints:

```
GET  /api/dashboard/stats
POST /api/dashboard/refresh

GET  /api/dashboard/activity-feed?limit=20&offset=0

GET  /api/activity-types
POST /api/activity-types
PUT  /api/activity-types/:id
DELETE /api/activity-types/:id
POST /api/activity-types/bulk-import

GET  /api/financials/summary
GET  /api/financials/invoices?status=draft
GET  /api/financials/xero-sync-status
POST /api/financials/xero-sync (admin only)
```

---

## 📝 Notes for Backend Developer

- Activity Types table should have unique constraint on name
- Activity log should have index on created_at for efficient feed queries
- Dashboard stats should be efficient queries (consider caching)
- Xero sync status should be stored in a sync_log table

---

## 🚀 Ready to Start?

1. Wait for backend to create the three tables above
2. Wait for backend to create the 10+ API endpoints
3. Start with mock data while waiting (create `src/mocks/dashboardData.ts`)
4. Build DashboardPage first (highest visibility)
5. Follow the implementation order above

**Questions?** Check `.project/memory/phase4_mission_brief.md` for Phase 4 patterns (similar structure).
