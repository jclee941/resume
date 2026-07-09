import assert from 'node:assert';
import { afterEach, describe, it } from 'node:test';
import { JobKoreaAuthError } from '../jobkorea-handler/api-errors.js';
import {
  executeHybridPortfolio,
  executeHybridSave,
  shouldUseHybridMode,
} from '../jobkorea-handler/sync-hybrid.js';

function withSyncMode(mode, fn) {
  const originalMode = process.env.JOBKOREA_SYNC_MODE;
  if (mode === undefined) {
    delete process.env.JOBKOREA_SYNC_MODE;
  } else {
    process.env.JOBKOREA_SYNC_MODE = mode;
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (originalMode === undefined) {
        delete process.env.JOBKOREA_SYNC_MODE;
      } else {
        process.env.JOBKOREA_SYNC_MODE = originalMode;
      }
    });
}

function collectLogs() {
  const logs = [];
  return {
    logs,
    logger: (message, level, scope) => logs.push({ message, level, scope }),
  };
}

afterEach(() => {
  global.fetch = undefined;
});

describe('JobKorea hybrid sync mode selection', () => {
  it('uses Playwright mode by default and enables hybrid modes explicitly', async () => {
    await withSyncMode(undefined, () => {
      assert.strictEqual(shouldUseHybridMode(), false);
    });

    await withSyncMode('playwright', () => {
      assert.strictEqual(shouldUseHybridMode(), false);
    });

    await withSyncMode('hybrid-api', () => {
      assert.strictEqual(shouldUseHybridMode(), true);
    });

    await withSyncMode('api-dry-run', () => {
      assert.strictEqual(shouldUseHybridMode(), true);
    });
  });
});

