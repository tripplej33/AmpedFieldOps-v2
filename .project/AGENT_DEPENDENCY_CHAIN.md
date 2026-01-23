# Agent Dependency Chain & Phase Sequence

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Purpose:** Explicit dependency map showing which agent does what, when, and why

---

## Phase Sequence Overview

```
┌─────────────┐
│  Phase 1-3  │  COMPLETED
│  Frontend   │  Clients, Projects, Timesheets modules
└──────┬──────┘
       │ (Frontend hands off)
       ↓
┌─────────────┐
│  Phase 4+   │  CURRENT
│  Frontend   │  Polish, dashboards, file browser
└──────┬──────┘
       │ (Frontend hands off)
       ↓
┌─────────────┐
│  Phase 7+   │  PENDING
│  Backend    │  Xero API, service-role operations
└──────┬──────┘
       │ (Backend hands off)
       ↓
┌─────────────┐
│  Throughout │  PARALLEL
│  QA         │  Testing, bug reports, performance
└─────────────┘
```

---

## Detailed Agent Sequence

### **Phase 1: Foundation**

**Agent:** Frontend Developer  
**Duration:** ~2 days  
**Deliverables:**
- React + TypeScript setup
- Supabase Auth context
- Layout components (Sidebar, Header)
- UI component library (8 base components)
- Login/Signup pages
- Protected routes

**Hands Off To:** Frontend (Phase 2)  
**Blocks:** Everything else (foundation required)  
**Depends On:** PM (mission brief + tech stack approval)

**Log:** [frontend_developer.log.md](agent_logs/frontend_developer.log.md)  
**Mission Brief:** [phase1_mission_brief.md](memory/phase1_mission_brief.md)

---

### **Phase 2: Clients Module**

**Agent:** Frontend Developer  
**Duration:** ~1-2 days  
**Deliverables:**
- Clients CRUD (create, read, update, delete)
- ClientTable with pagination & filters
- ClientModal with form validation
- ClientFilters component
- React hooks for data fetching

**Depends On:** Phase 1 ✅ COMPLETED  
**Hands Off To:** Frontend (Phase 3)  
**Blocks:** Project module (depends on client data)

**Log:** [frontend_developer.log.md](agent_logs/frontend_developer.log.md)  
**Mission Brief:** [phase2_mission_brief.md](memory/phase2_mission_brief.md)

---

### **Phase 3: Projects Module**

**Agent:** Frontend Developer  
**Duration:** ~2-3 days  
**Deliverables:**
- Projects CRUD
- ProjectTable with sorting
- KanbanBoard component (drag-drop)
- ProjectModal with multi-step wizard
- ProjectFilters (status, client, date)
- Cost Centers management
- Kanban status workflow

**Depends On:** Phase 2 ✅ COMPLETED  
**Hands Off To:** Frontend (Phase 4)  
**Blocks:** Timesheets (project selection required)

**Log:** [frontend_developer.log.md](agent_logs/frontend_developer.log.md)  
**Mission Brief:** [phase3_mission_brief.md](memory/phase3_mission_brief.md)

---

### **Phase 4: Timesheets Module**

**Agent:** Frontend Developer  
**Duration:** ~2-3 days  
**Deliverables:**
- Timesheets CRUD
- TimesheetTable with status workflow
- TimesheetModal with time entry form
- TimesheetFilters (status, date, project)
- Approval workflow UI
- Status transitions (draft → submit → approve → invoice)

**Depends On:** Phase 3 ✅ COMPLETED (project selection)  
**Hands Off To:** Frontend (Phase 5)  
**Blocks:** Activity Types, Financials Dashboard

**Log:** [frontend_developer.log.md](agent_logs/frontend_developer.log.md)  
**Mission Brief:** [phase4_mission_brief.md](memory/phase4_mission_brief.md)

---

### **Phase 5: Polish & Features**

