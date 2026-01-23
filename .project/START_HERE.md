# 🎯 Agent Coordination System - Start Here!

**Welcome to the improved agent coordination system!**

This document is your **starting point**. Everything you need is organized below.

---

## 📖 Read These First (Pick Your Role)

### 🔵 If You're the PM (Orchestrator)
Start here:
1. [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) (5 min) — Shared terminology
2. [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) (5 min) — Phase sequence
3. `.github/agents/pm.agent.md` (10 min) — Your coordination duties
4. [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md) (bookmark this)

**Your job:** Verify logs, hand off phases, resolve blockers

---

### 🟢 If You're a Developer (Frontend or Backend)
Start here:
1. [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) (5 min) — Status icons & terminology
2. [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) (5 min) — Know your place
3. `.github/agents/{your-role}.agent.md` (10 min) — Your responsibilities
4. [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md) (bookmark this)

**Your job:** Complete tasks, log them immediately, help next agent

---

### 🟡 If You're QA Engineer
Start here:
1. [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) (5 min) — Terminology & bug format
2. [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) (5 min) — When you test
3. `.github/agents/qa-engineer.agent.md` (10 min) — Your responsibilities
4. [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md) (bookmark this)

**Your job:** Test features, find bugs, log results clearly

---

### 🟠 If You're Janitor (Project Maintenance)
Start here:
1. [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) (5 min) — Terminology
2. `.github/agents/janitor.agent.md` (10 min) — Your responsibilities
3. [AGENT_COORDINATION_HUB.md](AGENT_COORDINATION_HUB.md) (5 min) — Where you fit
4. [AGENT_LOG_TEMPLATE.md](AGENT_LOG_TEMPLATE.md) (for your cleanup logs)

**Your job:** Archive old work, keep context lean every 5 tasks

---

## 🚀 When You Start Your First Task

### Your Checklist:
```
□ Read mission brief: .project/memory/phase{N}_mission_brief.md
□ Read previous agent's log: .project/agent_logs/{previous_role}.log.md
□ Make sure previous agent shows ✅ COMPLETED (not ⏸️ BLOCKED)
□ Verify you have all credentials/access needed
□ Ask PM clarifying questions (get answers in 30 min)
□ Start working
```

---

## 📝 After Your First Task Completes

### Logging Checklist:
```
□ Code committed to main
□ Tests passed
□ Open: .project/agent_logs/{your_role}.log.md
□ Copy template from AGENT_LOG_TEMPLATE.md
□ Fill in: What I did, Files changed, Tests, Status
□ Add "Related Agent(s)" section
□ Mark status: ✅ COMPLETED (if tests passed) or ⏸️ BLOCKED (if stuck)
□ Save
□ Done! (~5-10 minutes)
```

---

## 🆘 If You Get Stuck (Blocker)

### Fast Track to Unblock:
```
1. Log entry in your progress log: Status = ⏸️ BLOCKED
2. Add details: Waiting on [what/who], Issue: [description]
3. Notify PM immediately in chat
4. PM reviews your log and decides: fix it, workaround, or replanning
5. Update log with PM's decision
6. Resume work or pivot
```

**KEY:** Don't wait > 30 minutes. Escalate early.

---

## 📂 File Directory (Everything You Need)

```
.project/                           ← All coordination files here
├── AGENT_GLOSSARY.md              ← Terminology (read first)
├── AGENT_DEPENDENCY_CHAIN.md      ← Phase sequence (read second)
├── AGENT_LOG_TEMPLATE.md          ← Copy this when logging
├── AGENT_QUICK_REFERENCE.md       ← Bookmark this (printable)
├── AGENT_COORDINATION_HUB.md      ← Central reference
├── IMPLEMENTATION_CHECKLIST.md    ← What was created
├── AGENT_SYSTEM_IMPLEMENTATION.md ← Detailed summary
│
├── agent_logs/                     ← Progress logs (one per agent)
│   ├── frontend_developer.log.md
│   ├── backend_developer.log.md
│   ├── qa_engineer.log.md
│   ├── orchestrator.log.md
│   └── janitor.log.md
│
└── memory/                         ← Phase-level context
    ├── phase{N}_mission_brief.md  ← Your scope (read before starting)
    ├── phase{N}_test_plan.md      ← (QA only)
    └── current_task.md            ← PM updates this

.github/agents/                     ← Agent specifications
├── pm.agent.md                    ← PM role (UPDATED)
├── frontend-developer.agent.md    ← Frontend role (UPDATED)
├── backend-developer.agent.md     ← Backend role (UPDATED)
├── qa-engineer.agent.md           ← QA role (UPDATED)
└── janitor.agent.md               ← Janitor role (UPDATED)
```

---

## ✅ Key Things to Remember

