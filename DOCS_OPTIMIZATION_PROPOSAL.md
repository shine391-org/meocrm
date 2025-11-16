# Documentation Optimization Proposal

## Current State Analysis

### Total Markdown Files (excluding node_modules)
- **Root level:** 13 files
- **docs/ folder:** 15 files
- **Specialized:** 6 files (apps/api, apps/web, .claude, .jules, scripts)
- **Total:** 34 documentation files

### Issues Identified
1. **Duplication:** Multiple AGENTS.md files (root, apps/api, apps/web)
2. **Scattered workflow docs:** WORKFLOW.md, WORKFLOW-SIMPLE.md, AGENTS.md all contain workflow info
3. **Low-priority files at root:** CONTRIBUTING.md, CHANGELOG.md rarely used but prominent
4. **Unclear hierarchy:** No clear "start here" guidance

---

## Proposed Optimization

### 🎯 Goal
**Minimize context loading time while maintaining all essential information**

### 📁 Reorganized Structure

```
/home/shine/projects/meocrm/
│
├── 📄 README.md                          # Quick start guide (keep)
├── 📄 WORKFLOW-SIMPLE.md                 # NEW: Primary workflow (59 KB)
├── 📄 ROADMAP.md                         # Task tracking (keep - 23 KB)
├── 📄 DEVELOPMENT_LESSONS_LEARNED.md     # 10 coding rules (keep - 8 KB)
│
├── 📁 docs/                              # Reference documentation
│   ├── 📄 00_START_HERE.md              # NEW: Context loading guide
│   │
│   ├── 📁 essential/                    # Read frequently
│   │   ├── ENVIRONMENT.md               # Setup & env vars
│   │   ├── 01_BUSINESS_LOGIC.md         # Business rules (58 KB)
│   │   └── 03_DATABASE_SCHEMA.md        # Database design (45 KB)
│   │
│   ├── 📁 reference/                    # Read as needed
│   │   ├── 04_API_REFERENCE.md          # API docs (21 KB)
│   │   ├── 05_INTEGRATION_APIS.md       # External APIs
│   │   ├── 06_TROUBLESHOOTING.md        # Common issues
│   │   └── Documentation-Map.md         # Doc index
│   │
│   ├── 📁 guides/                       # Specialized guides
│   │   ├── testing/
│   │   │   └── Strategy-&-Coverage.md
│   │   ├── integration/
│   │   │   └── README.md
│   │   ├── settings/
│   │   │   └── README.md
│   │   └── architecture/
│   │       └── README.md
│   │
│   └── 📁 archive/                      # Rarely used
│       ├── WORKFLOW.md                  # Detailed workflow (replaced by WORKFLOW-SIMPLE.md)
│       ├── AGENTS.md                    # Option 3 workflow (consolidated)
│       ├── 02_IMPLEMENTATION_PLAN.md    # Original plan
│       ├── 00_PROJECT_OVERVIEW.md       # Outdated overview
│       ├── code-review/
│       │   └── coderabbit-final-followups.md
│       └── agents/
│           └── jules-guide.md
│
├── 📁 .archive/                          # Move from root
│   ├── AGENTS.md                        # Move here (Option 3 workflow)
│   ├── AGENTS-QUICKSTART.md             # Move here
│   ├── SCREENSHOT_CHECKLIST.md          # Move here
│   ├── TASK_DEPENDENCIES_ANALYSIS.md    # Move here
│   ├── CHANGELOG.md                     # Move here
│   └── CONTRIBUTING.md                  # Move here
│
└── 📁 apps/
    ├── api/
    │   └── AGENTS.md                    # DELETE (duplicate)
    └── web/
        └── AGENTS.md                    # DELETE (duplicate)
```

---

## Context Loading Strategy

### 📊 File Size Analysis
| Priority | Files | Total Size | Use Case |
|----------|-------|------------|----------|
| **Always Load** | WORKFLOW-SIMPLE.md, ROADMAP.md | ~82 KB | Every session start |
| **Conditional** | Business Logic, Schema, Lessons | ~111 KB | Feature development |
| **Rare** | Integration APIs, Troubleshooting | ~50 KB | Specific issues |
| **Archive** | Old workflow, reviews | ~200 KB | Never in normal flow |

### 🚀 Fast Context Loading Patterns

#### Pattern 1: New Feature from Screenshot
```
Load (in order):
1. WORKFLOW-SIMPLE.md (59 KB) - Get workflow
2. ROADMAP.md (23 KB) - Check current phase
3. Screenshot from user
4. Similar component (if exists)

Total: ~82 KB + screenshot
Skip: Full business logic, API docs
```

#### Pattern 2: Backend API Development
```
Load (in order):
1. WORKFLOW-SIMPLE.md (59 KB)
2. docs/essential/01_BUSINESS_LOGIC.md (58 KB) - Business rules
3. docs/essential/03_DATABASE_SCHEMA.md (45 KB) - Schema
4. DEVELOPMENT_LESSONS_LEARNED.md (8 KB) - Coding rules

Total: ~170 KB
Skip: Frontend docs, integration APIs
```

