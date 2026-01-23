# 🎯 Phase 4 Mission Brief: Timesheets Module

**Phase:** 4 of 7  
**Duration:** 4-6 hours  
**Target Completion:** January 23, 2026  
**Owner:** Frontend Developer  
**Lead PM:** GitHub Copilot

---

## 🎯 Mission Objective

Implement a comprehensive **Timesheets Module** with timesheet entry, tracking, and approval workflow. Support technicians logging hours against projects/cost centers, managers approving submissions, and status tracking through the invoicing cycle.

**Success Criteria:**
- [ ] Timesheets page with table view showing all timesheets
- [ ] Timesheet entry form with activity type selector
- [ ] Workflow states: Draft → Submitted → Approved → Invoiced
- [ ] Filters: date range, project, status, technician (for managers)
- [ ] Manager approval interface
- [ ] Real-time Supabase integration with RLS policies
- [ ] TypeScript validation with zod
- [ ] Responsive UI (desktop table, mobile cards)
- [ ] All routes integrated in `App.tsx`
- [ ] Zero TypeScript errors
- [ ] Build passes with no warnings

---

## 📋 Technical Specifications

### Database Schema (Supabase)
```sql
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  activity_type_id UUID REFERENCES activity_types(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  hours DECIMAL(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'invoiced')),
  notes TEXT,
  submitted_at TIMESTAMP,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  invoiced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- RLS: Users can see their own timesheets + managers can see team timesheets
-- Indexes: user_id, project_id, status, entry_date, created_at
```

### Supporting Tables (Create if not exist)

#### Activity Types
```sql
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_rate DECIMAL(10, 2),
  xero_item_id TEXT,
  xero_item_code TEXT,
  xero_tax_type TEXT,
  managed_by_xero BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### Cost Centers (Partial - for reference)
```sql
CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget DECIMAL(12, 2),
  customer_po_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### File Structure
```
src/
├── components/
│   ├── TimesheetsPage.tsx           (main page)
│   ├── TimesheetTable.tsx           (table view)
│   ├── TimesheetCard.tsx            (mobile card)
│   ├── TimesheetModal.tsx           (entry/edit form)
│   ├── TimesheetFilters.tsx         (filters sidebar)
│   ├── ActivityTypeSelector.tsx    (activity type picker)
│   └── ApprovalModal.tsx            (manager approval UI)
├── hooks/
│   ├── useTimesheets.ts             (CRUD queries)
│   ├── useActivityTypes.ts          (activity types queries)
│   └── useCostCenters.ts            (cost centers queries)
├── lib/
│   └── validators/
│       ├── timesheets.ts            (zod schemas)
│       ├── activityTypes.ts         (zod schemas)
│       └── costCenters.ts           (zod schemas)
└── types/
    └── index.ts                     (Timesheet, ActivityType, CostCenter types)
```

---

## 🔑 Key Features

### 1. **TimesheetsPage Component**
- [ ] Main container with table view (default)
- [ ] TimesheetFilters sidebar:
  - Date range picker (entry_date)
  - Project filter (dropdown)
  - Status filter (All, Draft, Submitted, Approved, Invoiced)
  - Technician filter (managers only - shows all team members)
- [ ] "Add Timesheet" button → opens TimesheetModal
- [ ] Role-based actions:
  - Technicians: Can create, edit drafts, submit
  - Managers: Can approve submitted timesheets, view all team timesheets
  - Admins: Full access

### 2. **TimesheetTable Component** (Desktop)
- [ ] Columns: Date | Project | Activity Type | Hours | Status | Actions
- [ ] Sortable headers (entry_date, hours, status)
- [ ] Status badges:
  - Draft: Gray
  - Submitted: Blue
  - Approved: Green
  - Invoiced: Purple
- [ ] Row actions:
  - Edit (draft only)
  - Submit (draft → submitted)
  - Approve (submitted → approved, managers only)
  - Delete (draft only)
- [ ] Pagination (10 items per page)
- [ ] Responsive: hide Cost Center/Notes on mobile

