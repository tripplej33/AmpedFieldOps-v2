# Phase 5 Mission Brief - Operations & Scheduling
*Date: January 23, 2026*
*Lead: GitHub Copilot (Project Orchestrator)*

## 🎯 Mission Overview

**Phase 5: Operations & Scheduling Hub**

Build a comprehensive operations management system with:
1. **Operations Dashboard** - Real-time operations status with activity feed
2. **Activity Types Management** - Admin CRUD for service categories (maps to Xero)
3. **Financials Dashboard** - Revenue tracking and Xero sync status

**Timeline:** January 23-24, 2026 (2 days)  
**Status:** READY TO START  
**Complexity:** Medium (combines patterns from Phases 2-4)

---

## 📊 Phase Context

### What's Complete (Phases 1-4)
✅ Foundation (Auth, Layout, Design System)
✅ Clients Module (Full CRUD)
✅ Projects Module (Table + Kanban, Status Workflow)
✅ Timesheets Module (Timesheet tracking with approval workflow)

### What Phase 5 Needs
- Role-based dashboard showing real-time operations status
- Admin interface for managing activity types (service types)
- Financial overview with Xero sync status
- Activity logging system (audit trail)
- Database tables and RLS policies

---

## 👥 Team Assignments

### Frontend Developer
**Duration:** 6-8 hours  
**Files:** [phase5_mission_brief_frontend.md](./phase5_mission_brief_frontend.md)

**Your Mission:**
1. Build Operations Dashboard (stat cards + activity feed)
2. Build Activity Types Management (admin CRUD interface)
3. Build Financials Dashboard (revenue tracking + Xero sync status)

**Deliverables:**
- DashboardPage.tsx, ActivityTypesPage.tsx, FinancialsPage.tsx
- Related components (DashboardCard, ActivityFeed, ActivityTypeModal, etc.)
- 3 custom hooks (useDashboard, useActivityTypes, useFinancials)
- 3 Zod validation schemas
- Type definitions for all entities

**Start with:** DashboardPage (highest visibility, enables quick feedback)

---

### Backend Developer
**Duration:** 6-8 hours  
**Files:** [phase5_mission_brief_backend.md](./phase5_mission_brief_backend.md)

**Your Mission:**
1. Create Activity Types table + RLS policies + CRUD routes
2. Create Activity Log table + routes (denormalized feed)
3. Create Xero Sync Log table + financial summary routes
4. Implement Xero sync job (BullMQ)

**Deliverables:**
- SQL migrations for 3 tables (activity_types, activity_log, xero_sync_log)
- Express routes (10+ endpoints)
- RLS policies for all tables
- BullMQ job for Xero syncing
- Type definitions for all API responses

**Start with:** Activity Types table + routes (reusable CRUD pattern)

---

## 🎯 Success Criteria

### Frontend
- [ ] Operations Dashboard loads without errors
- [ ] Activity feed displays 20 items, pagination works
- [ ] Stat cards show correct values from API
- [ ] Activity Types CRUD fully functional (create, read, update, delete)
- [ ] Can bulk import activity types from CSV
- [ ] Financials Dashboard shows revenue + invoice pipeline + Xero sync status
- [ ] All pages mobile-responsive
- [ ] No console errors or TypeScript issues
- [ ] Accessible (ARIA labels, keyboard nav)

### Backend
- [ ] Activity Types: Full CRUD working + unique constraints enforced
- [ ] Dashboard Stats: Returns correct aggregated data, optimized queries
- [ ] Activity Feed: Denormalized data, <200ms queries, pagination works
- [ ] Xero Sync: Can trigger manual sync, logs to xero_sync_log, handles errors
- [ ] RLS policies: All tables protected, auth checks working
- [ ] All endpoints return proper error responses (400, 401, 403, 500)
- [ ] Types exported for frontend consumption

---

## 📈 Implementation Flow

