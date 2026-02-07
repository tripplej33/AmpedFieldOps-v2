# Current Task - Phase 6: File Explorer & UX Polish
*Date: January 24, 2026*
*Status: READY FOR IMPLEMENTATION*

## Overview

**Phase 6** focuses on building a file explorer interface. All infrastructure is ready; we're now implementing the frontend UI to let users browse projects as folders and manage files within each project.

**Backend Status:** ✅ Complete  
- Storage bucket `project-files` created
- `project_files` metadata table + RLS policies in place
- Ready for frontend consumption

**Frontend Status:** 🚀 Starting Now  
- Detailed mission brief ready
- Specifications and component breakdown provided
- Ready for implementation

---

## Architecture

### Two Views (Single Route)

**Route:** `/app/files`

**View 1: Folder List (currentProjectId = null)**
- All projects displayed as folder cards in a grid
- Click folder to navigate to file view

**View 2: File View (currentProjectId = 'uuid')**
- Files for selected project with full CRUD
- Breadcrumb to navigate back

---

## Components to Build

| Component | Location | Status | Purpose |
|-----------|----------|--------|---------|
| FilesPage (refactored) | `src/pages/FilesPage.tsx` | 🔧 Build | Entry point; toggle between views |
| ProjectFolderList | `src/components/files/ProjectFolderList.tsx` | ✨ New | Grid of project folders |
| ProjectFilesView | `src/components/files/ProjectFilesView.tsx` | ✨ New | Files browser for one project |
| Breadcrumb | `src/components/files/Breadcrumb.tsx` | ✨ New | Navigation helper |
| FileUploader | `src/components/files/FileUploader.tsx` | ✅ Reuse | Drag & drop uploader |
| FileList | `src/components/files/FileList.tsx` | ✅ Reuse | File browser with actions |

---

## Data Flow

```
FilesPage
├─ currentProjectId = null
│  └─ ProjectFolderList
│     ├─ useProjects() → fetch all projects
│     ├─ onClick → setCurrentProjectId(id)
│     └─ Render folder grid
│
└─ currentProjectId = 'uuid'
   └─ ProjectFilesView
      ├─ useProjects() → find selected project name
      ├─ useFiles(projectId) → fetch files
      ├─ FileUploader → upload files
      ├─ FileList → browse/delete/download
      └─ Breadcrumb → onClick back to null
```

---

## Key Features

✅ **Folder Browser** - Grid of project cards  
✅ **File Management** - Upload, download, preview, delete  
✅ **Breadcrumb Navigation** - Easy back button  
✅ **RLS Secure** - Only shows accessible projects/files  
✅ **Responsive Design** - Mobile/tablet/desktop  
✅ **Loading States** - Skeletons during fetch  
✅ **Toast Notifications** - Success/error feedback  
✅ **Error Boundaries** - Graceful error handling  

---

## Files to Reference

**Mission Brief (Detailed):**
- [phase6_mission_brief_frontend.md](./phase6_mission_brief_frontend.md) ← Start here

**File Explorer Spec:**
- [PHASE_6_FILES_EXPLORER_SPEC.md](./PHASE_6_FILES_EXPLORER_SPEC.md)

**Project Status:**
- Manifest: `.project/manifest.json`
- Timeline: `.project/timeline.md`

---

## Success Criteria

✅ All projects display as clickable folder cards  
✅ Clicking folder shows that project's files  
✅ Breadcrumb allows navigation back to folders  
✅ File operations work (upload/download/preview/delete)  
✅ Responsive on mobile, tablet, desktop  
✅ No console errors; TypeScript strict mode passes  
✅ Loading skeletons and toasts show correctly  

---

## Next: Frontend Implementation

Frontend developer should:

1. Read `phase6_mission_brief_frontend.md` in full
2. Start with FilesPage refactoring
3. Build ProjectFolderList component
4. Build ProjectFilesView component
5. Wire up hooks and navigation
6. Test all flows

---

**Status: Ready for Frontend Developer to begin Phase 6 implementation.**
