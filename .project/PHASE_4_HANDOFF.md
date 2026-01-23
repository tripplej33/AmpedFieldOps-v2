# 📋 PHASE 4 HANDOFF - Timesheets Module

**Date:** January 22, 2026  
**From:** Lead PM (GitHub Copilot)  
**To:** Frontend Developer  
**Status:** 🟢 READY TO START  

---

## 📊 Context Summary

✅ **Phase 1 (Foundation)** → Completed  
✅ **Phase 2 (Clients Module)** → Completed  
✅ **Phase 3 (Projects Module)** → Completed  
🚀 **Phase 4 (Timesheets Module)** → NOW STARTING

---

## 🎯 Your Mission

Build the **Timesheets Module** — a comprehensive timesheet tracking system with:
- Timesheet entry with activity type selection
- Workflow states: Draft → Submitted → Approved → Invoiced
- Manager approval interface
- Filters by date, project, status, technician
- RLS-enforced role-based permissions
- Responsive UI (desktop table, mobile cards)

**Target Duration:** 4-6 hours  
**Target Completion:** January 23, 2026

---

## 📚 Documentation

1. **Full Mission Brief:** Read [`.project/memory/phase4_mission_brief.md`](.project/memory/phase4_mission_brief.md)
2. **Tech Stack Reference:** Check `.project/manifest.json` (dataSchema → timesheets, activity_types, cost_centers)
3. **Timeline:** See `.project/timeline.md`
4. **Phase 3 Example:** Reference Projects Module for patterns (KanbanBoard, filters, modals)

---

## 🔑 Key Deliverables

### Database Tables (Create First)
```
supabase/migrations/20260123_create_timesheets_tables.sql
├── timesheets table
├── activity_types table  
├── cost_centers table
└── RLS policies for all three
```

### Frontend Files to Create
```
src/
├── components/
│   ├── TimesheetsPage.tsx         (main container)
│   ├── TimesheetTable.tsx         (table view)
│   ├── TimesheetCard.tsx          (mobile card)
│   ├── TimesheetModal.tsx         (entry/edit form)
│   ├── TimesheetFilters.tsx       (filters sidebar)
│   ├── ActivityTypeSelector.tsx   (activity picker)
│   └── ApprovalModal.tsx          (manager approval)
├── hooks/
│   ├── useTimesheets.ts           (CRUD + workflow)
│   ├── useActivityTypes.ts        (CRUD)
│   └── useCostCenters.ts          (CRUD)
├── lib/validators/
│   ├── timesheets.ts              (zod schemas)
│   ├── activityTypes.ts           (zod schemas)
│   └── costCenters.ts             (zod schemas)
└── types/
    └── index.ts                   (add Timesheet, ActivityType, CostCenter)
```

### Routes to Add
```typescript
// In App.tsx
<Route path="/app/timesheets" element={<TimesheetsPage />} />
```

### Navigation Link
```tsx
// In Sidebar.tsx
<NavLink to="/app/timesheets">Timesheets</NavLink>
```

---

## 🎨 Key Features Checklist

### [ ] Timesheet CRUD
- [ ] Create new timesheet (draft status)
- [ ] Edit draft timesheets
- [ ] Submit for approval (draft → submitted)
- [ ] Delete draft timesheets
- [ ] View all timesheets (filtered by user role)

### [ ] Manager Approval Workflow
- [ ] View submitted timesheets
- [ ] Approve timesheets (submitted → approved)
- [ ] Set approved_by and approved_at fields
- [ ] Filter to see only pending approvals

### [ ] Activity Types Management
- [ ] Seed with default activity types (Labor, Materials, Equipment, Travel, etc.)
- [ ] CRUD for activity types (admin only)
- [ ] Display in selector for timesheet entry

### [ ] Cost Centers Integration
- [ ] Link timesheets to cost centers (optional)
- [ ] Filter cost centers by selected project
- [ ] Display cost center budget info

### [ ] Filters
- [ ] Date range (entry_date)
- [ ] Project selector
- [ ] Status multi-select (Draft, Submitted, Approved, Invoiced)
- [ ] Technician selector (managers/admins only)

### [ ] Validation
- [ ] Hours: 0.25-24.00 in 0.25 increments
- [ ] Entry date required
- [ ] Project required
- [ ] Activity type required
- [ ] Notes max 500 chars

---

## 🔒 Security & Permissions

### Role-Based Access

**Technician:**
- Can create, edit, delete own drafts
- Can submit own drafts
- Can view own timesheets (all statuses)

**Manager:**
- All technician permissions
- Can view all team timesheets
- Can approve submitted timesheets
- Can filter by technician

**Admin:**
- All manager permissions
- Can mark timesheets as invoiced
- Can delete any timesheet
- Can manage activity types

---

## 🧪 Testing Checklist

### Workflow Tests
- [ ] Create draft → Edit → Save
- [ ] Submit draft → Status changes to submitted
- [ ] Manager approves submitted → Status changes to approved
- [ ] Cannot edit submitted/approved timesheets
- [ ] Can delete drafts only

