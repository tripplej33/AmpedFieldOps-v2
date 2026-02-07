# Phase 6 Mission Brief - Frontend Developer
*Date: January 24, 2026*
*Phase: 6 - File Explorer & UX Polish*
*Duration: 4-6 hours*

## Overview

Build a **file explorer interface** where users can browse all projects as folders, navigate into each project to view/manage its files, and perform file operations (upload/download/preview/delete).

This replaces the current project-scoped files page with a unified, intuitive file browser.

---

## User Stories

### Story 1: Browse Projects as Folders
**As a** user  
**I want to** see all my projects displayed as folder cards on the Files page  
**So that** I can easily navigate to the files I need

**Acceptance Criteria:**
- FilesPage at `/app/files` shows grid of project folders
- Each folder displays: project name, icon, file count badge
- Folders are clickable and navigate to that project's files
- Responsive layout (1 col mobile, 2-3 cols tablet, 3+ cols desktop)
- Sort alphabetically by project name
- Loading skeleton while fetching projects

### Story 2: View Project Files
**As a** user  
**I want to** click a project folder and see all files in that project  
**So that** I can manage files per project

**Acceptance Criteria:**
- Clicking folder shows files list for that project
- Breadcrumb shows: `Files > Project Name`
- File list shows: name, size, upload date, uploader
- Files sortable by date, size, name
- Empty state message if no files
- Loading skeleton while fetching files

### Story 3: Upload Files
**As a** user  
**I want to** upload files to a project via drag & drop  
**So that** I can store project-related files

**Acceptance Criteria:**
- Drag & drop area to upload files
- File picker button for users who prefer clicking
- Shows progress during upload
- File size limit: 20MB with clear error message
- Success toast shows filename
- File appears in list immediately (optimistic update)
- Error toast if upload fails

### Story 4: Manage Files
**As a** user  
**I want to** preview, download, and delete files  
**So that** I can work with project files efficiently

**Acceptance Criteria:**
- **Preview:** Images and PDFs open in modal (JPG, PNG, PDF only)
- **Download:** Uses signed URL (1-hour expiry), triggers browser download
- **Delete:** Shows confirmation dialog, removes from list on success
- All operations show loading states
- Error messages are clear (e.g., "File too large", "Preview not available")
- Toast notifications for success/error

### Story 5: Navigate Easily
**As a** user  
**I want to** navigate back to the project list easily  
**So that** I don't get stuck in a project folder

**Acceptance Criteria:**
- Breadcrumb: "Files" link returns to folder list
- Back button in browser works as expected
- URL structure: `/app/files` (folder list) or `/app/files?projectId=uuid` (file list)

---

## Components to Build/Refactor

### 1. FilesPage.tsx (Refactored)
**Entry point:** `/app/files`  
**Responsibilities:**
- State: `currentProjectId` (null = show folders, set = show files)
- Render: ProjectFolderList or ProjectFilesView based on state
- Breadcrumb navigation

**Props:** None (route-based)

**State:**
```typescript
const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
```

---

### 2. ProjectFolderList.tsx (New)
**Purpose:** Display all projects as folder cards

**Props:**
```typescript
interface ProjectFolderListProps {
  onFolderClick: (projectId: string) => void
  isLoading?: boolean
}
```

**Features:**
- Grid layout (responsive: 1, 2, 3+ cols)
- Uses `useProjects()` hook to fetch projects
- Folder card shows: project name, icon, file count badge
- Click handler calls `onFolderClick(projectId)`
- Loading skeleton for each card
- Empty state: "No projects" message
- Error state: display error message

**UI:**
```
┌─────────────────────────┐
│ 📁 Project Alpha   (12) │
│                         │
└─────────────────────────┘
```

---

### 3. ProjectFilesView.tsx (New)
**Purpose:** Display files for a selected project

**Props:**
```typescript
interface ProjectFilesViewProps {
  projectId: string
  projectName: string
  onBack: () => void
}
```

**Features:**
- Breadcrumb at top: `Files > ProjectName`
- Upload section with FileUploader component
- File list with FileList component
- Loading skeletons and error handling
- Toasts for success/error feedback

---

### 4. Breadcrumb.tsx (New)
**Purpose:** Navigation helper

**Props:**
```typescript
interface BreadcrumbProps {
  items: Array<{ label: string; onClick?: () => void }>
}
```

**Example:**
```
Files > Project Alpha > Files
```

**Clicking "Files" calls `onBack()`**

---

### 5. FileUploader.tsx (Existing - Reuse/Enhance)
**Changes:** None needed, reuse as-is

---

### 6. FileList.tsx (Existing - Reuse/Enhance)
**Changes:** None needed, reuse as-is

---

## Hooks & Data Fetching

### useProjects() (Existing)
```typescript
const { data: projects, isLoading } = useProjects()
// Returns: Array<Project> with id, name, client_id, status
```

### useFiles(projectId) (Existing)
```typescript
const { files, loading, error } = useFiles(projectId)
// Returns: Array<ProjectFile>
```

### useFileStats(projectId) (Optional - For Badge Count)
```typescript
const { fileCount } = useFileStats(projectId)
// Returns: number of files per project
// Can be derived from useFiles() length, or query separately
```

---

## Styling & Layout

### Folder Grid
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
gap: 1.5rem;

/* Mobile: 1 col */
@media (max-width: 768px) {
  grid-template-columns: 1fr;
}

/* Tablet: 2 cols */
@media (min-width: 768px) and (max-width: 1024px) {
  grid-template-columns: repeat(2, 1fr);
}

