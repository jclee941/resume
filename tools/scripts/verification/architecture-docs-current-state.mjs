import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

export const CURRENT_DOCS = [
  'docs/ARCHITECTURE.md',
  'docs/architecture/system-overview.md',
  'docs/architecture/component-inventory.md',
  'docs/architecture/DEPLOYMENT_PIPELINE.md',
  'docs/architecture/kv-ownership.md',
];

const STALE_CLAIMS = [
  /\bJOB_SERVICE\b/,
  /\bBazel\b(?=.*(?:primary|facade|build|current))/i,
  /apps\/(?:portfolio|job-dashboard)\/wrangler\.jsonc/,
  /--env[ =]production/,
  /Cloudflare Queues?\s*\|\s*(?:Job|Crawl)/i,
];

export function validateCurrentDocs(root, files, diagnostics) {
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (STALE_CLAIMS.some((pattern) => pattern.test(text))) {
      diagnostics.push({
        code: 'stale-current-state-claim',
        file: relative(root, file),
        message: 'Current-state documentation contains a retired architecture claim',
      });
    }
  }
}