### 3. **TimesheetModal Component** (Entry Form)
Multi-step or single form (your choice):
- [ ] **Step 1: Basic Info**
  - Entry date picker (default: today)
  - Project selector (dropdown of active projects)
  - Cost center selector (optional, filters by selected project)
- [ ] **Step 2: Work Details**
  - Activity type selector (card grid or dropdown)
  - Hours input (decimal, 0.25 increments)
  - Notes (textarea)
- [ ] **Actions:**
  - Save as Draft
  - Submit for Approval (changes status to 'submitted')
  - Cancel

### 4. **ActivityTypeSelector Component**
- [ ] Card grid layout with icons (if available)
- [ ] Shows: Activity name, default rate (optional)
- [ ] Click to select (highlight selected)
- [ ] Used in TimesheetModal

### 5. **ApprovalModal Component** (Manager Only)
- [ ] Shows submitted timesheet details:
  - Technician name
  - Project + Cost center
  - Activity type
  - Date + Hours
  - Notes
- [ ] Actions:
  - Approve (status → 'approved', set approved_by + approved_at)
  - Reject (return to draft? or just close)
  - Add approval notes (optional)

### 6. **TimesheetFilters Component**
- [ ] Date range picker (from/to)
- [ ] Project dropdown (searchable)
- [ ] Status multi-select
- [ ] Technician dropdown (managers only)
- [ ] "Clear Filters" button

---

## 🗂️ TypeScript Types

### Timesheet Type
```typescript
export interface Timesheet {
  id: string
  user_id: string
  project_id: string
  cost_center_id?: string | null
  activity_type_id: string
  entry_date: string // ISO date
  hours: number
  status: 'draft' | 'submitted' | 'approved' | 'invoiced'
  notes?: string | null
  submitted_at?: string | null
  submitted_by?: string | null
  approved_at?: string | null
  approved_by?: string | null
  invoiced_at?: string | null
  created_at: string
  updated_at: string
  
  // Joined data (from queries with select joins)
  project?: Project
  cost_center?: CostCenter
  activity_type?: ActivityType
  user?: { id: string; email: string; full_name: string }
}

export interface TimesheetFormData {
  project_id: string
  cost_center_id?: string
  activity_type_id: string
  entry_date: string
  hours: number
  notes?: string
}

export interface TimesheetFilters {
  startDate?: string
  endDate?: string
  projectId?: string
  status?: ('draft' | 'submitted' | 'approved' | 'invoiced')[]
  userId?: string // For manager filtering by technician
}
```

### ActivityType Type
```typescript
export interface ActivityType {
  id: string
  user_id: string
  name: string
  default_rate?: number | null
  xero_item_id?: string | null
  xero_item_code?: string | null
  xero_tax_type?: string | null
  managed_by_xero: boolean
  created_at: string
  updated_at: string
}

export interface ActivityTypeFormData {
  name: string
  default_rate?: number
  xero_item_id?: string
  xero_item_code?: string
  xero_tax_type?: string
  managed_by_xero?: boolean
}
```

### CostCenter Type
```typescript
export interface CostCenter {
  id: string
  user_id: string
  project_id: string
  name: string
  budget?: number | null
  customer_po_number?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  
  // Joined data
  project?: Project
}

export interface CostCenterFormData {
  project_id: string
  name: string
  budget?: number
  customer_po_number?: string
  notes?: string
}
```

---

## 🔒 RLS Policies

### Timesheets Table
```sql
-- Users can select their own timesheets
CREATE POLICY timesheets_select_own ON timesheets FOR SELECT USING (
  auth.uid() = user_id
);

-- Managers can select team timesheets (if role = 'manager' or 'admin')
CREATE POLICY timesheets_select_as_manager ON timesheets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin')
  )
);

-- Users can insert their own timesheets
CREATE POLICY timesheets_insert_own ON timesheets FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Users can update their own draft timesheets
CREATE POLICY timesheets_update_own_draft ON timesheets FOR UPDATE USING (
  auth.uid() = user_id AND status = 'draft'
) WITH CHECK (
  auth.uid() = user_id
);

-- Managers can update submitted timesheets (for approval)
CREATE POLICY timesheets_update_as_manager ON timesheets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin')
  ) AND status = 'submitted'
) WITH CHECK (true);

-- Users can delete their own draft timesheets
CREATE POLICY timesheets_delete_own_draft ON timesheets FOR DELETE USING (
  auth.uid() = user_id AND status = 'draft'
);
```

