# Agent Coordination Hub

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Purpose:** Central reference for all agent coordination practices

---

## 🚀 Getting Started as an Agent

### Development Environment Setup

Before anything else, start the dev server on the correct port:

```bash
cd /root/AmpedFieldOps-v2
npm run dev        # Starts on port 5173 (configured in vite.config.ts)
```

**Server will be ready at:**
- `http://localhost:5173` (local)
- `http://192.168.1.124:5173` (network)

**Important:** Always use port 5173. Never change the port or start multiple instances on different ports.

---

### First Time Setup (Do This Once)

1. **Read the Glossary** → [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) (5 min)
   - Learn status icons: ✅ 🔄 ⏸️ ⏳ ❌
   - Learn priority levels: P0, P1, P2, P3
   - Learn agent roles

2. **Read Your Agent File** → `/root/.github/agents/{your-role}.agent.md` (10 min)
   - Your responsibilities for each phase
   - Your coordination requirements
   - Your logging requirements

3. **Review Dependency Chain** → [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) (5 min)
   - See where your work fits
   - Who depends on you
   - Who you depend on

4. **Bookmark Quick Reference** → [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md)
   - File locations
   - Logging checklist
   - Common questions

**Total Setup Time:** ~20 minutes (one time only)

---

## 📝 Logging Workflow

### Every Task Completion (5-10 minutes)

```
Task Completed ✅
    ↓
All code committed to main ✅
    ↓
Tests passed ✅
    ↓
Open your log file
    ↓
Copy template from AGENT_LOG_TEMPLATE.md
    ↓
Fill in entry:
  - What did I do
  - Files changed (with line numbers)
  - Tests performed (pass/fail/pending)
  - Related Agent(s)
  - Status: ✅ COMPLETED
    ↓
If ⏸️ BLOCKED:
  - Add blocker details
  - Notify PM immediately
    ↓
Save entry
    ↓
Continue to next task
```

---

## 🔗 Cross-Agent References

### Linking Between Logs

**To reference another agent's log:**
```markdown
Related: [Task Name](../../agent_logs/backend_developer.log.md#section)
```

**To reference a mission brief:**
```markdown
Mission: [phase4_mission_brief.md](../../memory/phase4_mission_brief.md)
```

**To reference code:**
```markdown
Files: [ClientTable.tsx](../../src/components/ClientTable.tsx#L50-L75)
```

---

## 🎯 Phase Transitions & Handoffs

### Before Handing Off to Next Agent

```
Task Complete (✅ COMPLETED in log)
    ↓
Code merged to main
    ↓
Next agent's mission brief ready
    ↓
Verify no ⏸️ BLOCKED flags
    ↓
Update log with: "Ready to handoff to [Agent Name], Phase X"
    ↓
Notify PM: "Phase N ready for [Agent Name]"
    ↓
Next agent can start (PM confirms)
```

### Before Starting Your Phase

```
PM provides mission brief
    ↓
Read previous agent's final log entry
    ✓ Status = ✅ COMPLETED
    ✓ No ⏸️ BLOCKED flags
    ✓ All code merged
    ↓
Read mission brief
    ↓
Ask PM clarifying questions (get answers in 30 min)
    ↓
Start implementation
    ↓
Begin logging tasks as completed
```

---

## 🚨 Blocker Escalation Path

### When You Get Stuck (> 30 minutes)

```
Can't proceed because of: [reason]
    ↓
Add ⏸️ BLOCKED entry to your log with:
  - Waiting on: [what/who]
  - Issue: [clear description]
  - Impact: [what can't you do]
    ↓
Notify PM immediately in chat
    ↓
PM reviews your log
    ↓
PM decides:
  ✅ Fix it (provide credential, answer question, etc.)
  ✅ Workaround (alternative approach)
  ✅ Replanning (change scope, reduce expectations)
    ↓
Update log with PM's decision
    ↓
Resume work or pivot
```

**Key:** Don't wait > 30 minutes. Escalate early.

---

## 📊 Agent Dependency Tree

