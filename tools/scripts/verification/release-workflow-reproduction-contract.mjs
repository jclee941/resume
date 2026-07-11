export const reproductionContract = [
  [
    'git archive --format=tar --prefix="resume-${TAG}/" "$TARGET_SHA"',
    'target source archive is required',
  ],
  ['gzip -n -9', 'archive must use deterministic gzip'],
  ['cmp "dist/archive-a/${ASSET}" "dist/archive-b/${ASSET}"', 'archive must be built twice'],
  ['archive-members.txt', 'archive member allowlist scan is required'],
  ['gitleaks', 'exported source secret scan is required'],
  ['npm ci --prefer-offline --no-audit --no-fund', 'extracted source install is required'],
  ['npm run verify:ssot', 'shared deterministic SSoT verifier is required'],
  ['export GIT_SHA="$TARGET_SHA"', 'target SHA must propagate through every custom build'],
  ['export RESUME_AS_OF="$COMMIT_DATE"', 'commit date must propagate through every custom build'],
  [
    'wrangler deploy --config wrangler.jsonc --dry-run',
    'root production Wrangler dry-run is required',
  ],
  ['grep -Fq "$TARGET_SHA" apps/portfolio/worker.js', 'generated health target check is required'],
  [
    'git log --format=\'- %s (%h)\' "$RANGE"',
    'release notes must use the immutable decision range',
  ],
];
