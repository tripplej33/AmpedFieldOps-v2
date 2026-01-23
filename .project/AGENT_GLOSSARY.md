# Agent Glossary & Standard Definitions

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Purpose:** Single source of truth for terminology across all agents

---

## Phase Status Indicators

These symbols appear in logs and handoff documents:

| Symbol | Meaning | When to Use |
|--------|---------|------------|
| ✅ | **COMPLETED** | Task is done, tested, ready for next phase |
| 🔄 | **IN_PROGRESS** | Agent is actively working on this task |
| ⏸️ | **BLOCKED** | Waiting for external dependency; escalated to PM |
| ❌ | **FAILED** | Task attempted but failed; requires intervention |
| ⏳ | **PENDING** | Task ready but not started yet; awaiting assignment |
| 🔗 | **DEPENDENT** | Blocked by another agent's work |

---

## Priority Levels

| Level | Definition | Action |
|-------|-----------|--------|
| **P0 - Blocker** | Feature broken, app unusable | Fix immediately, escalate to PM |
| **P1 - Major** | Feature limited or broken workflow | Fix before next phase |
| **P2 - Minor** | Cosmetic or edge case issue | Document, fix in later sprint |
| **P3 - Polish** | Nice-to-have improvement | Backlog, low priority |

---

## Agent Roles & Responsibilities

| Agent | Phase(s) | Responsibility | Reports To |
|-------|----------|------------------|-----------|
| **Frontend Developer** | 1-6 | React components, forms, UI logic, responsive design | PM |
| **Backend Developer** | 7+ | Express server, Xero API, service-role operations, webhooks | PM |
| **QA Engineer** | Throughout | Testing, bug reports, performance audits, UAT | PM |
| **Janitor** | Post-Phase | Archive logs, compress timelines, clean context | PM |
| **Orchestrator (PM)** | All | Coordination, handoffs, blockers, decisions | User |

---

## Key Terminology

### **Handoff**
- **Definition:** Transition of work from one agent to next
- **Trigger:** Previous agent marks task ✅ COMPLETED
- **Requirements:** 
  - Log updated with final status
  - All code pushed to main
  - Next agent's mission brief ready
  - Cross-reference links added

### **Blocker**
- **Definition:** Work cannot proceed without external dependency
- **Examples:** 
  - Database schema missing (frontend blocked by backend)
  - Xero credentials not provided (backend blocked by PM)
  - Previous phase has P0 bugs (next phase blocked)
- **Action:** Log as ⏸️ BLOCKED, escalate to PM immediately

### **Mission Brief**
- **Definition:** Detailed scope document for a phase
- **Location:** `.project/memory/phase{N}_mission_brief.md`
- **Created By:** PM (Orchestrator)
- **Used By:** Agent starting that phase

### **Progress Log**
- **Definition:** Agent's work journal for a phase
- **Location:** `.project/agent_logs/{agent_name}.log.md`
- **Format:** See AGENT_LOG_TEMPLATE.md
- **Updated:** After every task completion

### **Escalation**
- **Definition:** Reporting blocker or critical issue to PM
- **When:** Stuck > 30 minutes, P0 bug found, decision needed
- **How:** Add ⏸️ BLOCKED entry to log with details, notify PM immediately

---

## Log File Locations

```
.project/
├── agent_logs/
│   ├── frontend_developer.log.md       ← Frontend agent
│   ├── backend_developer.log.md        ← Backend agent
│   ├── qa_engineer.log.md              ← QA agent
│   ├── orchestrator.log.md             ← PM/Orchestrator
│   └── janitor.log.md                  ← Janitor agent (if exists)
├── AGENT_GLOSSARY.md                   ← This file
├── AGENT_DEPENDENCY_CHAIN.md           ← Phase/agent sequence
└── AGENT_LOG_TEMPLATE.md               ← Standard entry format
```

---

## Related Agent References

When logging, reference other agents by:

### **Previous Agent**
```
**Depends On:** [Agent Name] - Phase X
**Previous Agent's Log:** [agent_logs/role.log.md](../../agent_logs/role.log.md)
```

### **Next Agent**
```
**Unblocks:** [Agent Name] - Phase X+1
**Next Agent's Log:** [agent_logs/role.log.md](../../agent_logs/role.log.md)
```

### **Related Work**
```
**Related Agent:** [Agent Name]
**Related Task:** [Task Name]
**Link:** [agent_logs/role.log.md#section](../../agent_logs/role.log.md#section)
```

---

## Handoff Verification Checklist

When receiving a handoff, verify:

- [ ] Previous agent's log shows ✅ COMPLETED
- [ ] All "marked complete" features actually work (spot check)
- [ ] No ⏸️ BLOCKED flags in previous log
- [ ] PM's phase handoff document reviewed
- [ ] Mission brief for your phase is clear
- [ ] Any ⚠️ INFERRED work properly documented
- [ ] You've asked clarifying questions if needed

---

## Escalation Path

```
Agent (Stuck/Blocker)
    ↓
Add ⏸️ BLOCKED entry to progress log
    ↓
Notify PM immediately (chat message)
    ↓
PM updates orchestrator.log.md
    ↓
PM decides: Fix, workaround, or replanning
    ↓
Agent notified of decision
    ↓
Log decision and proceed
```

---

## Database Schema Reference

For agents needing to reference database structure:
- **Active Schema:** `supabase/migrations/` (all .sql files)
- **RLS Policies:** Check each migration for policies
- **Auth Context:** `src/contexts/AuthContext.tsx` (current user scope)

---

## Commit Message Standard

When pushing code after task completion:

```
[Phase {N}] {Agent Role}: {Task Name}

- {Bullet 1}
- {Bullet 2}

Relates to: Phase {N} mission brief
Logs: agent_logs/{role}.log.md
Status: {✅ COMPLETED / 🔄 IN_PROGRESS}
```

---

## Questions This Glossary Answers

**Q: Should I use ⏳ PENDING or 🔄 IN_PROGRESS?**  
A: ⏳ PENDING = Not started yet. 🔄 IN_PROGRESS = You are actively working on it.

**Q: What's the difference between Blocker and Issue?**  
A: Blocker (P0) = Cannot proceed. Issue (P1/P2) = Document, note, continue.

**Q: Do I reference PM or Orchestrator?**  
A: Same person/role. "PM" in conversation, "Orchestrator" in technical docs.

**Q: Where do I find the previous agent's work?**  
A: Their progress log at `.project/agent_logs/{role}.log.md` + mission brief at `.project/memory/phase{N}_mission_brief.md`

**Q: How do I link to another agent's log entry?**  
A: Use markdown link: `[Task Name](../../agent_logs/role.log.md#section)`

---

## Version History

- **v1.0** (Jan 23, 2026): Initial glossary created, standardized terminology