describe('executeHybridSave', () => {
  it('saves through API without invoking Playwright fallback', async () => {
    const { logs, logger } = collectLogs();
    let apiCalls = 0;
    let fallbackCalls = 0;
    const apiClient = {
      saveResume: async (fields) => {
        apiCalls++;
        assert.deepStrictEqual(fields, [{ name: 'UserResume.Resume_Title', value: 'Resume' }]);
        return { success: true, result: { saveResult: { IsSuccess: true } } };
      },
    };

    const result = await executeHybridSave(
      apiClient,
      [{ name: 'UserResume.Resume_Title', value: 'Resume' }],
      {},
      { career: [] },
      {
        logger,
        apply: true,
        diffOnly: false,
        fallbackSave: async () => {
          fallbackCalls++;
        },
      }
    );

    assert.deepStrictEqual(result, { success: true, usedApi: true });
    assert.strictEqual(apiCalls, 1);
    assert.strictEqual(fallbackCalls, 0);
    assert.ok(logs.some((entry) => entry.message.includes('Resume API save completed')));
  });

  it('preserves raw edit-page profile and photo fields missing from browser serialization', async () => {
    const { logger } = collectLogs();
    let observedBaseFields = [];
    const apiClient = {
      fetchEditPageBaseFields: async () => [
        { name: 'UserResume.Photo_File_Name', value: 'existing-photo.jpg' },
        { name: 'UserResume.Profile_Image_Path', value: '/profile/existing-photo.jpg' },
      ],
      saveResume: async (_fields, options = {}) => {
        observedBaseFields = options.baseFields || [];
        return { success: true, result: { saveResult: { IsSuccess: true } } };
      },
    };
    const page = {
      evaluate: async () => [{ name: 'UserResume.Resume_Title', value: 'Current title' }],
    };

    await executeHybridSave(
      apiClient,
      [{ name: 'UserResume.Resume_Title', value: 'Target title' }],
      page,
      {},
      {
        logger,
        apply: true,
        diffOnly: false,
      }
    );

    const baseMap = new Map(observedBaseFields.map((field) => [field.name, field.value]));
    assert.strictEqual(baseMap.get('UserResume.Resume_Title'), 'Current title');
    assert.strictEqual(baseMap.get('UserResume.Photo_File_Name'), 'existing-photo.jpg');
    assert.strictEqual(baseMap.get('UserResume.Profile_Image_Path'), '/profile/existing-photo.jpg');
  });

  it('falls back to Playwright save on auth errors', async () => {
    const { logs, logger } = collectLogs();
    let fallbackArgs = null;
    const page = { id: 'page' };
    const targetFields = [{ name: 'A', value: 'B' }];
    const sectionIndices = { career: ['c1'] };
    const apiClient = {
      saveResume: async () => {
        throw new JobKoreaAuthError('expired');
      },
    };

    const result = await executeHybridSave(apiClient, targetFields, page, sectionIndices, {
      logger,
      apply: true,
      diffOnly: false,
      fallbackSave: async (...args) => {
        fallbackArgs = args;
        return { success: true };
      },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.usedApi, false);
    assert.deepStrictEqual(fallbackArgs, [page, targetFields, sectionIndices]);
    assert.ok(
      logs.some((entry) => entry.level === 'warn' && entry.message.includes('falling back'))
    );
  });

  it('does not fall back to serialize-only Playwright save when preservation base loading fails', async () => {
    const { logs, logger } = collectLogs();
    let fallbackCalls = 0;
    const apiClient = {
      fetchEditPageBaseFields: async () => {
        throw new JobKoreaAuthError('base unavailable');
      },
      saveResume: async () => {
        throw new Error('saveResume should not run without base fields');
      },
    };

    const result = await executeHybridSave(
      apiClient,
      [{ name: 'UserResume.Resume_Title', value: 'Target title' }],
      { evaluate: async () => [{ name: 'UserResume.Resume_Title', value: 'Current title' }] },
      {},
      {
        logger,
        apply: true,
        diffOnly: false,
        fallbackSave: async () => {
          fallbackCalls++;
        },
      }
    );

    assert.strictEqual(result.success, false);
    assert.match(result.error, /base unavailable/);
    assert.strictEqual(fallbackCalls, 0);
    assert.ok(logs.some((entry) => entry.level === 'error' && entry.message.includes('base')));
  });

  it('skips API and Playwright save in dry-run mode', async () => {
    let apiCalls = 0;
    let fallbackCalls = 0;
    const result = await withSyncMode('api-dry-run', () =>
      executeHybridSave(
        {
          saveResume: async () => {
            apiCalls++;
          },
        },
        [],
        {},
        {},
        {
          apply: true,
          diffOnly: false,
          fallbackSave: async () => {
            fallbackCalls++;
          },
        }
      )
    );

    assert.deepStrictEqual(result, { success: true, dryRun: true, usedApi: false });
    assert.strictEqual(apiCalls, 0);
    assert.strictEqual(fallbackCalls, 0);
  });
});

describe('executeHybridPortfolio', () => {
  it('does not register portfolio URLs in dry-run mode', async () => {
    let registerCalls = 0;
    const result = await withSyncMode('api-dry-run', () =>
      executeHybridPortfolio(
        {
          registerPortfolio: async () => {
            registerCalls++;
            return { success: true, fileIdx: 9876 };
          },
        },
        'https://portfolio.example.test',
        [],
        {},
        { personal: { portfolio: 'https://portfolio.example.test' } }
      )
    );

    assert.deepStrictEqual(result, {
      success: true,
      skipped: true,
      dryRun: true,
      usedApi: false,
    });
    assert.strictEqual(registerCalls, 0);
  });

  it('registers portfolio through API and appends mapped fields', async () => {
    const targetFields = [];
    const apiClient = {
      registerPortfolio: async (url) => {
        assert.strictEqual(url, 'https://portfolio.example.test');
        return { success: true, fileIdx: 9876 };
      },
    };
    const ssot = { personal: { portfolio: 'https://portfolio.example.test' } };

    const result = await executeHybridPortfolio(
      apiClient,
      'https://portfolio.example.test',
      targetFields,
      {},
      ssot
    );

    assert.deepStrictEqual(result, { success: true, usedApi: true, fileIdx: 9876 });
    assert.ok(
      targetFields.some(
        (field) => field.name === 'UserResume.Attach_File_Name' && field.value === '9876,'
      )
    );
  });
});
