# AmpedFieldOps V2 - Project Timeline

## Executive Summary
**Project:** AmpedFieldOps V2 (Complete React Rewrite)  
**Start Date:** January 21, 2026  
**Target Completion:** January 30, 2026 (10 days)  
**Status:** ✅ Phase 1-5 Complete | 🚀 Phase 6 IN PROGRESS (File Explorer)  
**Lead:** GitHub Copilot (Project Orchestrator)

---

## Phase Overview

### Phase 1: Foundation (Days 1-2)
- **Goal:** Auth + basic shell + design system
- **Status:** ✅ COMPLETED
- **Features:** 
  - Authentication (Supabase)
  - Layout (Sidebar, Header)
  - Base UI components (8 core)
  - Login page with validation
  - Protected routes + Error boundary
- **Dependencies:** None
- **Blockers:** None
- **Mission Brief:** [phase1_mission_brief.md](../memory/phase1_mission_brief.md)

### Phase 2: Clients Module (Days 3-4)
- **Goal:** Full CRUD for clients
- **Status:** ✅ COMPLETED
- **Features:**
  - ✅ Client queries & validators
  - ✅ Clients page with table
  - ✅ Client modal with forms
  - ✅ Filters (search, active/inactive)
  - ✅ CRUD operations
- **Dependencies:** Phase 1 (Layout, UI components)
- **Blockers:** None
- **Sign-off:** Frontend dev completed on 2026-01-21. Ready for QA testing.

### Auth Setup: First-Time Setup & Signup (Hours 1-2 of Day 5)
- **Goal:** Smart first-time setup detection + admin registration
- **Status:** � BLOCKED - CRITICAL BUGS IDENTIFIED
- **Features:**
  - ✅ Welcome page (auto-detects signup vs login)
  - ✅ Signup form with password requirements
  - ✅ First admin creation
  - ✅ Route refactoring to `/app/*`
- **Dependencies:** Phase 1-2 (auth, layout, db)
- **Blockers:** **🚨 CRITICAL - See Bug Report Below**

### ✅ PHASE 4 COMPLETE - January 23, 2026

All critical bugs from Phases 1-4 have been resolved. Project is stable and ready for Phase 5.

**Completed Phases:**
- ✅ Phase 1: Foundation & Authentication
- ✅ Phase 2: Clients Module (Full CRUD)
- ✅ Phase 3: Projects Module (Table + Kanban)
- ✅ Phase 4: Timesheets Module (Approval Workflow)

## ✅ PHASE 5: OPERATIONS & SCHEDULING - COMPLETED

**Start Date:** January 23, 2026  
**Completed:** January 23, 2026  
**Duration:** 1 day (accelerated)

### What Phase 5 Builds
1. **Operations Dashboard** - Real-time operations status, activity feed
2. **Activity Types Management** - Admin CRUD interface for service types
3. **Financials Dashboard** - Revenue tracking, Xero sync status

### Frontend Tasks (6-8 hours)
- Build DashboardPage with stat cards and activity feed
- Build ActivityTypesPage with CRUD operations
- Build FinancialsPage with revenue tracking

### Backend Tasks (6-8 hours)
- Create 3 new database tables (activity_types, activity_log, xero_sync_log)
- Create 10+ API routes for dashboard, activity types, and financials
- Implement Xero sync job with BullMQ

**Mission Briefs:**
- [phase5_mission_brief.md](./phase5_mission_brief.md) - Overview
- [phase5_mission_brief_frontend.md](./phase5_mission_brief_frontend.md) - Frontend details
- [phase5_mission_brief_backend.md](./phase5_mission_brief_backend.md) - Backend details

**Status:** ✅ COMPLETED — Frontend pages implemented; Supabase tables and RLS configured. Financials currently uses mock data pending Phase 7 Xero endpoints.

---

## 🚀 PHASE 6: FILE EXPLORER & POLISH - IN PROGRESS

