# Agent Log Entry Template

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Purpose:** Standard format all agents use when logging progress

---

## Location

Save log entries in: `.project/agent_logs/{agent_role}.log.md`

Example paths:
- `.project/agent_logs/frontend_developer.log.md`
- `.project/agent_logs/backend_developer.log.md`
- `.project/agent_logs/qa_engineer.log.md`

---

## Full Log File Structure

```markdown
# {Agent Role} - Progress Log

**Agent:** {Full Name or Role}  
**Current Session:** {Date Started, e.g., "January 23, 2026"}  
**Last Updated:** {Timestamp, e.g., "2026-01-23 14:30 UTC"}

---

## Current Task

**Task:** {Task Name}  
**Status:** ✅ COMPLETED / 🔄 IN_PROGRESS / ⏳ PENDING / ⏸️ BLOCKED  
**Started:** {Date}  
**Phase:** Phase {N}  
**Related Files:** 
- [file1.ts](../../src/file1.ts)
- [file2.tsx](../../src/file2.tsx#L10-L20)

---

## Session Log

### {DATE} - {TASK_NAME}

**Related Agent(s):** [Previous Agent Name] → [This Agent] → [Next Agent Name]  
**Blocks:** [Who's waiting for this] / None  
**Depends On:** [Who's this dependent on] / None

**What I Did:**
- [Accomplishment 1]
- [Accomplishment 2]
- [Accomplishment 3]

**Files Changed:**
- [file1.ts](../../src/file1.ts) — Description of change
- [file2.tsx](../../src/file2.tsx#L50-L75) — Description of change
- [config.ts](../../src/config.ts) — Added new export

**Tests Performed:**
- [Test 1 name] → ✅ PASS
- [Test 2 name] → ❌ FAIL (details: ...)
- [Test 3 name] → ⏳ PENDING (waiting on [reason])

**Status:** ✅ COMPLETED / 🔄 IN_PROGRESS / ⏸️ BLOCKED

**Blocker Details (if blocked):**
- Waiting on: [Agent Name or requirement]
- Issue: [Clear description of what's blocking]
- Escalated to: PM (date/time)
- Decision: [Once unblocked, what happened]

**Next Steps / Handoff:**
- [For next agent] → [Agent Name] is ready to start Phase {N+1}
- [Quick summary of what next agent needs to do]
- [Any "gotchas" or things to watch for]

---
```

---

## Entry Template (Copy & Paste This)

```markdown
### {DATE} - {TASK_NAME}

**Related Agent(s):** {Previous} → {This Agent} → {Next}  
**Blocks:** {Who if anyone} / None  
**Depends On:** {What if anything} / None

**What I Did:**
- 

**Files Changed:**
- 

**Tests Performed:**
- 

**Status:** ✅ COMPLETED / 🔄 IN_PROGRESS / ⏳ PENDING / ⏸️ BLOCKED

**Blocker Details (if blocked):**
- Waiting on: 
- Issue: 
- Escalated to: 

**Next Steps / Handoff:**
- 

---
```

---

## Field-by-Field Guide

### **Related Agent(s)**
Link to other agents this task connects to.

**Format:**
```
**Related Agent(s):** [Backend Developer](../../agents/backend-developer.agent.md) → Frontend Developer → [QA Engineer](../../agents/qa-engineer.agent.md)
```

