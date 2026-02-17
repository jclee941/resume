import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import WantedAPI from '../../shared/clients/wanted/index.js';
import { getJobDetailTool } from '../get-job-detail.js';

describe('getJobDetailTool', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns success response with formatted job detail', async () => {
    mock.method(WantedAPI.prototype, 'getJobDetail', async () => ({
      job: {
        id: 325174,
        position: 'DevOps Engineer',
        company: { name: 'Toss', industry_name: 'Fintech', logo_img: { origin: 'logo.png' } },
        address: { full_location: 'Seoul' },
        annual_from: 3,
        annual_to: 8,
        reward: { formatted_total: '1,000,000' },
        due_time: '2026-12-31',
        detail: {
          main_tasks: 'Build CI/CD',
          requirements: '3+ years',
          preferred_points: 'Kubernetes',
          benefits: 'Remote work',
          intro: 'Team intro',
        },
      },
    }));

    const result = await getJobDetailTool.execute({ job_id: 325174 });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.job.id, 325174);
    assert.strictEqual(result.job.company.name, 'Toss');
    assert.strictEqual(result.job.experience, '3~8년');
    assert.strictEqual(result.job.url, 'https://www.wanted.co.kr/wd/325174');
  });

  it('returns error response when API fails', async () => {
    mock.method(WantedAPI.prototype, 'getJobDetail', async () => {
      throw new Error('job not found');
    });

    const result = await getJobDetailTool.execute({ job_id: 1 });

    assert.deepStrictEqual(result, {
      success: false,
      error: 'job not found',
    });
  });

  it('handles minimal job payload with fallback values', async () => {
    mock.method(WantedAPI.prototype, 'getJobDetail', async () => ({
      data: {
        id: 77,
        position: 'Backend Engineer',
      },
    }));

    const result = await getJobDetailTool.execute({ job_id: 77 });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.job.company.name, 'Unknown');
    assert.strictEqual(result.job.location, '');
    assert.strictEqual(result.job.experience, '0~99년');
  });

  it('passes requested job id to API', async () => {
    const getJobDetailMock = mock.method(WantedAPI.prototype, 'getJobDetail', async () => ({
      data: { id: 999, position: 'SRE' },
    }));

    await getJobDetailTool.execute({ job_id: 999 });

    assert.strictEqual(getJobDetailMock.mock.calls.length, 1);
    assert.strictEqual(getJobDetailMock.mock.calls[0].arguments[0], 999);
  });

  it('requires job_id in input schema', () => {
    assert.deepStrictEqual(getJobDetailTool.inputSchema.required, ['job_id']);
    assert.strictEqual(getJobDetailTool.inputSchema.properties.job_id.type, 'number');
  });
});
