/**
 * validate-application-variants.js
 *
 * Per-application resume variants under packages/data/resumes/applications/
 * are INTENTIONALLY INDEPENDENT from the master SSoT — they are hand-crafted
 * per-role documents with a distinct schema (e.g. nested `skills` object by
 * category, missing top-level keys present in master).
 *
 * This validator does NOT enforce master-SSoT parity. It enforces a minimal
 * application-variant CONTRACT so the docs build / PDF tooling that consumes
 * these files cannot silently break.
 *
 * Run from repo root:
 *   node tools/scripts/utils/validate-application-variants.js
 *
 * Exits 0 on success, 1 on any contract violation. Wired into the
 * `validate-data` CI job (.github/workflows/ci.yml).
 *
 * Closes Issue C in docs/architecture/RESUME_SYNC_AUDIT_2026-04-29.md.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const APPLICATIONS_DIR = path.join(REPO_ROOT, 'packages', 'data', 'resumes', 'applications');

/**
 * Minimal contract every application-variant resume JSON must satisfy.
 * NOT a full schema — only the keys/fields downstream tooling depends on.
 */
const REQUIRED_TOP_KEYS = [
  'personal',
  'summary',
  'careers',
  'projects',
  'skills',
  'certifications',
];

const REQUIRED_PERSONAL_FIELDS = ['name', 'email', 'phone'];

const REQUIRED_CAREER_FIELDS = ['company', 'period'];

function listJsonVariants(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listJsonVariants(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function validateVariant(filePath) {
  const errors = [];
  let data;

  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return [`JSON parse error: ${err.message}`];
  }

  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in data)) {
      errors.push(`missing required top-level key: ${key}`);
    }
  }

  if (data.personal && typeof data.personal === 'object') {
    for (const field of REQUIRED_PERSONAL_FIELDS) {
      if (!data.personal[field]) {
        errors.push(`personal.${field} is missing or empty`);
      }
    }
  }

  if (Array.isArray(data.careers)) {
    data.careers.forEach((career, idx) => {
      if (!career || typeof career !== 'object') {
        errors.push(`careers[${idx}] is not an object`);
        return;
      }
      for (const field of REQUIRED_CAREER_FIELDS) {
        if (!career[field]) {
          errors.push(`careers[${idx}].${field} is missing or empty`);
        }
      }
    });
  } else if ('careers' in data) {
    errors.push('careers must be an array');
  }

  if (data.skills !== undefined) {
    if (typeof data.skills !== 'object' || data.skills === null) {
      errors.push('skills must be an object (application-variant convention)');
    } else if (Object.keys(data.skills).length === 0) {
      errors.push('skills must have at least one category');
    }
  }

  return errors;
}

function main() {
  const variants = listJsonVariants(APPLICATIONS_DIR);
  if (variants.length === 0) {
    console.log('ℹ️  No application variants found — nothing to validate.');
    process.exit(0);
  }

  console.log(`📋 Validating ${variants.length} application variant(s)...`);
  let failures = 0;

  for (const file of variants) {
    const rel = path.relative(REPO_ROOT, file);
    const errors = validateVariant(file);
    if (errors.length === 0) {
      console.log(`✅ ${rel}`);
    } else {
      failures += 1;
      console.error(`❌ ${rel}`);
      for (const err of errors) {
        console.error(`     - ${err}`);
      }
    }
  }

  if (failures > 0) {
    console.error(`\n❌ ${failures} application variant(s) failed contract validation.`);
    process.exit(1);
  }

  console.log(`\n✅ All ${variants.length} application variants pass contract.`);
}

if (require.main === module) {
  main();
}

module.exports = { validateVariant, listJsonVariants };