/* Desktop: 3+ cols */
@media (min-width: 1024px) {
  grid-template-columns: repeat(3, 1fr);
}
```

### Folder Card
- Width: 100% of grid cell
- Padding: 1.5rem
- Border: 1px solid `border-dark`
- Background: `card-dark`
- Hover: lighten background, add shadow
- Icon: 3rem size, `primary` color
- Badge: top-right corner, `accent-amber`

---

## Routing & Navigation

### URL Structure
```
/app/files                          → Folder view (currentProjectId = null)
/app/files?projectId=abc123         → File view (currentProjectId = 'abc123')
```

### Navigation Flow
1. User lands on `/app/files` → shows projects
2. User clicks folder → navigates to `/app/files?projectId=xyz`
3. Breadcrumb "Files" link → back to `/app/files`
4. Browser back button → works naturally

---

## Error Handling

### Errors to Handle
- Projects fetch fails → show error message, retry button
- Files fetch fails → show error in file view, retry button
- Upload fails → toast error, specific message (size, network, etc.)
- Download fails → toast error, "Check connection"
- Delete fails → toast error, list remains unchanged
- Preview unavailable → toast message, "File type not supported"

### Error Messages (User-Friendly)
- "Failed to load projects. Please try again."
- "File is too large (max 20MB). Please choose a smaller file."
- "Failed to upload file. Please check your connection."
- "Preview not available for this file type."
- "Failed to delete file. Please try again."

---

## Loading States

### Skeleton Loaders
1. **Folder List:** 6 skeleton cards in grid layout
2. **File List:** 3-5 skeleton rows

Use existing `Skeleton` component or Material UI skeleton.

---

## Success Criteria Checklist

Frontend Implementation
- [ ] FilesPage shows projects as folder grid on load
- [ ] Click folder → navigates to file view
- [ ] Breadcrumb shows correct project name
- [ ] File uploader works (drag & drop)
- [ ] Files list displays all files with metadata
- [ ] Download button triggers signed URL
- [ ] Preview opens modal for images/PDF
- [ ] Delete shows confirmation and updates list
- [ ] Breadcrumb "Files" link → back to folder list
- [ ] Responsive design: mobile (1 col), tablet (2 cols), desktop (3 cols)
- [ ] Loading skeletons appear during fetches
- [ ] Toasts show for success/error
- [ ] Empty states shown when needed
- [ ] No console errors or TypeScript issues
- [ ] All hooks working correctly

---

## Deliverables

**New Components (5):**
1. `src/components/files/ProjectFolderList.tsx`
2. `src/components/files/ProjectFilesView.tsx`
3. `src/components/files/Breadcrumb.tsx`
4. Updated `src/pages/FilesPage.tsx`

**Modified Files (1):**
- `src/App.tsx` — Route from `/app/projects/:id/files` to `/app/files`

**Hooks (Reuse):**
- `src/hooks/useProjects.ts` (existing)
- `src/hooks/useFiles.ts` (existing)

**Types (If Needed):**
- Add `ProjectFolderList`, `ProjectFilesView` props to `src/types/index.ts`

---

## Testing Checklist

### Manual Testing
1. [ ] Load `/app/files` → See all projects as folders
2. [ ] Click a folder → See files for that project
3. [ ] Click breadcrumb "Files" → Back to project list
4. [ ] Upload a file → Appears in list, toast shows success
5. [ ] Download a file → Browser triggers download
6. [ ] Preview image → Modal opens with image
7. [ ] Delete file → Confirmation, then removed from list
8. [ ] Refresh page → Files and folders still load correctly
9. [ ] Test on mobile → 1-column layout
10. [ ] Test on tablet → 2-column layout
11. [ ] Test on desktop → 3+ column layout

### Quality Checks
- [ ] TypeScript: 0 errors
- [ ] Console: 0 errors/warnings
- [ ] Accessibility: ARIA labels on buttons/inputs
- [ ] Performance: Pages load < 1.5s
- [ ] Responsive: All breakpoints tested

---

## Reference Code Patterns

### Folder Click Handler
```typescript
const handleFolderClick = (projectId: string) => {
  setCurrentProjectId(projectId)
}
```

### Breadcrumb Back
```typescript
const handleBackToFolders = () => {
  setCurrentProjectId(null)
}
```

### Conditional Rendering
```typescript
{currentProjectId ? (
  <ProjectFilesView
    projectId={currentProjectId}
    projectName={selectedProject?.name || ''}
    onBack={handleBackToFolders}
  />
) : (
  <ProjectFolderList onFolderClick={handleFolderClick} />
)}
```

---

## Notes

- **Reuse components:** FileUploader and FileList already exist; no need to rebuild
- **Backend ready:** Supabase storage bucket and RLS policies are configured
- **Keep it simple:** Use state to toggle views; no complex routing needed
- **RLS handled:** Database enforces project access; frontend just displays UI
- **Mobile first:** Design responsive from the start

---

## Success Looks Like

✅ User lands on `/app/files` and sees all their projects as folder cards  
✅ User clicks a folder and sees that project's files with full CRUD capabilities  
✅ User can upload files, download with signed URLs, preview images/PDFs, and delete files  
✅ Breadcrumb allows easy navigation back to projects  
✅ Everything is responsive and works on mobile/tablet/desktop  
✅ All interactions show appropriate loading states and toast notifications  
✅ No console errors; clean TypeScript compilation

---

**Ready to build! Start with FilesPage refactoring and ProjectFolderList component.**
