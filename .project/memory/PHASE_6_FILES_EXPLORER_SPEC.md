# Phase 6 - File Explorer Implementation Spec
*Date: January 24, 2026*
*Status: SPECIFICATION (Not Yet Implemented)*

## Overview

Implement a **file explorer-style interface** where users can:
1. View all projects as folders
2. Navigate into a project folder to see its files
3. Perform file operations (upload/download/delete) within each project

This replaces the current project-scoped `/app/projects/:id/files` route with a standalone file manager.

---

## User Flow

### Entry Point
- Route: `/app/files`
- Initial view: **All Projects** (folder list)

### Navigation
1. User lands on FilesPage → sees all projects as folders
2. User clicks a project folder → navigates to that project's files
3. Breadcrumb shows: `Files > ProjectName`
4. User can click "Files" in breadcrumb to go back to all projects

### File Operations
- **Within a project folder:**
  - Upload files (drag & drop + file picker)
  - Download files (signed URL)
  - Preview files (images/PDF)
  - Delete files (confirmation)
  - See file metadata (size, upload date, uploader)

---

## UI Layout

### View 1: All Projects (Folder List)
```
┌─────────────────────────────────────────┐
│ Files                                   │
│ Project folders and file management     │
├─────────────────────────────────────────┤
│ Breadcrumb: Files                       │
├─────────────────────────────────────────┤
│                                         │
│  [📁 Project Alpha]  [📁 Project Beta]  │
│  [📁 Project Gamma]  [📁 Project Delta] │
│                                         │
│  Click a folder to view its files       │
│                                         │
└─────────────────────────────────────────┘
```

