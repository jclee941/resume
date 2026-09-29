const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const acorn = require('acorn');
const test = globalThis.test || require('node:test');

const root = path.join(__dirname, '../../..');
const sourceRoot = path.join(root, 'apps/job-dashboard/src');
const schemaPath = path.join(root, 'apps/job-dashboard/schema.sql');
const SQL_START = /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH|REPLACE)\b/i;
const PLACEHOLDER_ARTIFACT = /syntax error|incomplete input/i;

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listSourceFiles(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function flattenConcat(node) {
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return [...flattenConcat(node.left), ...flattenConcat(node.right)];
  }
  if (node.type === 'Literal' && typeof node.value === 'string') return [node.value];
  if (node.type === 'TemplateLiteral') return [templateText(node)];
  return ['1'];
}

function templateText(node) {
  return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('1');
}

function collectSql(node, found) {
  if (!node || typeof node.type !== 'string') return;
  let text = null;
  if (node.type === 'Literal' && typeof node.value === 'string') text = node.value;
  if (node.type === 'TemplateLiteral') text = templateText(node);
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    text = flattenConcat(node).join('');
  }
  if (text !== null && SQL_START.test(text)) found.push(text);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => collectSql(child, found));
    else if (value && typeof value.type === 'string') collectSql(value, found);
  }
}

function workerSqlStatements() {
  return listSourceFiles(sourceRoot).flatMap((file) => {
    const ast = acorn.parse(fs.readFileSync(file, 'utf8'), {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });
    const found = [];
    collectSql(ast, found);
    return found.map((sql) => ({ file: path.relative(root, file), sql }));
  });
}

function missingRequiredColumns(database, sql) {
  const insert = sql.match(/^\s*INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\(([^)]*)\)/i);
  if (!insert) return [];
  const listed = new Set(insert[2].split(',').map((column) => column.trim().toLowerCase()));
  return database
    .prepare(`PRAGMA table_info(${insert[1]})`)
    .all()
    .filter((column) => column.notnull && column.dflt_value === null && !column.pk)
    .map((column) => column.name)
    .filter((name) => !listed.has(name.toLowerCase()));
}

test('every JOB_DB statement in the dashboard Worker compiles against schema.sql', () => {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(fs.readFileSync(schemaPath, 'utf8'));
    const statements = workerSqlStatements();
    const drift = [];
    let compiled = 0;
    for (const { file, sql } of statements) {
      try {
        database.prepare(sql);
        compiled += 1;
        const missing = missingRequiredColumns(database, sql);
        if (missing.length > 0) {
          drift.push(`${file}: INSERT omits NOT NULL column(s) ${missing.join(', ')}`);
        }
      } catch (error) {
        if (!PLACEHOLDER_ARTIFACT.test(error.message)) {
          drift.push(
            `${file}: ${error.message} :: ${sql.replace(/\s+/g, ' ').trim().slice(0, 120)}`
          );
        }
      }
    }
    assert.ok(compiled >= 50, `only ${compiled} statements compiled; the extractor found too few`);
    assert.deepEqual(drift, []);
  } finally {
    database.close();
  }
});