**Agent:** Frontend Developer  
**Duration:** ~3-4 days  
**Deliverables:**
- Dashboard with live metrics
- Activity Types management module
- Financials dashboard (Xero overview, read-only)
- File browser (Supabase Storage)
- Error boundaries
- Loading states
- Toast notifications
- Responsive design final pass

**Depends On:** Phase 4 ✅ COMPLETED  
**Hands Off To:** QA (regression testing)  
**Blocks:** Backend server (ready for real Xero API calls)

**Log:** [frontend_developer.log.md](agent_logs/frontend_developer.log.md)  
**Mission Brief:** [phase5_mission_brief.md](memory/phase5_mission_brief.md)

---

### **Phase 6: Frontend Testing & Handoff**

**Agent:** QA Engineer  
**Duration:** ~2 days  
**Deliverables:**
- Full regression test suite
- Performance audit (Lighthouse)
- Accessibility audit (WCAG 2.1 AA)
- Responsive design validation
- Browser compatibility (Chrome, Firefox, Safari)
- Bug reports (P0, P1, P2)

**Depends On:** Phase 5 ✅ COMPLETED  
**Hands Off To:** Backend Developer  
**Blocks:** Backend API development (needs correct UI to test against)

**Log:** [qa_engineer.log.md](agent_logs/qa_engineer.log.md)  
**Mission Brief:** [phase6_mission_brief.md](memory/phase6_mission_brief.md)

---

### **Phase 7: Backend Service API**

**Agent:** Backend Developer  
**Duration:** ~2-3 days  
**Deliverables:**
- Express.js server setup
- Service-role Supabase client (admin operations)
- Xero OAuth 2.0 authentication (stub)
- Stub endpoints for Xero sync
- BullMQ job queue setup
- Error handling & logging framework

**Depends On:** Phase 5 ✅ COMPLETED (frontend is done)  
**Hands Off To:** Backend (Phase 8)  
**Blocks:** Xero integration (needs server first)

**Log:** [backend_developer.log.md](agent_logs/backend_developer.log.md)  
**Mission Brief:** [phase7_mission_brief.md](memory/phase7_mission_brief.md)

---

### **Phase 8: Xero Integration (Full)**

**Agent:** Backend Developer  
**Duration:** ~4-5 days  
**Deliverables:**
- OAuth token refresh loop
- Contact/Client bidirectional sync
- Activity Types → Products mapping
- Invoice creation → Xero push
- Payment status polling
- Webhook handlers
- Error retry strategy
- Idempotency keys

**Depends On:** Phase 7 ✅ COMPLETED  
**Hands Off To:** QA (integration testing)  
**Blocks:** User acceptance testing (needs full Xero integration)

**Log:** [backend_developer.log.md](agent_logs/backend_developer.log.md)  
**Mission Brief:** [phase8_mission_brief.md](memory/phase8_mission_brief.md)

---

### **Phase 9: QA Integration Testing**

**Agent:** QA Engineer  
**Duration:** ~3 days  
**Deliverables:**
- End-to-end workflow testing
- Xero sandbox integration testing
- API endpoint testing
- Load testing (if applicable)
- UAT sign-off documentation

**Depends On:** Phase 8 ✅ COMPLETED  
**Hands Off To:** User (production deployment)  
**Blocks:** Nothing (final phase before launch)

**Log:** [qa_engineer.log.md](agent_logs/qa_engineer.log.md)  
**Mission Brief:** [phase9_mission_brief.md](memory/phase9_mission_brief.md)

---

## Parallel Tracks

### **QA Throughout (Continuous)**

QA Engineer runs in parallel with development:

- **During Phase 1-5 (Frontend):** Manual testing, Lighthouse, accessibility
- **During Phase 7-8 (Backend):** API endpoint testing, Xero sandbox
- **After each phase:** Regression suite, bug triage
- **Reports to:** PM (daily summaries in QA log)

**QA Doesn't Block:** Frontend/Backend development continues, but bugs are tracked  
**QA Logs:** [qa_engineer.log.md](agent_logs/qa_engineer.log.md)