### Activity Types Table
```sql
-- All authenticated users can read activity types
CREATE POLICY activity_types_select_authenticated ON activity_types FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Only admins can insert/update/delete activity types
CREATE POLICY activity_types_insert_admin ON activity_types FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY activity_types_update_admin ON activity_types FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY activity_types_delete_admin ON activity_types FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
```

### Cost Centers Table
```sql
-- Users can select cost centers for their own projects
CREATE POLICY cost_centers_select_own ON cost_centers FOR SELECT USING (
  auth.uid() = user_id
);

-- Users can insert cost centers for their own projects
CREATE POLICY cost_centers_insert_own ON cost_centers FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Users can update their own cost centers
CREATE POLICY cost_centers_update_own ON cost_centers FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- Users can delete their own cost centers
CREATE POLICY cost_centers_delete_own ON cost_centers FOR DELETE USING (
  auth.uid() = user_id
);
```

---

## 🧪 Validation Schemas (Zod)

### Timesheet Validator
```typescript
// src/lib/validators/timesheets.ts
import { z } from 'zod'

export const timesheetSchema = z.object({
  project_id: z.string().uuid('Invalid project'),
  cost_center_id: z.string().uuid().optional().nullable(),
  activity_type_id: z.string().uuid('Activity type is required'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  hours: z.number()
    .min(0.25, 'Minimum 0.25 hours (15 minutes)')
    .max(24, 'Cannot exceed 24 hours per day')
    .refine((val) => val % 0.25 === 0, 'Hours must be in 0.25 increments'),
  notes: z.string().max(500).optional()
})

export type TimesheetFormData = z.infer<typeof timesheetSchema>
```

### ActivityType Validator
```typescript
// src/lib/validators/activityTypes.ts
import { z } from 'zod'

export const activityTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  default_rate: z.number().min(0).optional(),
  xero_item_id: z.string().max(50).optional(),
  xero_item_code: z.string().max(50).optional(),
  xero_tax_type: z.string().max(50).optional(),
  managed_by_xero: z.boolean().optional()
})

export type ActivityTypeFormData = z.infer<typeof activityTypeSchema>
```

### CostCenter Validator
```typescript
// src/lib/validators/costCenters.ts
import { z } from 'zod'

export const costCenterSchema = z.object({
  project_id: z.string().uuid('Invalid project'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  budget: z.number().min(0).optional(),
  customer_po_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional()
})

export type CostCenterFormData = z.infer<typeof costCenterSchema>
```

---

## 🎨 UI/UX Guidelines

### Status Colors
- **Draft**: `bg-gray-500/10 text-gray-400`
- **Submitted**: `bg-blue-500/10 text-blue-400`
- **Approved**: `bg-green-500/10 text-green-400`
- **Invoiced**: `bg-purple-500/10 text-purple-400`

### Workflow Rules
1. **Technicians can:**
   - Create drafts
   - Edit their own drafts
   - Submit drafts (status → submitted)
   - View their own timesheets (all statuses)

2. **Managers can:**
   - View all team timesheets
   - Approve submitted timesheets (status → approved)
   - Edit any timesheet if needed
   - Delete drafts

3. **Admins can:**
   - All of the above
   - Mark timesheets as invoiced (status → invoiced)
   - Delete any timesheet

### Empty States
- **No timesheets:** "No timesheets yet. Click 'Add Timesheet' to get started."
- **No submitted timesheets (manager):** "No pending approvals at the moment."
- **Filtered results empty:** "No timesheets match your filters."

---

