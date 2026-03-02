# Repository Structure Refactoring Plan

**Date**: 2025-11-23
**Status**: Planning
**Goal**: Reorganize repository for better maintainability and clarity

---

## 📊 Current Structure Analysis

### Root Directory Issues

**Documentation Clutter** (2,918 lines total):
```
OpenCode.md                           (28,429 bytes)
CODEBASE_ANALYSIS_2025_10_13.md    (25,863 bytes)
ENHANCEMENT_ROADMAP.md              (6,435 bytes)
ENVIRONMENTAL_MAP.md                (6,297 bytes)
GEMINI.md                           (3,378 bytes)
MODERNIZATION_SUMMARY_2025_10_13.md (8,440 bytes)
README.md                           (11,301 bytes)
```

**Problem**: Too many high-level docs at root, reducing discoverability

### Directory Structure Issues

```
Current Structure:
/home/jclee/dev/resume/
├── archive/           # Old resume versions (14 subdirs)
├── company-specific/  # Company-tailored resumes
├── configs/           # Infrastructure configs
├── demo/              # Demo files
├── docs/              # Documentation
├── master/            # Master resume versions
├── monitoring/        # Monitoring configs
├── n8n/               # n8n workflow configs
├── n8n-workflows/     # n8n workflow definitions
├── requests/          # Job application tracking
├── resume/            # Technical docs by company
├── scripts/           # Automation scripts
├── tests/             # Test suites
├── toss/              # Toss-specific content
└── apps/portfolio/               # Web portfolio (main development)
```

**Problems**:
1. **Infrastructure scattered**: configs/, monitoring/, n8n/, n8n-workflows/
2. **Resume content fragmented**: archive/, company-specific/, master/, resume/, toss/
3. **Unclear separation**: What goes in archive/ vs master/ vs resume/?
4. **Test artifacts committed**: playwright-report/, test-results/

---

## 🎯 Proposed Structure

```
/home/jclee/dev/resume/
├── .github/                    # GitHub Actions
├── .serena/                    # Serena MCP cache
├── docs/                       # Documentation hub
│   ├── guides/                 # User guides
│   ├── analysis/               # Technical analysis
│   ├── OpenCode.md               # → Move from root
│   ├── ENHANCEMENT_ROADMAP.md  # → Move from root
│   ├── ENVIRONMENTAL_MAP.md    # → Move from root
│   ├── GEMINI.md               # → Move from root
│   ├── MODERNIZATION_SUMMARY.md # → Move from root
│   └── CODEBASE_ANALYSIS.md    # → Move from root
├── infrastructure/             # All infra configs (NEW)
│   ├── configs/                # → Move from root
│   ├── monitoring/             # → Move from root
│   ├── n8n/                    # → Move from root
│   └── workflows/              # → Rename n8n-workflows/
├── resumes/                    # All resume content (NEW)
│   ├── master/                 # → Move from root
│   ├── companies/              # → Rename company-specific/
│   ├── technical/              # → Move resume/ here
│   └── archive/                # → Move from root
├── apps/portfolio/                        # Web portfolio (unchanged)
│   ├── lib/                    # Modular build system
│   ├── assets/
│   ├── downloads/
│   └── ...
├── scripts/                    # Automation scripts (unchanged)
├── tests/                      # Test suites (unchanged)
├── requests/                   # Job tracking (unchanged)
├── demo/                       # Demo files (consider removing)
├── README.md                   # Keep at root
├── package.json                # Keep at root
└── ...config files             # Keep at root
```

---

## 📝 Refactoring Steps

### Phase 1: Documentation Consolidation (P0)

**Goal**: Move all analysis/planning docs to docs/ directory

```bash
# Create subdirectory
mkdir -p docs/planning

# Move files
mv CODEBASE_ANALYSIS_2025_10_13.md docs/planning/CODEBASE_ANALYSIS.md
mv ENHANCEMENT_ROADMAP.md docs/planning/
mv ENVIRONMENTAL_MAP.md docs/planning/
mv GEMINI.md docs/planning/
mv MODERNIZATION_SUMMARY_2025_10_13.md docs/planning/MODERNIZATION_SUMMARY.md

# Keep OpenCode.md at root (referenced by OpenCode)
# Keep README.md at root (GitHub landing page)
```

**Impact**: Reduces root clutter from 7 docs to 2 (OpenCode.md, README.md)

### Phase 2: Infrastructure Consolidation (P1)

**Goal**: Centralize all infrastructure configs

```bash
# Create infrastructure directory
mkdir -p infrastructure

# Move directories
mv configs infrastructure/
mv monitoring infrastructure/
mv n8n infrastructure/
mv n8n-workflows infrastructure/workflows

# Update .gitignore
echo "infrastructure/monitoring/*.log" >> .gitignore
```