**Start Date:** January 24, 2026  
**Target Completion:** January 25, 2026  
**Duration:** 1-2 days

### What Phase 6 Builds
1. **File Explorer** - All projects as folders, navigate into project to see/manage files
2. **File Management** - Upload, download, preview, delete files per project
3. **UX Polish** - Error boundaries, toasts, loading skeletons

### Implementation Approach
**Backend (First):**
- Supabase Storage bucket `project-files` (already created)
- `project_files` metadata table + RLS policies (already created)

**Frontend (Second - Main Focus):**
- Refactor FilesPage to show **all projects as folder grid**
- ProjectFolderList component (browse projects)
- ProjectFilesView component (browse files in selected project)
- Breadcrumb navigation (back to folders)
- File uploader, list, preview, download, delete
- Toasts and skeleton loaders

**Mission Briefs:**
- [PHASE_6_FILES_EXPLORER_SPEC.md](./memory/PHASE_6_FILES_EXPLORER_SPEC.md) - Detailed spec
- [phase6_mission_brief.md](./memory/phase6_mission_brief.md) - Original brief

**Status:** 🚀 IN PROGRESS — Frontend developer building explorer UI

---

## 📋 PHASE 7: BACKEND API & XERO INTEGRATION - PLANNED

**Start Date:** January 26, 2026  
**Target Completion:** January 28, 2026  
**Duration:** 2-3 days
**Status Update:** 🔄 ARCHITECTURE REFINED (Jan 28) - Analysis complete, hybrid approach adopted

### Architecture Update (Jan 28, 2026)
**Key Change:** Phase 7 has been refined to match the proven patterns from the legacy AmpedFieldOps app:
- ✅ **Credentials Storage:** Moved from env-only to database (`app_settings` table) with admin form on Settings page
- ✅ **Redirect URI:** Dynamic calculation from current domain (auto-adjusts localhost → production)
- ✅ **OAuth Flow:** Frontend-initiated (same-window redirect, not popup)
- ✅ **Frontend UI:** Settings page with Xero tab for credential management
- ✅ **Token Encryption:** AES-256-CBC (already planned, confirmed correct approach)
- ✅ **Sync Services:** Contacts, Items, Invoices, Payments (unchanged)
- ✅ **Job Queue:** BullMQ + Redis (unchanged)

**Reference Documentation:**
- [PHASE_7_XERO_ANALYSIS.md](./memory/PHASE_7_XERO_ANALYSIS.md) - Comprehensive comparison of old vs new approach

### What Phase 7 Builds
1. **Express.js Backend** - Service-role API server for admin operations
2. **Xero OAuth Integration** - Credentials stored in database, dynamic redirect URI, token management
3. **Settings Endpoints** - Save/retrieve credentials, OAuth status, disconnect
4. **Client ↔ Contact Sync** - Two-way synchronization
5. **Products → Activity Types** - Import Xero items as service types
6. **Invoice Creation** - Generate Xero invoices from approved timesheets
7. **Payment Tracking** - Poll Xero for payment status updates
8. **BullMQ Jobs** - Scheduled sync operations

### Backend Tasks (18-24 hours)
- Express server setup with TypeScript + Docker
- Encryption service (AES-256-CBC for tokens & credentials)
- Database tables: `app_settings` (credentials), `xero_tokens` (OAuth tokens)
- Xero OAuth 2.0 flow:
  - Settings endpoints: POST `/settings/xero/credentials`, GET `/settings/xero/status`
  - OAuth endpoints: GET `/xero/auth`, GET `/xero/callback`
  - Dynamic redirect URI calculation with domain shift detection
- Sync services:
  - Client ↔ Contact bidirectional
  - Products → Activity Types (one-way import)
  - Timesheets → Invoices (create in Xero)
  - Payment status polling
- BullMQ job queue (scheduled + manual triggers)
- Admin API endpoints (protected)
- Token refresh logic (auto-refresh on expiry check)

