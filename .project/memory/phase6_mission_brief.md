# Phase 6 Mission Brief - Polish & Files
*Date: January 23, 2026*
*Lead: GitHub Copilot (Project Orchestrator)*

## Mission Overview

Phase 6 focuses on UX hardening and adding project-scoped file management powered by Supabase Storage. Work proceeds sequentially: Backend prepares storage bucket + RLS, then Frontend implements the UI/UX layer with optimistic updates and polish across core pages.

- File Management: Upload/download/preview with per-project scoping
- UX Polish: Error boundaries, toast notifications, loading skeletons
- Performance: Light pass on heavy views (clients, projects, timesheets)

Timeline: January 24–25, 2026 (1 day)
Status: READY TO START
Complexity: Medium (known patterns; new storage policies)

---

## Scope & Out of Scope

In Scope
- Create Supabase Storage bucket `project-files`
- Create `project_files` metadata table (auditability + fast search)
- RLS policies so users only access files for projects they can view
- Frontend Files page with browser, upload, preview/download, delete
- Global polish: error boundaries, toasts, skeleton loaders

Out of Scope
- Virus scanning and content moderation
- Versioning beyond single latest (future enhancement)
- External file providers (Drive/OneDrive)

---

## Data Model & Policies

Storage Bucket
- Name: `project-files`
- Public: false (signed URLs for downloads)
- Folders: `project_{id}/...`

Metadata Table: `project_files`
- id (uuid, pk, default gen_random_uuid())
- project_id (uuid, references projects.id)
- path (text) – full storage path (project_{id}/filename.ext)
- name (text)
- size_bytes (bigint)
- mime_type (text)
- uploaded_by (uuid, references auth.users)
- created_at (timestamptz, default now())

RLS
- Enable RLS
- SELECT: user can read if user has read access to `project_id`
- INSERT/DELETE: only admin or project manager roles
- Storage access: use signed URLs for download; uploads via client with auth and policy check

Indexes
- idx_project_files_project_id
- idx_project_files_created_at

---

## Deliverables

Backend (First)
- SQL migration to create `project_files` + RLS policies
- Create storage bucket `project-files` (via SQL or admin API script)
- Helper RPC (optional): `create_signed_download_url(file_id)`
- Minimal seed rows (optional) for QA

Frontend (Second)
- `src/pages/FilesPage.tsx`
- `src/components/files/FileUploader.tsx` (drag & drop + progress)
- `src/components/files/FileList.tsx` (list + preview/download/delete)
- Hooks: `useFiles(projectId)`, `useUploadFile()`, `useDeleteFile()`
- Global: ErrorBoundary, Toast system, Skeleton components on key pages

---

## Acceptance Criteria

File Management
- Upload supports drag-and-drop and file picker
- Progress indicator during upload
- Files list fetches by project with pagination
- Download uses signed URL; preview common types (images/pdf)
- Delete requires confirmation and immediately updates UI (optimistic)
- RLS prevents cross-project access (QA verified)

UX Polish
- ErrorBoundary wraps app routes and shows friendly fallback
- Toasts show success/error for CRUD and uploads
- Skeletons for Dashboard, Projects, Timesheets key sections
- No new TypeScript errors; Lighthouse Performance ≥ 85 (unchanged or improved)

---

## Sequencing (Sequential Only)

1) Backend Developer
- Add migration `20260124_phase6_files.sql`
- Create bucket and policies
- Verify insert/select/delete under RLS
- Provide minimal README for env and testing

2) Frontend Developer
- Build FilesPage with mocked API, then wire to Supabase
- Add global ErrorBoundary/Toast/Skeletons
- Validate flows with backend

QA
- Test RLS with two users across different projects
- Verify signed URL expiry and direct access blocked
- Confirm no console errors and smooth UX

---

## Dependencies & References
- Manifest: `.project/manifest.json`
- Timeline: `.project/timeline.md`
- Dependency Chain: `.project/AGENT_DEPENDENCY_CHAIN.md`
- Prior patterns: Clients/Projects/Timesheets CRUD + hooks

---

## Handoff Targets
- Next Agent: Backend Developer
- Handoff Instruction: Prepare storage bucket, metadata table, and policies. Document SQL and any admin steps. When done, update `.project/agent_logs/backend_developer.log.md` and ping Orchestrator to hand off to Frontend Developer.

---

## Risks & Mitigations
- Misconfigured RLS: Start with tight policies; QA with two users
- Large file uploads: Cap size to 20MB; show errors early
- MIME spoofing: Treat preview cautiously; rely on browser sandboxing

---

## Quick Test Plan (Backend)
- Insert file metadata as admin → allowed
- Insert as non-admin on authorized project → allowed
- Insert on unauthorized project → denied
- Select only project-owned files → enforced
- Delete by admin/manager only → enforced

## Quick Test Plan (Frontend)
- Upload small file → appears in list with progress → download works
- Delete file → optimistic remove → error path restores on failure
- Skeletons appear on first load; toasts on success/error
- Error boundary shows fallback on thrown error in child component