**What to include:**
- Previous agent (who you depend on)
- This agent (you)
- Next agent (who's waiting on you)
- Link to agent files in `.github/agents/`

---

### **Blocks**
Who is waiting for this task to complete?

**Examples:**
```
**Blocks:** Backend Developer (Phase 7) / None
**Blocks:** QA Engineer testing / None
**Blocks:** Everything else (foundation) / None
```

---

### **Depends On**
What external things does this task need?

**Examples:**
```
**Depends On:** Phase 1 ✅ COMPLETED / Xero credentials / None
**Depends On:** Backend DB migrations / None
```

---

### **What I Did**
Bullet list of accomplishments, not code changes (those go in "Files Changed").

**Good examples:**
- Implemented ClientTable component with pagination
- Fixed circular dependency in RLS policies (migration created)
- Created useTimesheets hook with memoized dependencies
- Tested login flow on Chrome/Firefox/Safari

**Bad examples:**
- `const MyComponent = ...` (this is code, not accomplishment)
- Updated file X (too vague, goes in Files Changed)

---

### **Files Changed**
List each file modified with line numbers (if specific) and what changed.

**Format:**
```
**Files Changed:**
- [ClientTable.tsx](../../src/components/ClientTable.tsx) — Added pagination & filters
- [useClients.ts](../../src/hooks/useClients.ts#L50-L100) — Refactored CRUD operations
- [migration_20260123.sql](../../supabase/migrations/migration_20260123.sql) — Fixed RLS policies
```

**Include:**
- File path (relative to workspace root)
- Line numbers if specific section (e.g., `#L50-L100`)
- Brief description of what changed

---

### **Tests Performed**
What did you test and what were the results?

**Format:**
```
**Tests Performed:**
- Login flow (Chrome) → ✅ PASS
- Form validation (empty fields) → ✅ PASS
- Unauthorized access (no JWT) → ❌ FAIL (need RLS fix)
- Performance (Lighthouse) → ⏳ PENDING (blocked on Component.lazy)
```

**Status indicators:**
- ✅ PASS — Test passed, good to go
- ❌ FAIL — Test failed, fix needed
- ⏳ PENDING — Test waiting on something else

---

### **Status**
Overall status of this task.

| Status | Meaning | When to Use |
|--------|---------|------------|
| ✅ COMPLETED | Task done, tested, ready for handoff | Done |
| 🔄 IN_PROGRESS | You are actively working on this | Ongoing |
| ⏳ PENDING | Task ready but not started | Awaiting assignment |
| ⏸️ BLOCKED | Cannot proceed, escalated to PM | Stuck |

---

### **Blocker Details**
Only fill this if Status = ⏸️ BLOCKED.

**Format:**
```
**Blocker Details:**
- Waiting on: Backend Developer (Xero credentials)
- Issue: Cannot implement Phase 7 without Xero sandbox client ID
- Escalated to: PM (Jan 23, 2:30 PM UTC)
- Decision: PM to get credentials from Xero, provide by Jan 24
```

**What to include:**
- **Waiting on:** Who/what is blocking you
- **Issue:** Clear description of blocker
- **Escalated to:** PM, with timestamp
- **Decision:** Once PM provides solution, what happened

---

### **Next Steps / Handoff**
What happens next? Who's the next agent?

**Format (if completing task):**
```
**Next Steps / Handoff:**
- Ready to handoff to Frontend Developer
- Phase 4: Timesheets module ready to start
- Mission brief: [phase4_mission_brief.md](../../.project/memory/phase4_mission_brief.md)
- Watch for: Timesheet status workflow complexity, coordinate with cost center updates
```

**Format (if continuing):**
```
**Next Steps:**
- Complete KanbanBoard drag-drop testing
- Fix mobile responsive issues (tablet layout)
- Run Lighthouse audit before handoff
```

---

## Linking Between Agent Logs

**Link to another agent's log entry:**
```
Related to: [Task Name](../../agent_logs/backend_developer.log.md#heading)
```

**Link to mission brief:**
```
Mission Brief: [phase4_mission_brief.md](../../memory/phase4_mission_brief.md)
```

**Link to manifest:**
```
Status tracked in: [manifest.json](../../manifest.json#L45)
```

---

## Session Header (Top of Log File)

Every log file starts with:

```markdown
# {Agent Role} - Progress Log

**Agent:** {Your Role Name}  
**Current Session:** {Session Start Date}  
**Last Updated:** {ISO Timestamp}

---

## Current Task

**Task:** {What you're working on}  
**Status:** {Status}  
**Started:** {Date}  
**Phase:** Phase {N}  
**Related Files:** 
- [List of key files]

---

## Session Log

[Entries below, newest first]
```

---

## Tips for Good Logging

### ✅ DO:
- Update log **immediately after** task completion
- Use clear, action-oriented language
- Include line numbers for specific code changes
- Link to mission briefs and dependent agent logs
- Mark blockers early (don't wait 2 hours)
- Note "INFERRED" work that you discovered
- Reference GitHub PR/commit if applicable

### ❌ DON'T:
- Write after 3+ tasks completed (too late to remember)
- Be vague: "updated files" instead of "ClientTable.tsx - added pagination"
- Forget to link to other agents (breaks dependency chain)
- Log code snippets (describe what changed instead)
- Mark ✅ COMPLETED if tests didn't pass
- Wait to escalate blockers (do it immediately)

---

## Example Entry (Real World)

```markdown
### 2026-01-23 - Fix Timesheet RLS Policy Bug

**Related Agent(s):** [Frontend Developer](../../agents/frontend-developer.agent.md) → Backend Developer → [QA Engineer](../../agents/qa-engineer.agent.md)  
**Blocks:** Phase 5 frontend testing (cannot fetch timesheets)  
**Depends On:** Database already migrated / None

**What I Did:**
- Identified duplicate RLS policies causing SELECT conflicts
- Created migration to drop all existing users table policies
- Implemented 3 clean policies: select_own, insert_during_signup, update_own
- Tested via service-role client (confirms policies work)
- Documented root cause in commit message

**Files Changed:**
- [20260123_clean_users_rls_policies.sql](../../supabase/migrations/20260123_clean_users_rls_policies.sql) — New migration, drops 12 conflicting policies
- [backend_developer.log.md](../../agent_logs/backend_developer.log.md) — Updated this log

**Tests Performed:**
- RLS policy query via service role → ✅ PASS
- No SQL errors in migration execution → ✅ PASS
- Browser login (after hard refresh) → ⏳ PENDING (user needs to test)

**Status:** ✅ COMPLETED

**Next Steps / Handoff:**
- Ready for Frontend Developer to test login flow
- User must hard-refresh browser (Ctrl+Cmd+Shift+R) to clear cached policies
- Monitor for any new RLS issues; if found, escalate to PM
```

---

## Checklist Before Marking COMPLETED

- [ ] All code changes committed and pushed
- [ ] All tests passed (or documented as pending)
- [ ] Blocker flags cleared
- [ ] Log entry complete with all fields filled
- [ ] Cross-references to other agents added
- [ ] Next agent's mission brief is ready
- [ ] PM notified (if handoff)

---

## Version History

- **v1.0** (Jan 23, 2026): Initial template created