### RLS Tests
- [ ] Technician can only see own timesheets
- [ ] Manager can see team timesheets
- [ ] Admin can see all timesheets
- [ ] Cannot approve own timesheets (optional validation)

### UI Tests
- [ ] Table sorts correctly
- [ ] Filters apply correctly
- [ ] Empty states show helpful messages
- [ ] Status badges show correct colors
- [ ] Forms validate inputs
- [ ] Loading states display during async ops

---

## 📐 Design Patterns

Follow the existing patterns from Phases 2-3:

### Table Component Pattern
```typescript
// Similar to ClientTable.tsx and ProjectTable.tsx
interface TimesheetTableProps {
  timesheets: Timesheet[]
  onEdit: (timesheet: Timesheet) => void
  onDelete: (id: string) => void
  onSubmit: (id: string) => void
  onApprove?: (id: string) => void // Managers only
  isLoading?: boolean
}
```

### Hook Pattern
```typescript
// Similar to useClients.ts and useProjects.ts
export function useTimesheets(filters?: TimesheetFilters, page: number = 1) {
  const { user } = useAuth()
  const [data, setData] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  
  // Fetch logic with filters and pagination
  // ...
}

export function useSubmitTimesheet() {
  // Mutation logic for submit action
}

export function useApproveTimesheet() {
  // Mutation logic for approve action (managers)
}
```

### Modal Pattern
```typescript
// Similar to ProjectModal.tsx
interface TimesheetModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TimesheetFormData) => Promise<void>
  timesheet?: Timesheet // For editing
  isLoading?: boolean
}
```

---

## 🎯 Success Metrics

**Code Quality:**
- Zero TypeScript errors
- Build passes without warnings
- All functions properly typed
- Zod schemas validate all inputs

**Functionality:**
- All CRUD operations work
- Workflow transitions operate correctly
- RLS policies enforce permissions
- Filters apply correctly

**UX:**
- Forms have clear validation messages
- Loading states show during async operations
- Empty states provide helpful guidance
- Status badges are color-coded and intuitive

---

## 🚀 Start Instructions

### Step 0: Read the Progress Protocol ⚠️ MANDATORY
```bash
# FIRST: Read this file to understand logging requirements
.project/AGENT_PROGRESS_PROTOCOL.md
```

**YOU MUST UPDATE YOUR LOG FILE after completing each major task.**

### Step 1: Update Your Progress Log
```bash
# Open your log file:
.project/agent_logs/frontend_developer.log.md

# Mark current task as IN_PROGRESS:
## Current Task
**Task:** Phase 4 - Timesheets Module - Database Setup
**Status:** IN_PROGRESS
**Started:** {current timestamp}
**Phase:** Phase 4
**Related Files:** supabase/migrations/...
```

### Step 2: Read the Full Brief
```bash
# Open and read:
.project/memory/phase4_mission_brief.md
```

### Step 2: Create Migration
```bash
# Create file:
supabase/migrations/20260123_create_timesheets_tables.sql

# See mission brief for full SQL schema
```

### Step 3: Run Migration
```bash
npx supabase migration up
```

### Step 4: Implement Data Layer
- Create hooks in `src/hooks/`
- Create validators in `src/lib/validators/`
- Add types to `src/types/index.ts`

### Step 5: Build UI Components
- Start with TimesheetsPage container
- Build TimesheetTable for data display
- Create TimesheetModal for entry/edit
- Add filters and workflow buttons

### Step 6: Test & Polish
- Test all workflows
- Verify RLS policies
- Add loading states
- Implement empty states
- **UPDATE YOUR LOG:** Mark tasks complete, list files changed, document test results

---

## 📝 Completion Checklist

When you're done:
- [ ] All files created and implemented
- [ ] Migration applied successfully
- [ ] All CRUD operations tested
- [ ] Workflow tested (draft → submit → approve)
- [ ] RLS policies verified
- [ ] No TypeScript errors
- [ ] Build passes
- [ ] Routes added to App.tsx
- [ ] Navigation link added to Sidebar
- [ ] **UPDATE YOUR PROGRESS LOG:** `.project/agent_logs/frontend_developer.log.md`
  - Mark task as COMPLETED
  - List all files changed
  - Document tests performed
  - Note any blockers or deviations
- [ ] **UPDATE MANIFEST:** `.project/manifest.json`
  - Feature 6 status → COMPLETED
  - Add completedBy and completedAt fields
- [ ] Update timeline: Phase 4 → COMPLETED
- [ ] Create completion report: `.project/memory/phase4_completion_report.md`

**⚠️ MANDATORY: Read and follow `.project/AGENT_PROGRESS_PROTOCOL.md` for logging requirements**

---

## 🔄 Context Wipe Protocol

**To start this phase:**
> "I'm the Frontend Developer. Start Phase 4 - Timesheets Module per `.project/PHASE_4_HANDOFF.md`"

**On completion:**
> "Phase 4 complete. Ready for Phase 5 handoff."

---

**Good luck! Let's build an amazing timesheet tracking system! 🚀**