### View 2: Project Files (Inside a Folder)
```
┌─────────────────────────────────────────┐
│ Files                                   │
│ Upload and manage project files         │
├─────────────────────────────────────────┤
│ Breadcrumb: Files > Project Alpha       │
├─────────────────────────────────────────┤
│                                         │
│ [Upload Area]                           │
│ Drag & drop files here                  │
│                                         │
│ Files (3):                              │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 contract.pdf  1.2MB  Jan 20 ... │ │
│ │ 🖼️  blueprint.jpg  2.5MB  Jan 19 ... │
│ │ 📋 report.xlsx    456KB  Jan 18 ... │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## Components & Structure

### New Components

**1. FilesPage (Refactored)**
- Main entry point: `/app/files`
- Two views: folder list OR file list
- State: `currentProjectId` (null = show all projects)
- Renders: `ProjectFolderList` or `ProjectFilesView`

**2. ProjectFolderList**
- Shows all projects as grid of folder cards
- Each card: project name, icon (folder), file count badge
- Click → navigate to that project's files
- Sort by project name or date

**3. ProjectFilesView**
- Shows files for current project
- Header: breadcrumb navigation
- Sections: uploader, file list
- File list: name, size, date, uploader, actions (preview/download/delete)

**4. Breadcrumb**
- Simple navigation: `Files > ProjectName`
- "Files" link → back to folder list
- Project name shows current location

**5. FileUploader** (reuse existing)
- Drag & drop area
- File picker button
- Progress indicator
- Size validation (20MB limit)

**6. FileList** (reuse existing)
- Files table/grid view
- Actions: preview, download, delete
- Metadata display

---

## Data Model & Queries

### Get All Projects (for folder view)
```sql
SELECT id, name, client_id, status
FROM projects
WHERE user has access (via RLS)
ORDER BY name ASC
```

### Get Files for Project (for file view)
```sql
SELECT id, project_id, path, name, size_bytes, mime_type, created_at, uploaded_by
FROM project_files
WHERE project_id = ?
AND user has read access (via RLS)
ORDER BY created_at DESC
```

### Upload File
```sql
INSERT INTO project_files (project_id, path, name, size_bytes, mime_type, uploaded_by)
VALUES (?, ?, ?, ?, ?, auth.uid())
```

### Delete File
```sql
DELETE FROM project_files WHERE id = ? AND user is admin/manager
```

---

## Route Map

| Route | Component | View |
|-------|-----------|------|
| `/app/files` | FilesPage | All projects as folders |
| `/app/files` (with `projectId` state) | FilesPage | Files for selected project |

**Note:** Single route with state management, not separate routes.

---

## State Management

### FilesPage State
```typescript
const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
const [projects, setProjects] = useState<Project[]>([])
const [files, setFiles] = useState<ProjectFile[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Navigation
```typescript
// Go to folder view
setCurrentProjectId(null)

// Go to file view
setCurrentProjectId(projectId)

// Back button from breadcrumb
setCurrentProjectId(null)
```

---

## Hooks Needed

### useProjects (existing)
- `const { data: projects, isLoading } = useProjects()`

### useFiles (existing)
- `const { files, loading, error } = useFiles(projectId || '')`
- `const { mutate: uploadFile } = useUploadFile()`
- `const { deleteFile } = useDeleteFile()`

### New: useFileStats (optional)
- Get file count per project (for badge on folder card)
- Query: `SELECT project_id, COUNT(*) as file_count FROM project_files GROUP BY project_id`

---

## Key Features

### Folder View
- ✅ Display all projects as cards/tiles
- ✅ Show file count badge on each folder
- ✅ Click to navigate into folder
- ✅ Sort alphabetically
- ✅ Search by project name (optional enhancement)

### File View
- ✅ Upload section with drag & drop
- ✅ File list with metadata
- ✅ Preview, download, delete actions
- ✅ Breadcrumb navigation back to folders
- ✅ Empty state messaging

### UX Polish
- ✅ Loading skeletons for folders
- ✅ Loading skeletons for files
- ✅ Toast notifications on upload/delete
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Error boundaries and error messages

---

## Acceptance Criteria

### Folder View
- [ ] All projects display as folder cards
- [ ] File count badge shows correctly per project
- [ ] Click folder navigates to file view
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors

### File View
- [ ] Upload works with drag & drop
- [ ] File list shows all files with metadata
- [ ] Download uses signed URLs (1-hour expiry)
- [ ] Preview works for images/PDF
- [ ] Delete shows confirmation and updates UI
- [ ] Breadcrumb navigates back to folders
- [ ] RLS enforces project-level access
- [ ] Loading states show skeletons
- [ ] Error messages display clearly

### Responsive Design
- [ ] Mobile: Single column, card layout
- [ ] Tablet: 2-column grid for folders
- [ ] Desktop: 3+ column grid for folders
- [ ] File list: Responsive table on desktop, cards on mobile

---

## Files to Implement/Modify

### Backend (Already Complete)
- `supabase/migrations/20260124_phase6_files.sql`
- Storage bucket and RLS policies ready

### Frontend (To Implement)

**New Files:**
- `src/pages/FilesPage.tsx` (refactored to folder explorer)
- `src/components/files/ProjectFolderList.tsx` (new)
- `src/components/files/ProjectFilesView.tsx` (new)
- `src/components/files/Breadcrumb.tsx` (new)

**Reuse/Existing:**
- `src/components/files/FileUploader.tsx`
- `src/components/files/FileList.tsx`
- `src/hooks/useFiles.ts`
- `src/hooks/useProjects.ts`

**Update:**
- `src/App.tsx` (change route from `/app/projects/:id/files` to `/app/files`)

---

## Testing Checklist

### Folder View
- [ ] All projects load and display
- [ ] File count badges accurate
- [ ] Click folder → navigates to file view
- [ ] Responsive layout verified
- [ ] No errors in console

### File View
- [ ] Upload: drag & drop works
- [ ] Upload: file picker works
- [ ] Files list: all files display
- [ ] Download: signed URL works
- [ ] Delete: confirmation shows
- [ ] Delete: optimistic update
- [ ] Preview: images display
- [ ] Preview: PDF displays
- [ ] Breadcrumb: click back → returns to folders

### RLS & Security
- [ ] User A cannot see User B's projects/files
- [ ] Signed URLs expire after 1 hour
- [ ] Direct storage access blocked (non-authenticated)
- [ ] Admin/manager can upload; all authenticated can download

### Performance
- [ ] Folder view loads < 1s
- [ ] File list loads < 1s
- [ ] Upload progress smooth
- [ ] No memory leaks on navigation

---

## Notes for Frontend Developer

1. **Reuse existing components** where possible (FileUploader, FileList)
2. **Keep state simple:** use `currentProjectId` to toggle views
3. **Loading states matter:** use skeletons for both folder list and file list
4. **Error boundaries:** wrap in try-catch for API calls
5. **RLS handles security:** trust database policies, focus on UX
6. **Test with multiple projects:** ensure switching works smoothly

---

## Success Criteria Summary

✅ Users can browse all projects as folders
✅ Users can navigate into a project to see files
✅ Users can upload/download/delete files per project
✅ Breadcrumb allows easy navigation back
✅ Mobile-responsive
✅ No errors or console warnings
✅ RLS prevents unauthorized access

---

## Questions?

Reference:
- Phase 6 Mission Brief: `.project/memory/phase6_mission_brief.md`
- Backend Implementation: `.project/agent_logs/backend_developer.log.md`
- Manifest: `.project/manifest.json`