### Status Icons (Learn These)
- ✅ COMPLETED — Task done, tested, ready for next
- 🔄 IN_PROGRESS — You're actively working on it
- ⏸️ BLOCKED — Stuck, escalated to PM
- ⏳ PENDING — Ready but not started
- ❌ FAILED — Test failed, fix needed

### Logging Rule
**Every task → Logged immediately after completion**  
Takes 5-10 min. Saves 25-30 min when PM needs context.  
Not optional. Do it.

### Handoff Rule
**Previous agent must show ✅ COMPLETED before you start**  
No ⏸️ BLOCKED flags allowed. No exceptions.

### Escalation Rule
**Stuck > 30 minutes? Escalate immediately.**  
Don't wait hours. Add ⏸️ BLOCKED entry to log, notify PM.

### Cross-Reference Rule
**Every log entry includes Related Agent(s)**  
Shows who you depend on, who depends on you.

---

## 🎓 Learning Path (20 minutes)

| Time | Action | File |
|------|--------|------|
| 0-5 min | Read terminology | [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) |
| 5-10 min | Understand phase sequence | [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) |
| 10-20 min | Read your agent spec | `.github/agents/{your-role}.agent.md` |
| After | Bookmark quick reference | [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md) |

**Total time:** 20 minutes (one time only)

---

## 💡 Pro Tips

1. **Bookmark AGENT_QUICK_REFERENCE.md** — You'll reference it every day
2. **Copy AGENT_LOG_TEMPLATE.md** — Don't type from scratch, copy & fill
3. **Read previous agent's final log entry** — Faster than reading code
4. **Ask PM early if confused** — 30 min conversation > 3 hours wasted
5. **Log immediately, don't wait** — Details get fuzzy after 3 tasks

---

## ❓ Quick Questions

| Q | A | Find It |
|----|---|---------|
| What status icons should I use? | ✅ 🔄 ⏸️ ⏳ ❌ | [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md#phase-status-indicators) |
| How do I log my work? | Copy template, fill in fields | [AGENT_LOG_TEMPLATE.md](AGENT_LOG_TEMPLATE.md) |
| Who should I reference in logs? | Previous & next agent | [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) |
| What if I'm stuck? | Escalate to PM within 30 min | [AGENT_COORDINATION_HUB.md](AGENT_COORDINATION_HUB.md#-blocker-escalation-path) |
| Where are all the files? | See directory above | This document |
| What's my exact job? | Read your agent spec | `.github/agents/{your-role}.agent.md` |

---

## 🎯 Success Looks Like

✅ You log after every task (5-10 min)  
✅ Your logs reference other agents  
✅ You escalate blockers within 30 min  
✅ Next agent understands your work from your log  
✅ No time spent reading code trying to figure out what happened  
✅ Handoffs are smooth  
✅ PM says "Thanks for logging clearly!"  

---

## 📞 Need Help?

### Check These First:
1. [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md) — Common Q&A
2. [AGENT_COORDINATION_HUB.md](AGENT_COORDINATION_HUB.md) — How-to guide
3. [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) — Terminology reference

### Still Stuck?
**Ask PM (Orchestrator).** They coordinate everything.

---

## 🎉 You're All Set!

Everything is ready. Start your phase with:

1. ✅ Read the files in your role section above
2. ✅ Read the mission brief for your phase
3. ✅ Verify previous agent's log shows ✅ COMPLETED
4. ✅ Start working
5. ✅ Log after each task (use template)

**Welcome to the new system!** 🚀

---

## 📋 Files at a Glance

| File | Size | Purpose | Read When |
|------|------|---------|-----------|
| [AGENT_GLOSSARY.md](AGENT_GLOSSARY.md) | 6.2 KB | Terminology | First time |
| [AGENT_DEPENDENCY_CHAIN.md](AGENT_DEPENDENCY_CHAIN.md) | 11 KB | Phase sequence | First time |
| [AGENT_LOG_TEMPLATE.md](AGENT_LOG_TEMPLATE.md) | 9.5 KB | Log format | Every logging |
| [AGENT_QUICK_REFERENCE.md](AGENT_QUICK_REFERENCE.md) | 6.3 KB | Quick facts | Bookmark it |
| [AGENT_COORDINATION_HUB.md](AGENT_COORDINATION_HUB.md) | 8.3 KB | Central reference | Troubleshooting |
| [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) | 13 KB | What was built | PM review |
| [AGENT_SYSTEM_IMPLEMENTATION.md](AGENT_SYSTEM_IMPLEMENTATION.md) | 12 KB | Full summary | PM review |

---

**Version:** 1.0  
**Status:** ✅ Ready to use  
**Deployed:** January 23, 2026

**Next Step:** Read files for your role (20 min) and start your phase!
