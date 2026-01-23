# AmpedFieldOps V2 - Archive Index

**Purpose:** Master index of all archived project documentation  
**Last Updated:** January 23, 2026  
**Maintained By:** Janitor Agent

---

## Directory Structure

```
.project/archive/
├── ARCHIVE_INDEX.md              # This file
├── project_history.md            # Compressed timeline entries
├── handoffs/                     # Archived handoff documents
│   └── (organized by date/phase)
├── memory/                       # Old mission briefs & completion reports
│   └── (organized by phase)
└── agent_logs/                   # Rotated agent logs
    └── YYYY-MM/                  # Monthly archives
```

---

## Archive Contents

### Project History
- **File:** [project_history.md](./project_history.md)
- **Contains:** Detailed completion reports for all finished phases
- **Updated:** After each phase completion by Janitor Agent

### Handoff Documents
- **Directory:** [handoffs/](./handoffs/)
- **Contains:** Completed phase handoff documents older than 7 days
- **Format:** `YYYY-MM-DD_phase_N_[topic].md`
- **Current Contents:** (awaiting first cleanup)

### Memory Archive
- **Directory:** [memory/](./memory/)
- **Contains:** Old mission briefs, completion reports, setup docs for completed phases
- **Current Contents:** (awaiting first cleanup)

### Agent Logs Archive
- **Directory:** [agent_logs/](./agent_logs/)
- **Contains:** Agent execution logs older than 14 days
- **Organization:** Monthly subdirectories (YYYY-MM)
- **Current Contents:** (awaiting first cleanup)

---

## Cleanup History

### 2026-01-23 - Archive Initialized
- Created archive directory structure
- Established janitor agent tooling
- Ready for first cleanup pass

---

## Quick Reference: Find Archived Content

### By Phase
- Phase 1 (Foundation): See [memory/phase1_completion_report.md](./memory/phase1_completion_report.md) (after first cleanup)
- Phase 2 (Clients): See [memory/phase2_completion_report.md](./memory/phase2_completion_report.md) (after first cleanup)
- Phase 3 (Projects): See [memory/phase3_mission_brief.md](./memory/phase3_mission_brief.md) (after first cleanup)

### By Date
Use `grep_search` with date pattern: `grep -r "January 2[0-9], 2026" .project/archive/`

### By Topic
- Auth Setup: See [handoffs/](./handoffs/) (search for "AUTH_SETUP")
- Bug Fixes: See [project_history.md](./project_history.md#bug-fixes)
- Testing Reports: See [memory/](./memory/) (search for "_TESTING_")

---

## Janitor Agent Commands

### Trigger Cleanup
```bash
# Manual trigger (via orchestrator)
/janitor
```

### Cleanup Conditions (Auto-Trigger)
- Every 5 completed tasks
- Timeline.md exceeds 500 lines (current: check with `wc -l .project/timeline.md`)
- .project/ root contains >20 files
- .project/memory/ contains >15 files
- .project/agent_logs/ contains >30 files

---

## Restoration Instructions

If you need to restore archived content:
1. Locate file in this index
2. Copy from archive/ back to appropriate location
3. Update any cross-references in active docs
4. Notify Orchestrator to update manifest if needed