---

## Blocker Rules

### **Frontend Cannot Start Phase X+1 If:**
- [ ] Phase X marked ✅ COMPLETED in previous agent's log
- [ ] All P0 bugs from Phase X fixed
- [ ] Previous agent's code merged to main
- [ ] Mission brief for Phase X+1 approved by PM

### **Backend Cannot Start Phase 7 If:**
- [ ] Phase 5 ✅ COMPLETED (frontend done)
- [ ] Frontend has ❌ No P0 bugs outstanding
- [ ] Service-role key available from PM
- [ ] Phase 7 mission brief approved

### **QA Cannot Approve If:**
- [ ] Any ⏸️ BLOCKED issues remain
- [ ] Lighthouse score < 85
- [ ] Any accessibility violations (WCAG 2.1 AA)
- [ ] > 3 P0 bugs outstanding

---

## Handoff Checklist

**From Agent A → Agent B:**

- [ ] Agent A's log marked ✅ COMPLETED
- [ ] All code pushed to main with clear commits
- [ ] Agent B's mission brief created & approved
- [ ] Blockers section of Agent A's log is empty
- [ ] Agent B has PM clarification on any INFERRED work
- [ ] Cross-references added (Agent A log → Agent B log)
- [ ] Next agent ready to start (confirmed by PM)

---

## Escalation Chain

```
Agent A (stuck in Phase X)
    ↓
Log ⏸️ BLOCKED entry with details
    ↓
Notify PM: "Blocked on [reason], see log"
    ↓
PM reviews agent_logs/[role].log.md
    ↓
PM decides:
  - Fix issue & unblock (PR review, provide credentials, etc.)
  - Workaround & document
  - Replanning (change approach, reduce scope, etc.)
    ↓
PM updates orchestrator.log.md with decision
    ↓
Agent notified & log updated with decision
    ↓
Work resumes or pivots
```

---

## Key Dependencies

| Dependency | Why | Impact If Missing |
|------------|-----|------------------|
| Phase 1 foundation | All UI built on top | Cannot start Phase 2-5 |
| Phase 2 Clients | Projects reference clients | Cannot implement Phase 3 |
| Phase 3 Projects | Timesheets assigned to projects | Cannot implement Phase 4 |
| Phase 4 Timesheets | All data collection done | Cannot build Phase 5 dashboards |
| Phase 5 Polish | Frontend stable before backend | Backend has moving target |
| Phase 7 Backend | Server needed for Xero API calls | Cannot implement Phase 8 |
| Xero credentials | Required for Phase 7+ development | Backend dev completely blocked |
| Service-role key | Required for admin operations | Backend cannot make migrations |

---

## Current Status

- **Phase 1-3:** ✅ COMPLETED (Frontend Developer)
- **Phase 4-5:** 🔄 IN_PROGRESS (Frontend Developer)
- **Phase 6:** ⏳ PENDING (QA Engineer - waiting for Phase 5)
- **Phase 7-8:** ⏳ PENDING (Backend Developer - waiting for Phase 5)
- **Phase 9:** ⏳ PENDING (QA Engineer - waiting for Phase 8)

---

## Questions?

**Q: Can Frontend do Phase 5 while QA tests Phase 4?**  
A: Yes! Frontend Phase 5 and QA Phase 4 testing can overlap.

**Q: What if Frontend finds bugs in Phase 4 while doing Phase 5?**  
A: Log them in QA log or Frontend log, mark as P1/P2, continue Phase 5.

**Q: Can Backend start Phase 7 before Frontend Phase 5 is done?**  
A: No. Backend server needs to know what API endpoints frontend expects.

**Q: What if a blocker occurs in Phase 6?**  
A: QA logs ⏸️ BLOCKED, PM decides: fix bug or accept as P1 for later sprint.

---

## Version History

- **v1.0** (Jan 23, 2026): Initial dependency chain created