```
┌─────────────────────────────────────────┐
│         Orchestrator (PM)               │
│  Manages: State, Handoffs, Decisions    │
└────┬────────────────────────────────┬───┘
     │                                │
     ↓                                ↓
┌──────────────────┐      ┌──────────────────┐
│ Frontend Dev     │      │  Backend Dev     │
│ Phase 1-5        │      │  Phase 7-8       │
│ Blocks: QA, BE   │      │  Depends: FE 5   │
│ Log: frontend... │      │  Blocks: QA      │
└────┬─────────────┘      └──────────┬───────┘
     │                               │
     └───────────────┬───────────────┘
                     ↓
            ┌──────────────────┐
            │  QA Engineer     │
            │  Phase 6, 9      │
            │  Tests all work  │
            │  Log: qa_eng...  │
            └────┬─────────────┘
                 ↓
            ┌──────────────────┐
            │  Janitor         │
            │  Post-Phase      │
            │  Cleans context  │
            │  Log: janitor... │
            └──────────────────┘
```

---

## 📋 Standard File Checklist

Every agent needs access to these files:

- [ ] `.github/agents/{your-role}.agent.md` — Your job description
- [ ] `.project/AGENT_GLOSSARY.md` — Terminology
- [ ] `.project/AGENT_DEPENDENCY_CHAIN.md` — Phase sequence
- [ ] `.project/AGENT_LOG_TEMPLATE.md` — Logging template
- [ ] `.project/AGENT_QUICK_REFERENCE.md` — Quick facts
- [ ] `.project/agent_logs/{your_role}.log.md` — Your progress log
- [ ] `.project/memory/phase{N}_mission_brief.md` — Your scope
- [ ] `.project/manifest.json` — Feature status overview

---

## 🎯 Key Coordination Rules

### Rule 1: Always Log After Task Completion
- ✅ DO: Log immediately after task is done
- ❌ DON'T: Log after 3+ tasks (too late to remember)

### Rule 2: Link to Other Agents
- ✅ DO: Add "Related Agent(s)" section to every log entry
- ❌ DON'T: Work in isolation, ignore who depends on you

### Rule 3: Escalate Early
- ✅ DO: Flag blockers after 30 minutes
- ❌ DON'T: Spend 3 hours stuck before asking for help

### Rule 4: Verify Previous Work
- ✅ DO: Check previous agent's log before starting your phase
- ❌ DON'T: Assume work is done, verify it

### Rule 5: Mark Status Correctly
- ✅ DO: Mark ✅ COMPLETED only if tests passed
- ❌ DON'T: Mark done if still testing or code not committed

### Rule 6: Reference Everything
- ✅ DO: Include file paths, line numbers, mission briefs
- ❌ DON'T: Say "updated files" without specifics

---

## 📞 Quick Help

| Need | Where to Find |
|------|---------------|
| Status icons | [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md#phase-status-indicators) |
| Phase sequence | [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) |
| Logging template | [AGENT_LOG_TEMPLATE.md](AGENT_LOG_TEMPLATE.md) |
| Your log file | `.project/agent_logs/{your_role}.log.md` |
| Mission brief | `.project/memory/phase{N}_mission_brief.md` |
| Your job | `.github/agents/{your-role}.agent.md` |
| Quick facts | [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md) |
| Agent roles | [AGENT_GLOSSARY.md#agent-roles--responsibilities](AGENT_GLOSSARY.md#agent-roles--responsibilities) |
| Questions | Ask PM (Orchestrator) |

---

## 🔄 Continuous Improvement

If you find something confusing or missing:

1. **Document it** — Note what was unclear
2. **Work around it** — Find a solution that works
3. **Tell PM** — Report the issue so it can be improved
4. **Update docs** — PM will improve guides based on feedback

This system improves based on real agent feedback.

---

## ✅ Success Criteria

You're doing great if:

- ✅ Every task is logged immediately after completion
- ✅ Logs include: what I did, files changed, tests, status
- ✅ You cross-reference other agents in your logs
- ✅ You escalate blockers within 30 minutes
- ✅ You verify previous agent's work before starting
- ✅ No P0 bugs slip through to next phase
- ✅ Handoffs are smooth (next agent knows what to do)

---

## 📌 Final Reminders

> **"Every log entry is an investment that saves 5x the time later."**

- 5 min to log now = 25 min saved when PM needs context
- Clear cross-references = no file archaeology needed
- Early blocker escalation = less time stuck
- Detailed testing notes = faster QA cycles

**Your job is not done until it's logged.**

---

**Version:** 1.0 | **Last Updated:** January 23, 2026  
**For improvements:** Feedback welcome from all agents
