# Tools & Permissions Setup Guide

**Purpose:** Ensure all agents have required tools enabled for their roles  
**Status:** ✅ Checklist for tool enablement  

---

## Agent Tool Requirements

### Frontend Developer Agent
**Priority:** P0 (Critical for Phase 1)

| Tool | Required | Purpose |
|------|----------|---------|
| `read_file` | ✅ YES | Read components, config, types |
| `create_file` | ✅ YES | Create new component files |
| `replace_string_in_file` | ✅ YES | Edit existing components |
| `multi_replace_string_in_file` | ✅ YES | Batch component updates (efficient) |
| `file_search` | ✅ YES | Find files by glob pattern |
| `grep_search` | ✅ YES | Search for imports, component usage |
| `list_dir` | ✅ YES | Browse src/ structure |
| `get_errors` | ✅ YES | Verify TypeScript compilation |
| `semantic_search` | ✅ YES | Understand codebase context |
| `Terminal` | ✅ YES | `npm install`, `npm run dev`, `git` |
| `get_changed_files` | ✅ YES | Track component modifications |
| `list_code_usages` | ✅ YES | Find where components used |
| `run_in_terminal` | ⚠️ OPTIONAL | Execute arbitrary commands |

**Tool Enablement Checklist:**
- [ ] `read_file` enabled
- [ ] `create_file` enabled
- [ ] `replace_string_in_file` enabled
- [ ] `multi_replace_string_in_file` enabled
- [ ] `file_search` enabled
- [ ] `grep_search` enabled
- [ ] `list_dir` enabled
- [ ] `get_errors` enabled
- [ ] `semantic_search` enabled
- [ ] **Terminal access enabled** (npm, git)
- [ ] `get_changed_files` enabled
- [ ] `list_code_usages` enabled

---

### Backend Developer Agent
**Priority:** P1 (Needed for Phase 7)

| Tool | Required | Purpose |
|------|----------|---------|
| `read_file` | ✅ YES | Read server code, config |
| `create_file` | ✅ YES | Create endpoints, services |
| `replace_string_in_file` | ✅ YES | Edit existing endpoints |
| `multi_replace_string_in_file` | ✅ YES | Batch updates |
| `file_search` | ✅ YES | Find API route files |
| `grep_search` | ✅ YES | Search for imports, endpoints |
| `list_dir` | ✅ YES | Browse backend/ structure |
| `get_errors` | ✅ YES | Verify TypeScript compilation |
| `semantic_search` | ✅ YES | Understand API patterns |
| `Terminal` | ✅ YES | `npm run dev`, `npm run test`, `git` |
| `get_changed_files` | ✅ YES | Track modifications |
| `list_code_usages` | ✅ YES | Find function/endpoint usage |
| `run_in_terminal` | ⚠️ OPTIONAL | curl/test API calls |
| `fetch_webpage` | ⚠️ OPTIONAL | Fetch Xero API docs |

**Tool Enablement Checklist:**
- [ ] `read_file` enabled
- [ ] `create_file` enabled
- [ ] `replace_string_in_file` enabled
- [ ] `multi_replace_string_in_file` enabled
- [ ] `file_search` enabled
- [ ] `grep_search` enabled
- [ ] `list_dir` enabled
- [ ] `get_errors` enabled
- [ ] `semantic_search` enabled
- [ ] **Terminal access enabled** (npm, git)
- [ ] `get_changed_files` enabled
- [ ] `list_code_usages` enabled

---

### QA Engineer Agent
**Priority:** P1 (Continuous, starts Phase 1+1)

| Tool | Required | Purpose |
|------|----------|---------|
| `read_file` | ✅ YES | Read test specs, code |
| `create_file` | ✅ YES | Create test files, bug reports |
| `replace_string_in_file` | ✅ YES | Update test files |
| `file_search` | ✅ YES | Find test files |
| `grep_search` | ✅ YES | Search test patterns |
| `list_dir` | ✅ YES | Browse test/ structure |
| `get_errors` | ✅ YES | Verify no console errors |
| `semantic_search` | ✅ YES | Understand features tested |
| `Terminal` | ✅ YES | `npm run test`, `npm run build` |
| `run_in_terminal` | ⚠️ OPTIONAL | Playwright, Lighthouse CLI |
| `fetch_webpage` | ⚠️ OPTIONAL | Fetch performance data |