### Frontend Tasks (6-8 hours)
- Settings page with Xero integration tab
- Credentials form (Client ID, Secret, Redirect URI auto-filled)
- "Save Credentials" and "Connect to Xero" buttons
- Xero status badge (Connected/Not Connected)
- Manual sync trigger buttons
- Sync log history table
- Form validation (Client ID: 32 chars, hex only)

**Mission Brief:**
- [phase7_mission_brief.md](./memory/phase7_mission_brief.md) - UPDATED with hybrid approach

**Status:** 📋 PLANNED — Awaiting Phase 6 completion

**Dependencies:**
- Phase 6 complete (file explorer functional)
- Xero Developer account (sandbox for testing)
- Redis for BullMQ

---

## 📋 PHASE 8: DOCUMENT INTELLIGENCE & OCR - PLANNED

**Start Date:** January 29, 2026 (after Phase 7)  
**Target Completion:** February 1, 2026  
**Duration:** 3-4 days

### What Phase 8 Builds
1. **DeepSeek-OCR-2 Integration** - Vision language model for document OCR
2. **Receipt/Invoice Analysis** - Extract date, vendor, amount, items automatically
3. **Field Extraction** - Intelligent parsing of structured data from documents
4. **Document Gallery** - Upload, browse, search, and manage scanned documents
5. **Quick-Create Workflow** - Auto-populate expenses/activities from OCR results
6. **Admin Monitoring** - Track OCR processing, success rates, performance

### Backend Tasks (18-22 hours)
- DeepSeek-OCR-2 service setup (Python microservice or Node.js wrapper)
- GPU/CUDA configuration (vLLM 0.8.5 or Transformers)
- OCR inference pipeline with timeout/error handling
- Field extraction services (receipt, invoice, project document parsers)
- Document categorization (receipt, invoice, contract, timesheet, other)
- BullMQ job queue for async OCR processing
- Database tables: `ocr_results`, `document_extractions`, `ocr_cache`
- REST API endpoints for upload, processing, retrieval
- Confidence scoring + manual field correction
- Admin endpoints for OCR statistics and monitoring

### Frontend Tasks (8-10 hours)
- Document upload widget (drag-drop, image/PDF support)
- Document gallery page (`/app/documents`) with filter and search
- Document detail page with OCR preview and extracted data display
- Extraction results modal with quick-create expense/activity
- Progress indicator for async OCR processing
- Admin dashboard: OCR statistics, job queue, failed document retry
- Manual field correction UI
- Document categorization and tagging

**Mission Brief:**
- [phase8_mission_brief.md](./memory/phase8_mission_brief.md) - Comprehensive OCR integration spec

**Status:** 📋 PLANNED — Awaiting Phase 7 completion

**Dependencies:**
- Phase 7 complete (backend API structure, job queue established)
- NVIDIA GPU with CUDA 11.8+ (or use CPU with reduced performance)
- HuggingFace model access (deepseek-ai/DeepSeek-OCR-2)
- Redis for BullMQ (already in use)

---

### Phase 3: Projects Module (Days 5-6)
- **Goal:** Projects with Kanban + table
- **Status:** ✅ COMPLETED
- **Features:**
  - ✅ Project queries & validators
  - ✅ Projects page (table/kanban toggle)
  - ✅ ProjectModal with multi-step wizard
  - ✅ Status change operations (6 statuses)
  - ✅ Client linking
  - ✅ KanbanBoard component
- **Dependencies:** Phase 2 (Clients)
- **Blockers:** None
- **Sign-off:** All components implemented, ready for QA testing

### Phase 4: Timesheets Module (Day 7)
- **Goal:** Timesheet tracking
- **Status:** ✅ COMPLETED
- **Features:**
  - Timesheet queries & validators
  - Timesheets page with table
  - Service type card selector
  - Submit/Approve workflow
  - Date range & project filters