**Files affected**: Update paths in:
- `.github/workflows/deploy.yml` (CI/CD pipeline)
- `scripts/deployment/deploy-*.sh` (deployment scripts)
- `apps/portfolio/generate-worker.js` (if it references configs)

### Phase 3: Resume Content Restructuring (P1)

**Goal**: Unify all resume-related content under resumes/

```bash
# Create resumes directory structure
mkdir -p resumes/{companies,technical,archive}

# Move directories
mv company-specific resumes/companies
mv resume/* resumes/technical/
mv archive resumes/archive
mv master resumes/master

# Remove toss/ directory (merge into companies/)
mv toss/* resumes/companies/toss/
rmdir toss
```

**Clarify naming**:
- `resumes/master/` - Master resume (complete career history)
- `resumes/companies/` - Company-tailored versions
- `resumes/technical/` - Technical documentation by project
- `resumes/archive/` - Old/deprecated versions

### Phase 4: Cleanup and Optimization (P2)

**Goal**: Remove unnecessary files and improve .gitignore

```bash
# Remove test artifacts
rm -rf playwright-report test-results

# Update .gitignore
cat >> .gitignore <<EOF

# Test artifacts
playwright-report/
test-results/
.playwright-mcp/

# Build artifacts
apps/portfolio/.wrangler/
EOF

# Remove demo/ if unused
# git rm -rf demo/  # If truly unnecessary
```

### Phase 5: Path Updates (P1)

**Critical**: Update all hardcoded paths

**Files to update**:
1. `.github/workflows/deploy.yml` - CI/CD paths
2. `OpenCode.md` - Documentation paths
3. `README.md` - Link updates
4. `scripts/*.sh` - Script path references
5. `package.json` - Test/build script paths
6. `apps/portfolio/data.json` - Download URLs (if local paths used)

**Example updates**:
```yaml
# .github/workflows/deploy.yml
before_script:
  - source infrastructure/configs/env-prod.sh  # Was: configs/env-prod.sh
```

```bash
# scripts/deployment/deploy.sh
CONFIG_DIR="infrastructure/configs"  # Was: configs/
```

---

## ⚠️ Risk Assessment

### High Risk
- ❌ **Breaking CI/CD**: .github/workflows/deploy.yml path changes
- ❌ **Breaking deployments**: scripts/ path references
- ❌ **Breaking builds**: apps/portfolio/generate-worker.js if it reads configs

### Medium Risk
- ⚠️ **Documentation links**: Broken internal links
- ⚠️ **Git history**: File move tracking

### Low Risk
- ✅ **Resume content**: Pure data, no code dependencies
- ✅ **Infrastructure configs**: Not referenced by build

---

## ✅ Validation Checklist

Before merging refactoring:

**Build System**:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (23/23 tests)
- [ ] `npm run test:e2e` passes (34/34 tests)
- [ ] `apps/portfolio/worker.js` generates correctly

**Deployment**:
- [ ] `npm run deploy` succeeds
- [ ] Production site accessible (https://resume.jclee.me)
- [ ] `/health` endpoint returns 200
- [ ] Download links work

**Documentation**:
- [ ] All internal links valid
- [ ] README.md up to date
- [ ] OpenCode.md paths updated

**Infrastructure**:
- [ ] GitHub Actions pipeline passes
- [ ] Monitoring configs accessible
- [ ] n8n workflows importable

---

## 📈 Benefits

**Maintainability**:
- ✅ Clear separation of concerns (docs/ vs infrastructure/ vs resumes/)
- ✅ Easier onboarding (logical structure)
- ✅ Reduced cognitive load (less root clutter)

**Scalability**:
- ✅ Easy to add new companies (resumes/companies/)
- ✅ Infrastructure configs grouped (infrastructure/)
- ✅ Documentation findable (docs/)

**Performance**:
- ✅ Faster git operations (fewer root files)
- ✅ Better IDE indexing (structured directories)
- ✅ Cleaner .gitignore (fewer artifacts)

---

## 🚀 Implementation Timeline

**Day 1**: Phase 1 (Documentation) - Low risk, immediate benefit
**Day 2**: Phase 2 (Infrastructure) - Medium risk, test thoroughly
**Day 3**: Phase 3 (Resume content) - Low risk, data only
**Day 4**: Phase 4 (Cleanup) - Low risk, optional
**Day 5**: Phase 5 (Path updates) - High risk, validate extensively

**Total**: ~5 days (can be compressed to 2-3 days)

---

## 📚 References

- Current OpenCode.md structure guidance
- GitHub Actions documentation
- n8n workflow best practices
- Cloudflare Workers deployment guide
