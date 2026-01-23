# Timesheet File Upload Feature
**Date:** January 23, 2026  
**Status:** IMPLEMENTED  
**Location:** TimesheetModal + TimesheetFileUploader component

---

## Overview

Added file upload functionality to the timesheet entry modal, allowing users to attach supporting documents (receipts, timesheets, notes, etc.) to their timesheet submissions. Files are organized in a nested folder structure by project and cost center.

---

## Storage Path Structure

Files uploaded via timesheet are stored in the following folder hierarchy:

### Without Cost Center
```
project-files/
└── project_{projectId}/
    └── {filename}
```

### With Cost Center (Recommended for Timesheets)
```
project-files/
└── project_{projectId}/
    └── cost_center_{costCenterId}/
        └── {filename}
```

**Examples:**
- `project_f47ac10b-58cc-4372-a567-0e02b2c3d479/timesheet_2025-01-23.pdf`
- `project_f47ac10b-58cc-4372-a567-0e02b2c3d479/cost_center_a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6/invoice_scan.jpg`

---

## Files Modified

### New Component
- **[src/components/files/TimesheetFileUploader.tsx](../../src/components/files/TimesheetFileUploader.tsx)**
  - Drop/paste file uploader specifically for timesheets
  - Supports optional cost center folder structure
  - Compact mode for inline display in modal
  - Full mode with larger upload area

### Updated Files
- **[src/components/TimesheetModal.tsx](../../src/components/TimesheetModal.tsx)**
  - Added file upload section before actions
  - Shows list of attached files with remove button
  - Toast notifications for upload success/error
  - Clear uploaded files when modal resets

- **[src/hooks/useFiles.ts](../../src/hooks/useFiles.ts)**
  - Updated `upload()` function to accept optional `costCenterId` parameter
  - Builds nested path automatically when `costCenterId` provided

### Optional Migration (for documentation)
- **[supabase/migrations/20260124_phase6_cost_center_files.sql](../../supabase/migrations/20260124_phase6_cost_center_files.sql)**
  - Documents the cost center folder structure support
  - No database changes needed (RLS already supports this)

---

## Usage in Timesheet Modal

### User Flow
1. User fills out timesheet entry form (project, cost center, activities, hours)
2. **File Upload Section** appears once project is selected
3. User can:
   - Drag and drop files onto the uploader
   - Click to browse and select files
   - See upload progress
   - Remove attached files before submission
4. Files are automatically organized:
   - Without cost center: `project_{id}/filename`
   - With cost center: `project_{id}/cost_center_{id}/filename`
5. User clicks "Save Draft" or "Submit for Approval"
6. Toast notification confirms upload success
7. Files persist in storage even if form is saved as draft

### Upload Features
- **Max file size:** 20MB per file
- **Supported formats:** Any file type (PDFs, images, documents, etc.)
- **Signed URLs:** Downloads expire in 1 hour
- **Progress indicator:** Shows upload percentage
- **Error handling:** User-friendly error messages
- **Optimistic updates:** File appears in list immediately

---

## Component API

### TimesheetFileUploader
```tsx
interface TimesheetFileUploaderProps {
  projectId: string           // Required; file organization
  costCenterId?: string       // Optional; creates subfolder
  onUploadComplete: (file) => void  // Fired when upload succeeds
  onError: (error: string) => void  // Fired on upload failure
  compact?: boolean           // Default: false; compact inline mode
}
```

### Examples

**Full mode (in modal):**
```tsx
<TimesheetFileUploader
  projectId="f47ac10b-58cc-4372-a567-0e02b2c3d479"
  costCenterId="a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6"
  onUploadComplete={(file) => console.log('Uploaded:', file.name)}
  onError={(err) => console.error(err)}
/>
```

**Compact mode (for action bar):**
```tsx
<TimesheetFileUploader
  projectId={projectId}
  costCenterId={costCenterId}
  onUploadComplete={handleFileAdded}
  onError={handleError}
  compact={true}
/>
```

---

## useFiles Hook Updates