- **Dependencies:** Phase 3 (Projects)
- **Blockers:** None

### Phase 5: Dashboard & Activity Types (Day 8)
- **Goal:** Real metrics + activity type management
- **Status:** 🎯 READY TO START
- **Features:**
  - StatCard component
  - Dashboard with live aggregates
  - Activity feed/recent entries
  - Activity Types CRUD
  - Xero linkage UI
- **Dependencies:** Phase 2-4 (all modules)
- **Blockers:** None

### Phase 6: Polish & Files (Day 9)
- **Goal:** Hardening and UX polish
- **Status:** NOT_STARTED
- **Features:**
  - File upload/download (Supabase Storage)
  - Files page (project browser)
  - Optimistic updates
  - Error boundary
  - Toast notifications
  - Loading skeletons
- **Dependencies:** Phase 1-5 (core UI)
- **Blockers:** None

### Phase 7: Backend & Xero (Day 10)
- **Goal:** Minimal backend for admin tasks
- **Status:** NOT_STARTED
- **Features:**
  - Express server setup
  - `/admin/xero/sync-items` endpoint (stub)
  - `/admin/xero/status` endpoint
  - BullMQ job queue setup (optional)
- **Dependencies:** Phase 1-6 (all frontend complete)
- **Blockers:** DECISION NEEDED on Xero integration scope

---

## Agent Assignments

| Role | Agent File | Responsibility |
|------|-----------|-----------------|
| **Project Orchestrator (Lead PM)** | `pm.agent.md` | Timeline mgmt, handoffs, decisions, blockers |
| **Frontend Developer** | `frontend-developer.agent.md` | React UI/UX, Phase 1-6 implementation |
| **Backend Developer** | `backend-developer.agent.md` | Express API, Xero sync, Phase 7+ |
| **QA Engineer** | `qa-engineer.agent.md` | Testing, audits, bug tracking, sign-off |
| **Janitor Agent** | `janitor.agent.md` | Archive old tasks, cleanup (every 5 phases) |

---

## Decision Log

### Decision 1: Project Root
- **Date:** 2026-01-21
- **Decision:** Use `/root/AmpedFieldOps-v2` as project root
- **Status:** APPROVED
- **Owner:** User

### Decision 2: Tech Stack
- **Date:** 2026-01-21
- **Decision:** React 18 + TS + Vite + Tailwind + Supabase
- **Status:** APPROVED
- **Owner:** User

### Decision 3: Xero Integration Scope
- **Date:** 2026-01-21
- **Decision:** MVP scope locked:
  - Two-way Clients ↔ Contacts sync
  - One-way Activity Types ← Products/Services import
  - Invoice creation from timesheets with draft preview
  - Payment status display from Xero
  - Phase 2+: Tracking Categories, Chart of Accounts mapping
- **Status:** APPROVED
- **Owner:** User

### Decision 4: Cost Centers & PO Workflow
- **Date:** 2026-01-21
- **Decision:** 
  - Cost centers are internal budget buckets per project
  - Each cost center has one customer-supplied PO (stored manually)
  - Invoice reference = customer PO number (e.g., ABC123)
  - Invoice notes = Project# - CostCenterName (e.g., PROJ001 - Labor)
  - Timesheet states: Draft → Submitted → Approved → Invoiced
  - Project status added: Archived (after Invoiced)
- **Status:** APPROVED
- **Owner:** User

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Xero API integration complexity | HIGH | Start with stub, implement incrementally |
| Design token extraction errors | MEDIUM | Reference example screens during build |
| Supabase RLS policy issues | MEDIUM | QA tests all filters and updates |
| Performance regression | MEDIUM | Lighthouse audits after Phase 6 |
| User data migration concerns | LOW | No schema changes; reuse V1 data |

---

## Success Metrics

