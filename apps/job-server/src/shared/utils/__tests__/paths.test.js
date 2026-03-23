import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getResumeBasePath,
  getResumeMasterDataPath,
  getResumeMasterMarkdownPath,
  getOptimizedResumesDir,
} from '../paths.js';

describe('paths utils', () => {
  let originalResumeBasePath;

  beforeEach(() => {
    mock.timers?.reset?.();
    originalResumeBasePath = process.env.RESUME_BASE_PATH;
    delete process.env.RESUME_BASE_PATH;
  });

  it('getResumeBasePath returns RESUME_BASE_PATH when set', () => {
    process.env.RESUME_BASE_PATH = '/tmp/custom-resume-root';
    assert.equal(getResumeBasePath(), '/tmp/custom-resume-root');
  });

  it('getResumeBasePath resolves five directories up when env is unset', () => {
    const pathsModuleDir = dirname(fileURLToPath(new URL('../paths.js', import.meta.url)));
    const expected = resolve(pathsModuleDir, '../../../../..');

    assert.equal(getResumeBasePath(), expected);
  });

  it('getResumeMasterDataPath returns master resume JSON path', () => {
    const result = getResumeMasterDataPath();
    assert.match(result, /packages[\\/]data[\\/]resumes[\\/]master[\\/]resume_data\.json$/);
  });

  it('getResumeMasterMarkdownPath returns master resume markdown path', () => {
    const result = getResumeMasterMarkdownPath();
    assert.match(result, /packages[\\/]data[\\/]resumes[\\/]master[\\/]resume_master\.md$/);
  });

  it('getOptimizedResumesDir returns companies directory path', () => {
    const result = getOptimizedResumesDir();
    assert.match(result, /packages[\\/]data[\\/]resumes[\\/]companies$/);
  });

  it('restores RESUME_BASE_PATH after manipulation within test', () => {
    process.env.RESUME_BASE_PATH = '/tmp/temp-root';
    assert.equal(getResumeBasePath(), '/tmp/temp-root');

    if (originalResumeBasePath === undefined) {
      delete process.env.RESUME_BASE_PATH;
    } else {
      process.env.RESUME_BASE_PATH = originalResumeBasePath;
    }

    assert.equal(process.env.RESUME_BASE_PATH, originalResumeBasePath);
  });
});
