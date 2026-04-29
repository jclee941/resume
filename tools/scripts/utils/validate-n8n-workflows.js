#!/usr/bin/env node
/**
 * validate-n8n-workflows.js
 *
 * Minimal structural validation for n8n workflow JSON files.
 * Closes P2-13 from MONOREPO_REVIEW_2026-04-29.md (n8n workflows had
 * no schema validation in CI).
 *
 * The n8n project does not publish a public JSON Schema for workflow
 * exports, so we enforce only the invariants we actually depend on:
 *   1. valid JSON
 *   2. top-level `name` (string), `nodes` (array), `connections` (object)
 *   3. each node has `id` (string|number), `name` (string), `type` (string)
 *
 * Run from repo root:
 *   node tools/scripts/utils/validate-n8n-workflows.js
 *
 * Exits 0 on success, 1 on any structural violation.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
// Files known to be broken JSON exports kept around as references but no
// longer authoritative. Listed here to avoid blocking CI on legacy artifacts;
// fixing them is tracked as a separate cleanup PR.
const LEGACY_BROKEN_ALLOWLIST = new Set([
  'infrastructure/n8n/workflows/resume-auto-deploy.json',
  'infrastructure/n8n/wanted-auto-login-workflow.json',
]);
const N8N_DIRS = [
  path.join(REPO_ROOT, 'infrastructure', 'n8n', 'workflows'),
  path.join(REPO_ROOT, 'infrastructure', 'n8n'),
];

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Skip archive/ subdirectories — they hold reference copies, not live workflows.
      if (entry.name === 'archive') continue;
      out.push(...listJsonFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.json')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function validate(file) {
  const errors = [];
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return [`cannot read: ${err.message}`];
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return [`JSON parse error: ${err.message}`];
  }

  if (typeof data !== 'object' || data === null) {
    errors.push('root must be an object');
    return errors;
  }
  if (typeof data.name !== 'string' || data.name.length === 0) {
    errors.push("missing or empty 'name' (string)");
  }
  if (!Array.isArray(data.nodes)) {
    errors.push("missing 'nodes' (array)");
  } else {
    data.nodes.forEach((node, idx) => {
      if (!node || typeof node !== 'object') {
        errors.push(`nodes[${idx}] is not an object`);
        return;
      }
      if (node.id === undefined || node.id === null || node.id === '') {
        errors.push(`nodes[${idx}].id missing`);
      }
      if (typeof node.name !== 'string' || node.name.length === 0) {
        errors.push(`nodes[${idx}].name missing or not a string`);
      }
      if (typeof node.type !== 'string' || node.type.length === 0) {
        errors.push(`nodes[${idx}].type missing or not a string`);
      }
    });
  }
  if (data.connections !== undefined && (typeof data.connections !== 'object' || Array.isArray(data.connections))) {
    errors.push("'connections' must be an object when present");
  }

  return errors;
}

function main() {
  const files = N8N_DIRS.flatMap(listJsonFiles);
  if (files.length === 0) {
    console.log('ℹ️  No n8n workflows found.');
    process.exit(0);
  }
  console.log(`📋 Validating ${files.length} n8n workflow(s)...`);
  let failures = 0;
  let warnings = 0;
  for (const f of files) {
    const rel = path.relative(REPO_ROOT, f);
    const errors = validate(f);
    if (errors.length === 0) {
      console.log(`✅ ${rel}`);
    } else if (LEGACY_BROKEN_ALLOWLIST.has(rel)) {
      warnings += 1;
      console.warn(`⚠️  ${rel} (allow-listed legacy export):`);
      for (const e of errors) console.warn(`     - ${e}`);
    } else {
      failures += 1;
      console.error(`❌ ${rel}`);
      for (const e of errors) console.error(`     - ${e}`);
    }
  }
  if (failures > 0) {
    console.error(`\n❌ ${failures} workflow(s) failed structural validation.`);
    process.exit(1);
  }
  if (warnings > 0) {
    console.warn(`\n⚠️  ${warnings} legacy workflow(s) skipped (allow-listed).`);
  }
  console.log(`\n✅ All ${files.length - warnings} active n8n workflows pass.`);
}

if (require.main === module) {
  main();
}

module.exports = { validate, listJsonFiles };