**Tool Enablement Checklist:**
- [ ] `read_file` enabled
- [ ] `create_file` enabled
- [ ] `replace_string_in_file` enabled
- [ ] `file_search` enabled
- [ ] `grep_search` enabled
- [ ] `list_dir` enabled
- [ ] `get_errors` enabled
- [ ] `semantic_search` enabled
- [ ] **Terminal access enabled** (npm)

---

## Terminal Access Requirements

All agents need **terminal access** for:

### Frontend Developer
```bash
npm install              # Install dependencies
npm run dev             # Start dev server
npm run build           # Build for production
npm run lint            # Check for errors
git add .               # Stage changes
git commit -m "..."     # Commit with message
git push origin main    # Push to repo
```

### Backend Developer
```bash
npm install             # Install dependencies
npm run dev             # Start backend server
npm run test            # Run unit tests
npm run build           # Build for production
git add .               # Stage changes
git commit -m "..."     # Commit with message
```

### QA Engineer
```bash
npm install             # Install test dependencies
npm run test            # Run test suite
npm run build           # Build for testing
npm run playwright      # Run Playwright tests (optional)
```

---

## How to Enable Tools

### Option A: User Configuration (Recommended)
When starting a new chat session with each agent:
1. Attach project folder: `/root/AmpedFieldOps-v2/`
2. Provide agent context file (e.g., `.github/agents/frontend-developer.agent.md`)
3. **Explicitly request:** "Enable [Tool A], [Tool B], [Tool C] for this agent"

Example:
```
Start new chat with Frontend Developer
Attach: /root/AmpedFieldOps-v2/
Context: .github/agents/frontend-developer.agent.md

Enable tools:
- read_file, create_file, replace_string_in_file
- multi_replace_string_in_file, file_search, grep_search
- list_dir, get_errors, semantic_search
- Terminal access (npm, git)
- get_changed_files, list_code_usages
```

### Option B: Tool Verification
Each agent should verify tools at session start:
```
"Checking available tools..."

✅ Available: read_file, create_file, replace_string_in_file
✅ Available: multi_replace_string_in_file, file_search, grep_search
✅ Available: list_dir, get_errors, semantic_search
✅ Available: Terminal access

Proceeding with implementation...
```

---

## Minimum Viable Toolset (MVP)

If limited tools available, **absolute minimum for Phase 1:**
- ✅ `read_file`
- ✅ `create_file`
- ✅ `replace_string_in_file`
- ✅ **Terminal access** (npm, git)

**Optional but highly efficient:**
- `multi_replace_string_in_file` (batch edits)
- `grep_search` (find code patterns)
- `semantic_search` (understand context)

---

## Blockers Without Tools

| Missing Tool | Impact | Workaround |
|--------------|--------|-----------|
| No `create_file` | Can't create new files | Describe code in detail, user creates files |
| No `replace_string_in_file` | Can't edit files | Manual copy-paste edits (inefficient) |
| No Terminal | Can't run npm/git | Manual commands by user |
| No `read_file` | Can't read code | Description by user (slow) |

---

## Tool Enablement Status Tracker

```markdown
## Frontend Developer
- [ ] Phase 1 assigned
- [ ] Tools verified
- [ ] Session started
- [ ] First task completed

## Backend Developer
- [ ] Phase 7 ready
- [ ] Tools verified
- [ ] Session standby
- [ ] Xero credentials confirmed

## QA Engineer
- [ ] Continuous assignment
- [ ] Tools verified
- [ ] Test environment ready
- [ ] First phase testing started
```

---

## Questions for User

Before agent handoff, confirm:
1. ✅ Can agents access terminal to run `npm` commands?
2. ✅ Can agents read/write files in `/root/AmpedFieldOps-v2/`?
3. ✅ Can agents use `grep_search` and `semantic_search`?
4. ✅ Is `multi_replace_string_in_file` available (for efficiency)?
5. ⚠️ Any tool restrictions or disabled tools?

---

**Created:** 2026-01-21  
**Status:** Tool checklist ready  
**Next Step:** Confirm tool availability before agent handoff

