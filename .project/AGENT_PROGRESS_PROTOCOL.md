# 🤖 Agent Progress Tracking Protocol

**Version:** 1.0  
**Last Updated:** January 22, 2026  
**Purpose:** Standardize how sub-agents report progress to minimize orchestrator rediscovery work

---

## 🎯 Core Principle

**Every agent MUST update their progress file immediately after completing work.**

This enables:
- Fast status checks without file archaeology
- Clear handoff points between agents
- Easy debugging trace (who did what, when)
- Deviation tracking when phases diverge from plan

---

## 📁 File Structure

```
.project/
├── manifest.json                    (Single source of truth - features status)
├── timeline.md                      (Phase-level milestones)
├── AGENT_PROGRESS_PROTOCOL.md      (This file)
└── agent_logs/
    ├── frontend_developer.log.md   (Frontend agent progress)
    ├── backend_developer.log.md    (Backend agent progress)
    ├── qa_engineer.log.md          (QA agent progress)
    └── orchestrator.log.md         (PM/orchestrator decisions)
```

---

## 📋 Agent Log Format

Each agent maintains their own log file: `.project/agent_logs/{role}.log.md`

### Template Structure

```markdown
# {Agent Role} - Progress Log

**Agent:** {Role Name}  
**Current Session:** {Date/Time Started}  
**Last Updated:** {Timestamp}

---

## Current Task

**Task:** {Brief description}  
**Status:** {IN_PROGRESS | COMPLETED | BLOCKED}  
**Started:** {Timestamp}  
**Phase:** {Phase 1-7}  
**Related Files:** {List of files being worked on}

---

## Session Log

### {Date} - {Time} - {Task Title}

**What I Did:**
- Bullet point of action 1
- Bullet point of action 2
- Created file: path/to/file.ts
- Modified file: path/to/other.ts (lines 10-50)
- Fixed bug: description

**Files Changed:**
- `src/components/NewComponent.tsx` (created)
- `src/hooks/useNewHook.ts` (created)
- `src/types/index.ts` (added types, lines 45-60)

**Tests Performed:**
- Test 1 description → ✅ PASS / ❌ FAIL
- Test 2 description → ✅ PASS

**Status:** ✅ COMPLETED / 🔄 IN_PROGRESS / ❌ BLOCKED

**Blockers:** {None / List any blockers}

**Next Steps:** {What needs to happen next}

---

### {Previous Date} - {Previous Task}
...
```

---

## 🔄 Update Workflow

### When Starting Work

```markdown
## Current Task

**Task:** Implement Timesheets Module - Database Setup  
**Status:** IN_PROGRESS  
**Started:** 2026-01-22 14:30 UTC  
**Phase:** Phase 4  
**Related Files:**
- supabase/migrations/20260122_create_timesheets_tables.sql
```

### During Work (Optional - for long sessions)

Add checkpoint entries:

```markdown
**14:45 UTC** - Created timesheets table schema  
**15:00 UTC** - Added RLS policies (3/6 complete)  
**15:20 UTC** - Completed activity_types table
```

### When Completing Work

```markdown
### 2026-01-22 14:30-16:00 - Timesheets Database Setup

**What I Did:**
- Created migration file: `supabase/migrations/20260122_create_timesheets_tables.sql`
- Added timesheets table with 12 columns
- Added activity_types table
- Added cost_centers table
- Implemented 8 RLS policies (3 per table + 2 admin policies)
- Ran migration successfully
- Verified tables exist in Supabase dashboard

**Files Changed:**
- `supabase/migrations/20260122_create_timesheets_tables.sql` (created, 150 lines)

**Tests Performed:**
- Migration runs without errors → ✅ PASS
- Can insert test timesheet → ✅ PASS
- RLS blocks unauthorized access → ✅ PASS

**Status:** ✅ COMPLETED

**Blockers:** None

**Next Steps:** Frontend developer can now implement TimesheetsPage component

---

## Current Task

**Task:** None (waiting for next assignment)  
**Status:** IDLE  
**Last Completed:** 2026-01-22 16:00 UTC
```

### When Blocked

```markdown
**Status:** ❌ BLOCKED

**Blockers:**
- Need clarification on cost center budget calculation logic
- Waiting for backend API endpoint: `/api/timesheets/approve`
- RLS policy failing for manager role (bug in users table?)

**Attempted Solutions:**
- Tried workaround A (failed)
- Checked documentation (unclear)

**Escalation:** Notified orchestrator in main chat

**Next Steps:** Blocked until resolved
```

