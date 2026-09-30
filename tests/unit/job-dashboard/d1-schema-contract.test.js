const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const acorn = require('acorn');
const test = globalThis.test || require('node:test');

const root = path.join(__dirname, '../../..');
const sourceRoots = ['apps/job-dashboard/src', 'apps/portfolio/lib'].map((dir) =>
  path.join(root, dir)
);
const schemaPath = path.join(root, 'apps/job-dashboard/schema.sql');
const generatedWorker = path.join(root, 'apps/portfolio/worker.js');
const SQL_START = /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH|REPLACE)\b/i;
// Literals that start with a SQL keyword but are not SQL.
const NOT_SQL = [
  [
    'apps/job-dashboard/src/handlers/sync/profile-sync-status.js',
    'Update profile sync status failed:',
  ],
  ['apps/job-dashboard/src/router.js', 'DELETE'],
];
// Statements assembled at runtime (interpolations read as "1"); the second test compiles
// every shape their builders emit.
const DYNAMIC = [
  [
    'apps/job-dashboard/src/handlers/applications/application-repository.js',
    'UPDATE applications SET 1 WHERE id = ?',
  ],
  [
    'apps/job-dashboard/src/services/notifications/application-actions.js',
    "UPDATE applications SET status = ?, 1 = datetime('now') WHERE id = ?",
  ],
];
// The MCP content tools read content_files, which arrives with migration 0006. Until schema.sql
// declares it their queries cannot compile; once it does, they are checked like every other statement.
const CONTENT_FILES_TOOL = 'apps/job-dashboard/src/mcp/tools/content-files.js';
const KNOWN_UNCOMPILABLE = [...NOT_SQL, ...DYNAMIC].map(([file, text]) => `${file}: ${text}`);

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

function sqlStatementsIn(file, source) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const found = [];
  collectSql(ast, found);
  return found.map((sql) => ({ file, sql }));
}

function workerSqlStatements() {
  return sourceRoots
    .flatMap(listSourceFiles)
    .flatMap((file) => sqlStatementsIn(path.relative(root, file), fs.readFileSync(file, 'utf8')));
}

// apps/portfolio/lib emits the portfolio Worker as generated source, so its SQL exists only in the
// built apps/portfolio/worker.js (npm run build runs before the tests in CI and the gate).
function generatedPortfolioSql() {
  assert.ok(
    fs.existsSync(generatedWorker),
    'apps/portfolio/worker.js is missing; run npm run build'
  );
  return sqlStatementsIn(
    'apps/portfolio/worker.js (generated)',
    fs.readFileSync(generatedWorker, 'utf8')
  );
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

test('every JOB_DB statement in the Worker compiles against schema.sql', () => {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(fs.readFileSync(schemaPath, 'utf8'));
    const portfolio = generatedPortfolioSql();
    assert.ok(
      portfolio.length >= 2,
      `only ${portfolio.length} SQL statements found in the generated portfolio Worker`
    );
    const statements = [...workerSqlStatements(), ...portfolio];
    const drift = [];
    const uncompilable = [];
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
        const key = `${file}: ${sql.replace(/\s+/g, ' ').trim()}`;
        if (KNOWN_UNCOMPILABLE.includes(key)) uncompilable.push(key);
        else if (
          file === CONTENT_FILES_TOOL &&
          /no such table: content_files/.test(error.message)
        ) {
          continue;
        } else drift.push(`${key.slice(0, 160)} :: ${error.message}`);
      }
    }
    assert.ok(compiled >= 50, `only ${compiled} statements compiled; the extractor found too few`);
    assert.deepEqual(drift, []);
    assert.deepEqual(uncompilable.sort(), [...KNOWN_UNCOMPILABLE].sort());
  } finally {
    database.close();
  }
});

function recordingDb(changes) {
  const statements = [];
  const result = {
    run: async () => ({ meta: { changes } }),
    first: async () => null,
    all: async () => ({ results: [] }),
  };
  const db = {
    prepare(sql) {
      statements.push(sql);
      return { ...result, bind: () => result };
    },
  };
  return { db, statements };
}

test('runtime-assembled JOB_DB writes compile for every shape their builders emit', async () => {
  const src = path.join(root, 'apps/job-dashboard/src');
  const { ApplicationRepository } = await import(
    path.join(src, 'handlers/applications/application-repository.js')
  );
  const { approveApplication, rejectApplication } = await import(
    path.join(src, 'services/notifications/application-actions.js')
  );
  const repository = recordingDb(1);
  const applications = new ApplicationRepository(repository.db);
  const fieldSets = [{ notes: 'n' }, { priority: 'high' }, { resumeId: 'r' }];
  for (const fields of [...fieldSets, Object.assign({}, ...fieldSets)]) {
    await applications.update('app-1', fields, '2026-09-29T00:00:00.000Z');
  }
  const decisions = recordingDb(0);
  await approveApplication({ env: { JOB_DB: decisions.db } }, 'app-1');
  await rejectApplication({ env: { JOB_DB: decisions.db } }, 'app-1');

  const shapes = [...repository.statements, ...decisions.statements].filter((sql) =>
    /^\s*UPDATE applications SET/i.test(sql)
  );
  assert.equal(shapes.length, 6);
  assert.ok(shapes.some((sql) => sql.includes('approved_at')));
  assert.ok(shapes.some((sql) => sql.includes('rejected_at')));
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(fs.readFileSync(schemaPath, 'utf8'));
    for (const sql of shapes) database.prepare(sql);
  } finally {
    database.close();
  }
});