#### Pattern 3: Bug Fix
```
Load (in order):
1. Error message/stack trace
2. Relevant source file
3. Related test file
4. docs/reference/06_TROUBLESHOOTING.md (if similar issue)

Total: <50 KB
Skip: Workflow, business logic, schemas
```

#### Pattern 4: Test Writing
```
Load (in order):
1. docs/guides/testing/Strategy-&-Coverage.md
2. Similar existing test
3. Code being tested
4. DEVELOPMENT_LESSONS_LEARNED.md (test section)

Total: <40 KB
Skip: Business logic, API docs
```

---

## Migration Plan

### Phase 1: Create New Structure (30 min)
```bash
# Create new directories
mkdir -p docs/essential docs/reference docs/guides docs/archive .archive

# Move essential docs
mv docs/ENVIRONMENT.md docs/essential/
mv docs/01_BUSINESS_LOGIC.md docs/essential/
mv docs/03_DATABASE_SCHEMA.md docs/essential/

# Move reference docs
mv docs/04_API_REFERENCE.md docs/reference/
mv docs/05_INTEGRATION_APIS.md docs/reference/
mv docs/06_TROUBLESHOOTING.md docs/reference/
mv docs/Documentation-Map.md docs/reference/

# Move guides (already in subdirs)
mv docs/testing docs/guides/
mv docs/integration docs/guides/
mv docs/settings docs/guides/
mv docs/architecture docs/guides/

# Move to archive
mv docs/WORKFLOW.md docs/archive/
mv docs/00_PROJECT_OVERVIEW.md docs/archive/
mv docs/02_IMPLEMENTATION_PLAN.md docs/archive/
mv docs/code-review docs/archive/
mv docs/agents docs/archive/

# Move root files to .archive
mv AGENTS.md .archive/
mv AGENTS-QUICKSTART.md .archive/
mv SCREENSHOT_CHECKLIST.md .archive/
mv TASK_DEPENDENCIES_ANALYSIS.md .archive/
mv CHANGELOG.md .archive/
mv CONTRIBUTING.md .archive/

# Delete duplicates
rm apps/api/AGENTS.md
rm apps/web/AGENTS.md
```

### Phase 2: Create New Guide Files (15 min)
1. Create `docs/00_START_HERE.md` with context loading guide
2. Update `README.md` to reference new structure
3. Update all internal doc links

### Phase 3: Update References (10 min)
- Update WORKFLOW-SIMPLE.md links
- Update ROADMAP.md references
- Update any CI/CD scripts

---

## New Files to Create

### docs/00_START_HERE.md
**Purpose:** Fast context loading guide for Claude

**Content:**
- Task type → Files to read mapping
- Estimated context size per task type
- Quick command reference
- Link to WORKFLOW-SIMPLE.md

**Size:** ~5 KB

### Updated README.md
**Add section:**
```markdown
## 📚 Documentation Guide

**Start here:** [WORKFLOW-SIMPLE.md](WORKFLOW-SIMPLE.md)

### For Claude/AI Agents:
- **Every session:** Read [WORKFLOW-SIMPLE.md](WORKFLOW-SIMPLE.md) + [ROADMAP.md](ROADMAP.md)
- **Context loading:** See [docs/00_START_HERE.md](docs/00_START_HERE.md)
- **Coding rules:** [DEVELOPMENT_LESSONS_LEARNED.md](DEVELOPMENT_LESSONS_LEARNED.md)

### For Humans:
- **Quick start:** [README.md](README.md) → Setup → Run
- **Business logic:** [docs/essential/01_BUSINESS_LOGIC.md](docs/essential/01_BUSINESS_LOGIC.md)
- **API reference:** [docs/reference/04_API_REFERENCE.md](docs/reference/04_API_REFERENCE.md)
```

---

## Benefits

### ✅ Faster Context Loading
- **Before:** Load 200+ KB of docs to find relevant info
- **After:** Load 80-170 KB targeted docs per task type
- **Savings:** 20-60% reduction in context usage

### ✅ Clearer Structure
- Root level has only active workflow files
- docs/ organized by usage frequency
- Archive clearly separated

### ✅ Better Discoverability
- 00_START_HERE.md provides immediate guidance
- Essential vs Reference vs Archive hierarchy
- Task-based loading patterns

### ✅ Reduced Duplication
- Single source of truth for workflows (WORKFLOW-SIMPLE.md)
- No duplicate AGENTS.md files
- Consolidated coding rules in one file

---

## Rollback Plan

If issues arise:
```bash
# All moves are reversible
cd /home/shine/projects/meocrm
git checkout HEAD -- docs/ .archive/ apps/
```

All original files preserved in git history.

---

## Implementation

**Estimated time:** 1 hour
**Risk:** Low (all reversible via git)
**Impact:** High (20-60% context reduction)

**Next step:** Approve proposal → Execute migration → Update links → Test
