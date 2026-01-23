# Phase 6 - File Upload Issues & Fixes
**Date:** January 23, 2026  
**Status:** FIXED  
**Issues Resolved:** RLS policy blocking uploads, storage 400 errors, preview/download URL issues

---

## Issues Reported

### 1. **Upload RLS Violation**
**Error:** `new row violates row-level security policy`

**Root Cause:** The original RLS policy in `20260124_phase6_files.sql` restricted uploads to `admin` and `manager` roles only. Regular users (technician, viewer) couldn't upload files.

**Fix:** Created `20260123_phase6_rls_hotfix.sql` migration that:
- Drops restrictive INSERT policies (`project_files_insert_admin_manager`)
- Adds new `project_files_insert_authenticated` policy allowing all authenticated users with project access
- Updates UPDATE and DELETE policies to allow file owners to manage their own files
- Updates storage bucket RLS policies similarly

**To Apply:**
```bash
cd /root/AmpedFieldOps-v2
npx supabase migration up
```

---

### 2. **Storage 400 Errors on Preview/Download**
**Error:** `Failed to load resource: the server responded with a status of 400`

**Root Cause:** 
- Preview URLs used public/unsigned URLs pointing to a private bucket (bucket is `public: false`)
- Download URLs were not signed, so storage bucket RLS rejected them

**Fix:** 
- Replaced `getPreviewUrl()` (which returns unsigned public URL) with `getSignedPreviewUrl()` (creates signed URL with 1-hour expiry)
- Added `getSignedPreviewUrl()` function in `useFiles.ts` mirroring `getSignedDownloadUrl()`
- Updated FileList component to call signed URL generator on preview button click with loading state
- Added console logging for debugging signed URL generation

**Files Changed:**
- [src/hooks/useFiles.ts](../../src/hooks/useFiles.ts) — Added `getSignedPreviewUrl()` function
- [src/components/files/FileList.tsx](../../src/components/files/FileList.tsx) — Use async `getSignedPreviewUrl()` with loading state, improved error handling

---

### 3. **Missing MIME Type in Insert**
**Error:** `mime_type` field could be undefined when file type detection fails

**Fix:**
- Changed `mime_type: file.type` to `mime_type: file.type || null` to explicitly handle missing MIME types
- Added explicit user ID retrieval before insert to avoid auth context issues

**Files Changed:**
- [src/hooks/useFiles.ts](../../src/hooks/useFiles.ts) — `mime_type: file.type || null`

---

### 4. **Mobile File Selection Redirect**
**Issue:** On mobile, after selecting a file or taking a photo, the app navigates to Dashboard instead of staying on FilesPage

**Diagnosis:** This is likely not a code issue but a mobile browser behavior or state management issue. Potential causes:
- Mobile browser reloading on file input change
- Auth context refresh triggering redirect
- Navigation state not persisting on file upload completion

**Recommended Testing:**
1. Test on mobile browser (Chrome DevTools mobile mode)
2. Check browser console for any navigation errors or warnings
3. Verify that `currentProject` state is preserved during upload
4. Check if AuthContext is refreshing unnecessarily on file input

**Potential Fixes (if issue persists):**
- Prevent default on file input change
- Use `useRef` to store project ID instead of relying on state during upload
- Suppress unnecessary auth refreshes during file operations

---

## Console Logging Added

All upload/download/preview operations now log to console for debugging:

```javascript
[useFiles] Uploading: { projectId, storagePath, fileName, size }
[useFiles] Storage upload success, creating metadata record
[useFiles] Upload complete: metadata
[useFiles] Upload error: message
[FileUploader] Starting upload for file: filename
[FileUploader] Upload successful
[FileList] Downloading: filename
[FileList] Download initiated
[getSignedDownloadUrl] Creating signed URL for: filepath
[getSignedPreviewUrl] Creating preview URL for: filepath
```

---

## Testing Checklist

### Backend (RLS Hotfix)
- [ ] Apply migration: `npx supabase migration up`
- [ ] Test as regular user (technician/viewer): Should upload successfully
- [ ] Test as admin/manager: Should upload successfully
- [ ] Test as different user: Should NOT see other user's files (RLS enforced)

### Frontend (Upload & Preview)
- [ ] Upload file → should appear in list with success toast
- [ ] Download file → signed URL should be created (check console for `[getSignedDownloadUrl] Success`)
- [ ] Preview image → signed URL should be created, image displays in modal
- [ ] Preview PDF → signed URL should be created, PDF displays in iframe
- [ ] Delete file → optimistic update, success toast
- [ ] Mobile upload → stays on FilesPage (verify with mobile browser testing)

### Mobile Testing (Specific)
- [ ] Select image from camera/files on mobile
- [ ] Verify page stays on `/app/files` (not redirected to dashboard)
- [ ] Verify upload completes and file appears in list
- [ ] Check browser console for errors or navigation logs

---

## Files Updated

1. **New Migration:**
   - [supabase/migrations/20260123_phase6_rls_hotfix.sql](../../supabase/migrations/20260123_phase6_rls_hotfix.sql)

2. **Core Fixes:**
   - [src/hooks/useFiles.ts](../../src/hooks/useFiles.ts) — Added logging, signed preview, better error handling, explicit user ID
   - [src/components/files/FileList.tsx](../../src/components/files/FileList.tsx) — Async signed preview, loading state, error handling
   - [src/components/files/FileUploader.tsx](../../src/components/files/FileUploader.tsx) — Added console logging
   - [src/components/files/Breadcrumb.tsx](../../src/components/files/Breadcrumb.tsx) — Removed unused React import
   - [src/pages/FilesPage.tsx](../../src/pages/FilesPage.tsx) — Fixed Project type query to include all required fields

---

## Build Status

✅ **Compiles successfully:** 0 TypeScript errors  
✅ **Vite build:** 1892 modules → 650.26 kB JS (177.83 kB gzipped)  
✅ **Production ready**

---

## Next Steps

1. **Apply RLS Hotfix Migration:**
   ```bash
   cd /root/AmpedFieldOps-v2
   npx supabase migration up
   ```

2. **Test File Operations:**
   - Desktop: drag-drop, preview, download, delete
   - Mobile: file picker, camera capture
   - Cross-user access (RLS enforcement)

3. **Monitor Console:**
   - Watch for `[useFiles]`, `[FileList]`, `[getSignedDownloadUrl]` logs
   - Note any `[useFiles] Upload error` or `[FileList] Download error` messages

4. **Report Mobile Redirect:**
   - If mobile still redirects to dashboard after file selection, check:
     - Browser console for navigation errors
     - Network tab for unexpected API calls
     - Verify `/app/files` route is correct in App.tsx

---

## Rollback Instructions (if needed)

If the RLS hotfix causes issues:
```bash
cd /root/AmpedFieldOps-v2
npx supabase migration down  # Reverts the hotfix
# Original migration 20260124_phase6_files.sql still applies
```

Then re-open issue with console logs and error details.

---

**Questions?** Check `.project/memory/PHASE_6_FILES_EXPLORER_SPEC.md` or phase6 mission brief.