✅ **Phase 1:** Auth flow works, layout responsive, 5 UI components built  
✅ **Phase 2:** Clients CRUD fully functional, 10 test cases pass  
✅ **Phase 3:** Projects CRUD + Kanban, status updates work  
✅ **Phase 4:** Timesheets tracking, submit/approve workflow  
⏳ **Phase 5:** Dashboard loads real data < 2s, Activity Types CRUD  
⏳ **Phase 6:** File management, error boundaries, skeletons  
⏳ **Phase 7:** Backend endpoints operational, frontend calls successful  

**Overall:** 
- Lighthouse Performance > 85
- All CRUD operations tested
- No console errors in happy path
- Design matches example screens

---

## Completion Log

### ✅ Phase 3: Projects Module - COMPLETED
**Date:** January 21-22, 2026  
**Agent:** Frontend Developer  
**Deliverables:**
- ✅ Projects table with full CRUD operations
- ✅ Kanban board with 6 status columns
- ✅ Multi-step project creation wizard
- ✅ ProjectsPage with table/kanban toggle
- ✅ Project filters (status, client, date range)
- ✅ useProjects hook for data management
- ✅ TypeScript validators for projects

**Quality Metrics:**
- All 6 project statuses implemented
- Client linking functional
- Responsive design (table on desktop, cards on mobile)
- Status workflow: Pending → Active → On Hold → Completed → Invoiced → Archived

### ✅ Critical Bug Fixes - COMPLETED
**Date:** 2026-01-22  
**Status:** ✅ RESOLVED  
**Agents:** Backend + Frontend Developers  
**Details:**
- ✅ BUG-001: RLS circular dependency fixed with migration
- ✅ BUG-002: Redirect loop resolved after RLS fix
- ✅ All `/rest/v1/users` endpoints now functional
- ✅ Auth flow working correctly

### ✅ Phase 2: Clients Module - COMPLETED
**Date:** 2026-01-21  
**Agent:** Frontend Developer  
**Deliverables:**
- ✅ Full CRUD for clients with table view
- ✅ Client modal with form validation
- ✅ Filters (search, active/inactive toggle)
- ✅ useClients hook for data management
- ✅ TypeScript validators for clients
- ✅ Responsive design

### ✅ Phase 1: Foundation - COMPLETED
**Date:** 2026-01-21  
**Agent:** Frontend Developer  
**Deliverables:**
- ✅ Supabase Auth with JWT and session persistence
- ✅ Protected routes with error boundary
- ✅ Sidebar navigation + header layout
- ✅ Responsive grid system
- ✅ 8 core UI components (Button, Card, Input, Modal, Table, etc.)
- ✅ Login page with form validation
- ✅ Dark theme with teal accents applied
- ✅ Space Grotesk font integration

---

## Parking Lot (Future Work)

- [ ] Real-time notifications (Supabase Realtime)
- [ ] CSV/PDF export
- [ ] Advanced reporting
- [ ] Cost center allocation
- [ ] Full Xero sync implementation
- [ ] Automated testing (Playwright E2E)
- [ ] Mobile app (React Native)

---

## Next Steps

### 🎯 Phase 5: Operations & Scheduling (READY TO START)

**Estimated Duration:** 2 days  
**Agents:** Frontend Developer (UI) and Backend Developer (API)

**Key Deliverables:**
1. Operations Dashboard with stat cards, activity feed, and quick filters
2. Activity Types management (admin CRUD, bulk import, Xero mapping)
3. Financials dashboard (invoice pipeline, revenue tracker, Xero sync status)
4. Database tables and RLS: activity_types, activity_log, xero_sync_log
5. API routes for dashboard, activity types, and financials
6. BullMQ job to trigger Xero sync and log outcomes

**Next Action:** Start Phase 5 using the mission briefs; frontend begins with mock data, backend creates tables and routes

---

**Last Updated:** 2026-01-23 16:00 UTC  
**Current Phase:** 6 of 7  
**Status:** ✅ Phase 1-5 Complete | 🎯 Phase 6 Ready


