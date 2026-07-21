import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const AUDITED_PAIRS = [
  { workspace: 'apps/job-dashboard', dependency: '@resume/env' },
  { workspace: 'packages/contracts', dependency: '@resume/types' },
  { workspace: 'packages/shared', dependency: 'zod' },
  { workspace: 'apps/job-server', dependency: 'fastify-plugin' },
];
const PRODUCTION_EXTENSIONS = new Set(['.cjs', '.js', '.mjs']);
const EXCLUDED_DIRECTORIES = new Set([
  '__tests__',
  'build',
  'coverage',
  'dist',
  'examples',
  'fixtures',
  'node_modules',
  'scripts',
  'test',
  'tests',
]);
const EXCLUDED_FILE_PATTERN = /(?:^|\.)(?:config|spec|test)\.(?:cjs|js|mjs)$/u;

function readManifest(workspaceRoot, workspace) {
  const manifestPath = path.join(workspaceRoot, 'package.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`${workspace}/package.json: invalid package metadata`, { cause: error });
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`${workspace}/package.json: package metadata must be an object`);
  }
  for (const field of ['dependencies', 'optionalDependencies']) {
    const value = manifest[field];
    if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) {
      throw new Error(`${workspace}/package.json: ${field} must be an object`);
    }
  }
  return manifest;
}

function collectProductionFiles(target, workspaceRoot, files) {
  if (!existsSync(target)) return;
  const relative = path.relative(workspaceRoot, target);
  const segments = relative.split(path.sep);
  if (segments.some((segment) => EXCLUDED_DIRECTORIES.has(segment))) return;
  const entry = lstatSync(target);
  if (entry.isSymbolicLink()) return;
  if (entry.isDirectory()) {
    for (const entry of readdirSync(target)) {
      collectProductionFiles(path.join(target, entry), workspaceRoot, files);
    }
    return;
  }
  if (
    PRODUCTION_EXTENSIONS.has(path.extname(target)) &&
    !EXCLUDED_FILE_PATTERN.test(path.basename(target))
  ) {
    files.push(relative);
  }
}

function importedSpecifiers(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false);
  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) return [];
    const { moduleSpecifier } = statement;
    return moduleSpecifier && ts.isStringLiteral(moduleSpecifier) ? [moduleSpecifier.text] : [];
  });
}

function findImporters(workspaceRoot, dependency) {
  const files = [];
  collectProductionFiles(workspaceRoot, workspaceRoot, files);
  return files.filter((relative) =>
    importedSpecifiers(readFileSync(path.join(workspaceRoot, relative), 'utf8'), relative).some(
      (specifier) => specifier === dependency || specifier.startsWith(`${dependency}/`)
    )
  );
}

function hasRuntimeOwnership(manifest, dependency) {
  return Boolean(
    Object.prototype.hasOwnProperty.call(manifest.dependencies ?? {}, dependency) ||
    Object.prototype.hasOwnProperty.call(manifest.optionalDependencies ?? {}, dependency)
  );
}

export function validateWorkspaceDependencies(repositoryRoot) {
  const inventory = [];
  const failures = [];
  for (const { workspace, dependency } of AUDITED_PAIRS) {
    const workspaceRoot = path.join(repositoryRoot, workspace);
    const manifest = readManifest(workspaceRoot, workspace);
    const importers = findImporters(workspaceRoot, dependency);
    if (importers.length === 0) {
      failures.push(`${workspace} -> ${dependency}: no production importer found`);
      continue;
    }
    if (!hasRuntimeOwnership(manifest, dependency)) {
      failures.push(
        `${workspace} -> ${dependency}: undeclared runtime dependency imported by ${importers.join(', ')}`
      );
      continue;
    }
    inventory.push({ workspace, dependency, importers });
  }
  if (failures.length > 0) throw new Error(failures.join('\n'));
  return inventory;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const inventory = validateWorkspaceDependencies(repositoryRoot);
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
}