---

## 🎯 Manifest Update Protocol

After completing a **feature** (not just a task), agent must also update:

### `.project/manifest.json`

```json
{
  "coreFeatures": [
    {
      "id": 6,
      "name": "Timesheets Module",
      "phase": "Phase 4",
      "priority": "P0",
      "status": "COMPLETED",  // ← Update this
      "completedBy": "Frontend Developer",  // ← Add this
      "completedAt": "2026-01-22T16:00:00Z",  // ← Add this
      "description": "..."
    }
  ]
}
```

### How to Update

Add these fields when marking a feature COMPLETED:
- `"completedBy"`: Agent role (e.g., "Frontend Developer")
- `"completedAt"`: ISO timestamp of completion

---

## 🚦 Status Definitions

### Agent Log Statuses
- **IN_PROGRESS**: Currently working on task
- **COMPLETED**: Task finished, tested, ready for next step
- **BLOCKED**: Cannot proceed, needs help/clarification
- **IDLE**: No active task, awaiting assignment

### Feature Statuses (Manifest)
- **NOT_STARTED**: No work begun
- **IN_PROGRESS**: Agent actively working
- **COMPLETED**: Feature fully implemented and tested
- **BLOCKED**: Work halted due to blocker

---

## 🔍 Orchestrator Quick Check

When I (orchestrator) need to assess progress, I will:

1. **Read agent logs first**: `.project/agent_logs/*.log.md`
2. **Check manifest**: `.project/manifest.json` (feature status)
3. **Check timeline**: `.project/timeline.md` (phase status)
4. **Only if unclear**: Read actual code files

This saves time and prevents rediscovery work.

---

## 📝 Agent Responsibilities

### Frontend Developer
- Updates: `.project/agent_logs/frontend_developer.log.md`
- Logs: All UI component work, hooks, pages, styling
- Frequency: After each component or feature completion

### Backend Developer
- Updates: `.project/agent_logs/backend_developer.log.md`
- Logs: API endpoints, migrations, RLS policies, backend logic
- Frequency: After each API or migration completion

### QA Engineer
- Updates: `.project/agent_logs/qa_engineer.log.md`
- Logs: Test results, bugs found, verification status
- Frequency: After each testing session

### Orchestrator (PM)
- Updates: `.project/agent_logs/orchestrator.log.md`
- Logs: Decisions, handoffs, scope changes, blockers resolved
- Frequency: After each major decision or phase transition

---

## 🚨 Deviation Tracking

When deviating from planned phases (e.g., debugging, hotfixes):

```markdown
### 2026-01-22 17:00 - DEVIATION: Critical Bug Fix

**Planned:** Continue Phase 4 implementation  
**Actual:** Diverted to fix RLS policy bug in users table

**What I Did:**
- Debugged infinite redirect loop in Welcome.tsx
- Created hotfix migration: 20260122_fix_users_rls_circular_dependency.sql
- Updated AuthContext.tsx error handling

**Impact on Timeline:**
- Phase 4 delayed by 2 hours
- Bug fix took priority (P0)

**Status:** ✅ RESOLVED

**Next Steps:** Resume Phase 4 where left off
```

This makes it easy to see why timelines shifted.

---

## ✅ Compliance Checklist

Every agent must:
- [ ] Update their log file after completing each task
- [ ] Include "Files Changed" section with specific paths
- [ ] Mark status clearly (IN_PROGRESS, COMPLETED, BLOCKED)
- [ ] Update manifest.json when completing a feature
- [ ] Log deviations from planned work
- [ ] Keep "Current Task" section accurate

---

## 🎯 Benefits

**For Orchestrator:**
- No rediscovery archaeology
- Fast status assessment
- Clear handoff points
- Easy debugging trace

**For Agents:**
- Clear accountability
- Self-documentation
- Easy to pick up where left off
- Shows progress to user

**For User:**
- Transparency into what's happening
- Easy to spot issues
- Clear audit trail
- Can see agent activity

---

## 🔄 Example Session Flow

```
1. Orchestrator assigns task → Creates handoff doc
2. Agent reads handoff → Updates log: "IN_PROGRESS"
3. Agent works → Optional: Adds checkpoints
4. Agent completes → Updates log: "COMPLETED" + details
5. Agent updates manifest → Marks feature status
6. Orchestrator checks logs → Sees completion, assigns next task
```

---

**This protocol is MANDATORY for all agents starting January 22, 2026.**

**Questions? See orchestrator in main chat.**