## 🚀 Implementation Steps

### Step 1: Database Setup (30 min)
- [ ] Create migration: `supabase/migrations/20260123_create_timesheets_tables.sql`
- [ ] Add timesheets, activity_types, cost_centers tables
- [ ] Add RLS policies
- [ ] Add indexes
- [ ] Test migration locally

### Step 2: TypeScript Types & Validators (20 min)
- [ ] Add types to `src/types/index.ts`
- [ ] Create validators in `src/lib/validators/`
- [ ] Export all types and validators

### Step 3: Data Hooks (1 hour)
- [ ] `useTimesheets.ts` (fetch, create, update, delete, submit, approve)
- [ ] `useActivityTypes.ts` (fetch, create, update, delete)
- [ ] `useCostCenters.ts` (fetch, create, update, delete)

### Step 4: UI Components (2-3 hours)
- [ ] TimesheetsPage.tsx
- [ ] TimesheetTable.tsx
- [ ] TimesheetModal.tsx (entry form)
- [ ] TimesheetFilters.tsx
- [ ] ActivityTypeSelector.tsx
- [ ] ApprovalModal.tsx (managers)

### Step 5: Integration & Testing (30 min)
- [ ] Add route to `App.tsx`: `/app/timesheets`
- [ ] Add navigation link in Sidebar
- [ ] Test all CRUD operations
- [ ] Test workflow (draft → submit → approve)
- [ ] Test filters
- [ ] Verify RLS policies work

### Step 6: Polish & Edge Cases (30 min)
- [ ] Loading states
- [ ] Error handling
- [ ] Form validation messages
- [ ] Empty states
- [ ] Responsive design
- [ ] Confirmation dialogs (delete, submit, approve)

---

## ✅ Acceptance Criteria

**Functionality:**
- [ ] Technicians can create, edit, and submit timesheets
- [ ] Managers can view team timesheets and approve submissions
- [ ] Status workflow operates correctly (draft → submitted → approved → invoiced)
- [ ] Filters work (date range, project, status, technician)
- [ ] Hours validation enforces 0.25 increments, 0.25-24 range
- [ ] RLS policies prevent unauthorized access

**UI/UX:**
- [ ] Table view shows all relevant columns
- [ ] Status badges are color-coded and clear
- [ ] Forms have clear validation messages
- [ ] Empty states provide helpful guidance
- [ ] Responsive on mobile and desktop

**Code Quality:**
- [ ] Zero TypeScript errors
- [ ] Build passes without warnings
- [ ] All components use proper types
- [ ] Zod schemas validate all inputs
- [ ] Code follows existing patterns from Clients/Projects modules

---

## 📦 Dependencies

**New Packages (if needed):**
- None (use existing packages)

**Existing Packages:**
- `@supabase/supabase-js` (database)
- `react-hook-form` (forms)
- `zod` (validation)
- `react-router-dom` (routing)
- `tailwindcss` (styling)

---

## 🔗 References

- **Phase 2 Clients Module:** See `src/components/ClientsPage.tsx` for patterns
- **Phase 3 Projects Module:** See `src/components/ProjectsPage.tsx` for Kanban example
- **Manifest:** `.project/manifest.json` (dataSchema → timesheets, activity_types, cost_centers)
- **Timeline:** `.project/timeline.md`

---

## 🎯 Handoff Protocol

**Mission Start:**
1. Read this mission brief in full
2. Create migration file with all tables + RLS policies
3. Run migration: `npx supabase migration up`
4. Implement hooks first (data layer)
5. Build UI components (presentation layer)
6. Test end-to-end workflow
7. Create completion report

**Mission Complete:**
1. Update `.project/manifest.json` → Feature 6 status: COMPLETED
2. Update `.project/timeline.md` → Phase 4: COMPLETED
3. Create `.project/memory/phase4_completion_report.md`
4. Signal ready for Phase 5

---

**Agent:** Frontend Developer  
**Next Phase:** Phase 5 - Dashboard & Activity Types  
**Good luck! 🚀**