### Week Timeline
```
Wed Jan 23 (Today)
├─ 2:00 PM: Phase 5 briefing (this document)
├─ 2:30 PM: Backend starts Activity Types + Dashboard tables
├─ 3:00 PM: Frontend starts with mock data, builds DashboardPage skeleton
├─ 6:00 PM: Backend finishes routes, provides API contracts
└─ 7:00 PM: Frontend integrates with real API

Thu Jan 24
├─ Morning: Frontend finishes Dashboard + Activity Types UI
├─ Afternoon: Backend finishes Xero sync + Financial routes
├─ 3:00 PM: Full integration testing
└─ 5:00 PM: Phase 5 complete
```

---

## 🔗 Key Dependencies

**Frontend waits for:**
- Backend API endpoints to be defined
- Type definitions from backend responses
- Actual data (can use mocks until ready)

**Backend waits for:**
- Nothing (independent, can start immediately)

**Recommended parallel approach:**
1. Backend: Create tables + migrations
2. Frontend: Build UI with mock data
3. Backend: Create routes + API contracts
4. Frontend: Integrate with real API

---

## 📚 Reference Materials

### For Both
- `.project/manifest.json` - Tech stack and feature list
- `.project/timeline.md` - Full project timeline
- Phase 3 & 4 implementations - Code patterns to follow

### Frontend Specific
- [phase5_mission_brief_frontend.md](./phase5_mission_brief_frontend.md) - Detailed frontend mission
- Phase 2 (ClientsPage) - Table patterns
- Phase 3 (ProjectsPage) - Modal and wizard patterns
- Phase 4 (TimesheetsPage) - Workflow patterns

### Backend Specific
- [phase5_mission_brief_backend.md](./phase5_mission_brief_backend.md) - Detailed backend mission
- Phase 2 & 3 route patterns - Express.js examples
- Phase 4 database schema - Timesheet tables as template
- Xero SDK documentation - For API integration

---

## 🚀 How to Get Started

### For Frontend Developer
1. Read [phase5_mission_brief_frontend.md](./phase5_mission_brief_frontend.md) fully
2. Create src/types/phase5.ts with TypeScript interfaces
3. Create src/mocks/dashboardData.ts with sample data
4. Start building DashboardPage.tsx with mock data
5. Create skeleton components (DashboardCard, ActivityFeed)
6. Test responsive design and accessibility

### For Backend Developer
1. Read [phase5_mission_brief_backend.md](./phase5_mission_brief_backend.md) fully
2. Create supabase/migrations/20260123_phase5_tables.sql
   - Activity Types table
   - Activity Log table
   - Xero Sync Log table
3. Create src/routes/activityTypes.ts with all CRUD endpoints
4. Create src/routes/dashboard.ts with stats and feed endpoints
5. Create src/routes/financials.ts with summary endpoints
6. Setup BullMQ job for Xero sync
7. Test all endpoints with curl/Postman

---

## ❓ FAQ

**Q: Can I start before the backend is ready?**  
A: Yes! Use mock data. Frontend can build and test UI independently.

**Q: What if I need data from another table?**  
A: Check if it exists (clients, projects, jobs, timesheets). If not, create it.

**Q: Do I need to handle Xero API errors?**  
A: Yes, log them to xero_sync_log and show in UI.

**Q: How do I handle authorization?**  
A: Use RLS policies on database. Backend checks `auth.jwt()`. Frontend shows/hides based on user role.

**Q: Can I modify the schema?**  
A: Check manifest.json first. If changes needed, update orchestrator.

---

## 📞 Communication

- **Questions during build?** Check phase5_mission_brief_[frontend|backend].md
- **Blocked by other work?** Update orchestrator
- **Finding bugs?** Log in timeline.md under "Known Issues"

---

## ✅ Phase 5 Ready!

Both developers can start immediately. Frontend can work with mocks while backend creates infrastructure.

**Next Steps:**
1. Each developer reads their respective mission brief
2. Frontend creates mock data and builds DashboardPage skeleton
3. Backend creates tables and migrations
4. Coordinate API contract once backend has table structure
5. Frontend integrates with real API

**Expected Completion:** January 24, 2026 EOD

---

*Let's build it! Questions? Check the detailed mission briefs.*
