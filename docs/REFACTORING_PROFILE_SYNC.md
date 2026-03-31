# Profile Sync Consolidation Plan

## Issue

Three overlapping profile sync implementations exist:

1. **job-server/scripts/profile-sync.js** (966 lines)
   - Full profile synchronization CLI script
   - Browser automation for JobKorea
   - Section-by-section sync (careers, educations, skills, etc.)

2. **job-dashboard/src/handlers/profile-sync-handler.js** (100+ lines)
   - HTTP API handler for profile sync
   - Integrates with Wanted API (Chaos API)
   - Supports SSOT data input

3. **job-dashboard/src/workflows/resume-sync.js** (200+ lines)
   - Cloudflare Workflow for resume sync
   - 8-step pipeline with rollback capability
   - Event-triggered

## Problems

- Code duplication across platforms
- Different sync strategies (API vs Browser automation)
- Maintenance burden - changes need to be made in multiple places
- Inconsistent error handling

## Proposed Solution

### Phase 1: Create Shared Sync Library

Create `packages/shared/src/sync/` with:

- `sync-engine.js` - Core sync orchestration
- `platform-adapters/` - Platform-specific implementations
  - `wanted-adapter.js` - Chaos API integration
  - `jobkorea-adapter.js` - Browser automation
  - `linkedin-adapter.js` - API/Scraping
- `diff-engine.js` - Compare local vs remote profile
- `backup-manager.js` - Pre-sync backup

### Phase 2: Refactor job-server

- Replace profile-sync.js with calls to shared library
- Keep CLI interface but delegate to shared logic

### Phase 3: Refactor job-dashboard

- Update ProfileSyncHandler to use shared library
- Update ResumeSyncWorkflow to use shared library
- Maintain HTTP API and Workflow interfaces

### Phase 4: Testing

- Create comprehensive sync tests
- Test each platform adapter
- Test rollback scenarios

## Effort Estimate

- Phase 1: 4-6 hours
- Phase 2: 2-3 hours
- Phase 3: 2-3 hours
- Phase 4: 2-4 hours
- **Total: 10-16 hours**

## Priority

Medium - Current implementations work but have maintenance overhead.

## Decision

Defer full consolidation to dedicated refactoring sprint.
Current fixes (n8n references, error messages) address immediate issues.