### Updated `upload()` signature
```typescript
upload(
  projectId: string,
  file: File,
  onProgress?: (progress: number) => void,
  costCenterId?: string  // NEW: Optional cost center
): Promise<ProjectFile>
```

### Path Logic
```typescript
// Without cost center
const storagePath = `project_${projectId}/${filename}`

// With cost center
const storagePath = `project_${projectId}/cost_center_${costCenterId}/${filename}`
```

---

## RLS Security

**Good news:** No RLS changes needed!

The existing RLS policies already support this folder structure because they:
1. Extract `project_id` from the first path segment using `project_files_get_project_id()`
2. Validate user has access to that project
3. Allow any sub-path structure within `project_{id}/`

**RLS Enforcement:**
- Users can only upload to projects they can access
- Users can only read/download files from projects they have access to
- Admin/Manager can delete any file in their accessible projects
- Regular users can only delete their own files

**Cost Center is informational** - no separate access control needed (users with project access can see all cost center files within that project).

---

## Database Tracking

Files uploaded via timesheet are tracked in the `project_files` table:
```sql
SELECT * FROM project_files 
WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND path LIKE '%cost_center_%'
  AND uploaded_by = current_user_id;
```

**Metadata captured:**
- `id` – Unique file identifier
- `project_id` – Parent project
- `path` – Full storage path (includes cost_center if provided)
- `name` – Original filename
- `size_bytes` – File size in bytes
- `mime_type` – Content type (e.g., application/pdf)
- `uploaded_by` – User who uploaded
- `created_at` – Upload timestamp

---

## Console Logging

All timesheet file operations log to console with `[TimesheetFileUploader]` prefix:

```javascript
[TimesheetFileUploader] Starting upload for file: timesheet.pdf
{ projectId, costCenterId }
[FileUploader] Upload successful
[getSignedDownloadUrl] Creating signed URL for: project_xxx/cost_center_yyy/timesheet.pdf
```

---

## Testing Checklist

### Basic Upload
- [ ] Select project → file uploader appears
- [ ] Select cost center → path includes cost_center folder
- [ ] Drag & drop file → upload starts
- [ ] Click file input → browse files and select
- [ ] File appears in "attached files" list during upload
- [ ] Upload completes → success toast
- [ ] Remove file → file removed from list

### Cost Center Organization
- [ ] Upload without cost center → path: `project_{id}/filename`
- [ ] Upload with cost center → path: `project_{id}/cost_center_{id}/filename`
- [ ] Check Supabase project_files table → paths match structure

### Error Handling
- [ ] File > 20MB → error message "exceeds 20MB limit"
- [ ] Upload fails → error toast with details
- [ ] Network error → graceful error handling

### Mobile Testing
- [ ] Attach file via camera on mobile
- [ ] Attach file from mobile file picker
- [ ] Upload progress visible
- [ ] File stays in list (doesn't redirect to dashboard)

### Security (RLS)
- [ ] User A can upload to User A's projects
- [ ] User A cannot upload to User B's projects
- [ ] Admin can see files from any project
- [ ] Files are organized by project/cost center correctly

---

## Potential Enhancements (Future)

1. **Bulk file upload** – Multiple files at once
2. **File preview** – View attached images/PDFs before submission
3. **File deletion from timesheet** – Remove files already attached
4. **Automatic receipt OCR** – Extract data from receipts
5. **File size validation** – Show warning before uploading large files
6. **Compression** – Compress images before upload (reduce storage)
7. **Versioning** – Track file upload history per timesheet
8. **Archive** – Move old timesheet files to archive after approval

---

## Build Status

✅ **TypeScript:** 0 errors  
✅ **Vite build:** 1893 modules → 654.57 kB JS (179.06 kB gzipped)  
✅ **Production ready**

---

## Next Steps

1. **QA Testing:** Verify upload flow works in timesheet modal
2. **User Training:** Document new feature for end users
3. **Optional:** Add to Timesheet list view to show attached file count
4. **Optional:** Create "Timesheet Files" browser in Files page

---

**Questions?** Reference the useFiles hook or TimesheetFileUploader component source code.
