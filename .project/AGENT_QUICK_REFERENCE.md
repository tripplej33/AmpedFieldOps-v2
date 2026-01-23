# Quick Reference: Agent Coordination & Logging

**Print this out. Every agent should know these facts.**

---

## Development Server

**Port:** Always run on `5173` (configured in `vite.config.ts`)

```bash
# Start dev server
npm run dev          # Automatically uses port 5173

# Server will be available at:
# http://localhost:5173
# http://192.168.1.124:5173 (network)
```

---

## File Locations (Memorize These)

```
.project/
├── AGENT_GLOSSARY.md              ← Terminology ( status icons, priority levels)
├── AGENT_DEPENDENCY_CHAIN.md      ← Phase sequence (who works when)
├── AGENT_LOG_TEMPLATE.md          ← Copy this when logging
├── agent_logs/
│   ├── frontend_developer.log.md
│   ├── backend_developer.log.md
│   ├── qa_engineer.log.md
│   ├── orchestrator.log.md
│   └── janitor.log.md
└── memory/
    ├── phase{N}_mission_brief.md  ← Your scope (read first!)
    └── phase{N}_test_plan.md      ← QA scope (testing instructions)
```

---

## Status Icons (Always Use These)

| Icon | Meaning | Example |
|------|---------|---------|
| ✅ | COMPLETED - Done, tested, ready for next | "Status: ✅ COMPLETED" |
| 🔄 | IN_PROGRESS - You're actively working | "Status: 🔄 IN_PROGRESS" |
| ⏸️ | BLOCKED - Stuck, escalated to PM | "Status: ⏸️ BLOCKED" |
| ⏳ | PENDING - Ready but not started | "Status: ⏳ PENDING" |
| ❌ | FAILED - Attempted but didn't work | "Test: ❌ FAIL" |

---

## Logging Checklist (Do This Every Task)

- [ ] Task is actually done (not in progress)
- [ ] All code committed to `main`
- [ ] Tests passed (or marked ⏳ PENDING with reason)
- [ ] Open `.project/agent_logs/{your_role}.log.md`
- [ ] Copy template from `.project/AGENT_LOG_TEMPLATE.md`
- [ ] Fill in: What did I do, Files changed (with line numbers), Tests, Status
- [ ] Add "Related Agent(s)" section (previous/next agent)
- [ ] If blocked: Add ⏸️ BLOCKED details
- [ ] Notify PM immediately if ⏸️ BLOCKED
- [ ] Save & check formatting

**Time spent logging:** ~5-10 minutes per task completion  
**Time saved not rediscovering work:** ~30-60 minutes

---

## Agent Sequence (At a Glance)

```
Phase 1-5: Frontend Developer
           ↓
Phase 6:   QA Engineer (testing)
           ↓
Phase 7-8: Backend Developer
           ↓
Phase 9:   QA Engineer (integration testing)
           ↓
Launch!
```

**Key Rule:** Previous phase must be ✅ COMPLETED before next agent starts.

---

## Blocker Escalation (Fast Track)

**If stuck > 30 minutes:**

1. Add entry to log: `Status: ⏸️ BLOCKED`
2. Include: "Waiting on: [what/who]"
3. Include: "Issue: [description]"
4. Notify PM in chat: "I'm blocked, see log"
5. PM will decide: fix it, workaround, or replanning
6. Wait for PM response
7. Update log with PM's decision
8. Resume work

**Don't wait longer than 30 minutes. Escalate early.**

---

## How to Reference Other Agents

**In your log entry, link to who you depend on:**

```markdown
**Related Agent(s):** 
[Backend Developer](../../agent_logs/backend_developer.log.md) 
→ Frontend Developer 
→ [QA Engineer](../../agent_logs/qa_engineer.log.md)
```

**In file paths, use relative from workspace root:**
```
[ClientTable.tsx](../../src/components/ClientTable.tsx)
[mission brief](../../.project/memory/phase3_mission_brief.md)
```

---

## Handoff Verification (Check This)

Before you start a phase, verify the previous agent finished:

```
✅ Previous agent's log shows ✅ COMPLETED
✅ No ⏸️ BLOCKED flags in their log
✅ All code merged to main
✅ Your mission brief is ready & clear
✅ You have all needed credentials/access
```

If anything is missing, ask PM before starting.

---

## Common Questions

**Q: Do I log during work or after?**  
A: After. Log when task is done, tested, and ready for next agent.

**Q: What if I'm still working on the task?**  
A: Don't log yet. Wait until ✅ COMPLETED.

**Q: Can I log multiple tasks in one entry?**  
A: No. One log entry = one task completion. Log immediately after.

**Q: What if I find a bug in previous agent's work?**  
A: Log it as "Bug found in Phase X: [description]", escalate to PM.

**Q: Who should I ask if I'm confused?**  
A: PM (Orchestrator). They coordinate everything.

**Q: How detailed should my log entry be?**  
A: Detailed enough that a fresh developer could understand what you did without reading code.

**Q: Do I need to link files if I only changed one small thing?**  
A: Yes. Always include file paths and line numbers. It helps everyone.

**Q: What if my test failed?**  
A: Log the failure details, mark as ❌ FAIL, escalate to PM if P0 blocker.

---

## Reference Documents to Know

| Document | Purpose | Read When |
|----------|---------|-----------|
| `.project/AGENT_GLOSSARY.md` | Terminology (status icons, priorities) | Before first log entry |
| `.project/AGENT_DEPENDENCY_CHAIN.md` | Phase sequence & who depends on whom | Before starting your phase |
| `.project/AGENT_LOG_TEMPLATE.md` | Template to copy/paste for logging | Every log entry |
| `.project/memory/phase{N}_mission_brief.md` | Your scope for this phase | Before you start |
| `.project/agent_logs/{role}.log.md` | Your progress log | Every time you log |
| `.project/manifest.json` | Feature status (high-level) | To see big picture |

---

## Commit Message Standard

When pushing code after a task:

```
[Phase N] {Agent Role}: {Task Name}

- Bullet 1
- Bullet 2

Relates to: Phase N mission brief
Logs: agent_logs/{role}.log.md
Status: ✅ COMPLETED
```

Example:
```
[Phase 3] Frontend Developer: Projects Kanban drag-drop

- Implemented drag-drop with react-beautiful-dnd
- Added status transition notifications
- Fixed mobile responsive issues

Relates to: Phase 3 mission brief (Projects module)
Logs: agent_logs/frontend_developer.log.md
Status: ✅ COMPLETED
```

---

## Pro Tips for Faster Logging

1. **Copy template first:** Don't type from scratch. Copy `.project/AGENT_LOG_TEMPLATE.md`
2. **Link intelligently:** Use relative paths that work from workspace root
3. **Be specific with line numbers:** `file.tsx#L50-L75` not just `file.tsx`
4. **Test before logging:** Run tests, confirm pass, then log
5. **Log immediately:** Don't wait. Do it right after task finishes
6. **Ask PM early:** If confused, ask before you waste time

---

## When NOT to Log

- Task still in progress (wait until ✅ COMPLETED)
- Code not yet committed (commit first, then log)
- Tests not run (run tests first, log results)
- Uncertain if done (ask PM before logging)

---

**Version:** 1.0 | **Last Updated:** January 23, 2026  
**For questions:** Ask PM (Orchestrator)
