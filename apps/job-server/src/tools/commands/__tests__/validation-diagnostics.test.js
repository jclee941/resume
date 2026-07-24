import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SessionManager } from '../../../shared/services/session/index.js';
import { resumeSyncTool } from '../../resume-sync.js';

function createInvalidResumeFile() {
  const directory = mkdtempSync(join(tmpdir(), 'resume-command-validation-'));
  const filePath = join(directory, 'invalid-resume.json');
  writeFileSync(filePath, '{}');
  return { directory, filePath };
}

function assertSafeSourceDiagnostic(result, filePath) {
  assert.strictEqual(result.success, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.every((error) => error.sourceFile === filePath));
  assert.ok(result.errors.every((error) => !Object.hasOwn(error, 'rawInput')));
  assert.ok(result.errors.every((error) => !Object.hasOwn(error, 'value')));
}

async function executeResumeSync(params) {
  const getAPI = SessionManager.getAPI;
  SessionManager.getAPI = async () => ({});
  try {
    return await resumeSyncTool.execute(params);
  } finally {
    SessionManager.getAPI = getAPI;
  }
}

describe('resume command validation diagnostics', () => {
  it('keeps import validation diagnostics source-aware without raw inputs', async () => {
    const { directory, filePath } = createInvalidResumeFile();
    try {
      const result = await executeResumeSync({
        action: 'import',
        resume_id: 'resume-1',
        file_path: filePath,
      });

      assertSafeSourceDiagnostic(result, filePath);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('keeps diff validation diagnostics source-aware without raw inputs', async () => {
    const { directory, filePath } = createInvalidResumeFile();
    try {
      const result = await executeResumeSync({
        action: 'diff',
        resume_id: 'resume-1',
        file_path: filePath,
      });

      assertSafeSourceDiagnostic(result, filePath);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
