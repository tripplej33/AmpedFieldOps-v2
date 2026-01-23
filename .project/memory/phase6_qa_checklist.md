# Phase 6 QA Testing Checklist - Quick Reference

**Phase:** Phase 6 - Polish & Files  
**Component:** File Management System  
**Date:** January 24, 2026  
**Duration:** 2-3 hours estimated  

---

## Quick Start

1. **Start dev server:** `npm run dev` (port 5173)
2. **Navigate to:** `/app/projects/{project_id}/files`
3. **Test user:** Use any authenticated account (admin/manager/technician roles)
4. **Browser DevTools:** Keep console open to catch errors

---

## Core Features (Must Test)

### Upload
- [ ] Drag-and-drop file (< 20MB)
- [ ] Click to open file picker
- [ ] Verify upload progress shows percentage
- [ ] Success toast appears after completion
- [ ] File appears in list with correct name/size/date

### Download
- [ ] Click download icon
- [ ] File downloads to computer
- [ ] Filename matches uploaded name
- [ ] Network tab shows signed URL request

### Preview
- [ ] Images: Click preview, modal shows image
- [ ] PDF: Click preview, modal shows PDF viewer
- [ ] Other files: No preview icon available
- [ ] Close modal with X button

### Delete
- [ ] Click delete icon
- [ ] Confirmation dialog appears
- [ ] Cancel → file stays
- [ ] Confirm → file disappears from list immediately
- [ ] Success toast appears

### File List
- [ ] Shows all files for project
- [ ] Files sorted by newest first
- [ ] File size displays correctly (B/KB/MB)
- [ ] Upload date/time shown
- [ ] Empty state message when no files

---

## Security Tests

### RLS (Project Isolation)
- [ ] Create 2 test users
- [ ] Each uploads to different project
- [ ] User A cannot see User B's files
- [ ] Cross-project URL access returns 403

### Signed URLs
- [ ] Download generates signed URL
- [ ] URL valid for ~1 hour
- [ ] After expiry, URL returns 403

---

## UI/UX Tests

### Responsive Design
- [ ] **Desktop (1920px):** All columns visible, clean layout
- [ ] **Tablet (768px):** Content adapts, readable
- [ ] **Mobile (375px):** Stacked layout, touch-friendly

### Error Handling
- [ ] File > 20MB rejected with error toast
- [ ] Network error during upload shows error message
- [ ] Invalid file type handled gracefully
- [ ] NO console errors in DevTools

### Notifications
- [ ] Success toast: "File uploaded successfully"
- [ ] Success toast: "File deleted successfully"
- [ ] Error toast: Shows specific error message
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Can manually close toast with X

---

## Edge Cases

### File Operations
- [ ] Upload file with special chars in name (`, @, #, $)
- [ ] Filename sanitized correctly
- [ ] Upload same file twice → both appear in list (different IDs)
- [ ] Delete file → recreate with same name works

### Performance
- [ ] Load page with 50+ files
- [ ] Scroll through list smoothly
- [ ] Upload doesn't freeze UI
- [ ] Preview modal opens quickly

### Cross-Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile Safari

---

## Pass/Fail Criteria

### ✅ PASS (Must All Be True)
- [ ] All 5 core features work (upload/download/preview/delete/list)
- [ ] RLS prevents cross-project access
- [ ] Zero console errors
- [ ] Toast notifications appear
- [ ] Responsive on mobile

### ❌ FAIL (Any One Fails Test)
- File doesn't appear after upload
- Download returns 404/403
- Cross-project file access allowed
- Console shows errors
- UI breaks on mobile

---

## Test Execution Template

**Start Time:** ___________  
**End Time:** ___________  
**Tester:** ___________  
**Browser/OS:** ___________  

### Results
- [ ] Passed: ___/30 checks
- [ ] Failed: ___/30 checks
- [ ] Blocked: ___/30 checks

### Failures (if any)
1. Feature: ______________ | Steps: ______________
2. Feature: ______________ | Steps: ______________

### Notes
_________________________________

---

## Quick Commands

```bash
# Start dev server
npm run dev

# View storage bucket (Supabase dashboard)
# Dashboard → Storage → project-files

# Check metadata table (Supabase dashboard)
# Dashboard → Editor → project_files table

# Check browser console for errors
# DevTools → Console tab → Look for red errors
```

---

## Environment Details

| Item | Details |
|------|---------|
| **App URL** | http://localhost:5173 |
| **Route** | /app/projects/{id}/files |
| **Storage Bucket** | project-files |
| **Metadata Table** | project_files |
| **Max File Size** | 20MB |
| **Signed URL Expiry** | 1 hour |

---

## Success Definition

✅ **Test Passes if:**
1. Can upload, download, preview, delete files
2. RLS prevents unauthorized access
3. No errors in console
4. Mobile-friendly and responsive
5. Toast notifications work correctly

**Estimated Time:** 2-3 hours  
**Difficulty:** Easy-Medium  
**Tools Needed:** Browser, test files (images/PDFs), 2 test accounts

---

*Ready to test! Open a new issue for any bugs found.*
