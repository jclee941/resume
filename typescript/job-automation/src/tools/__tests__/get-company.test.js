import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import WantedAPI from '../../shared/clients/wanted/index.js';
import { getCompanyTool } from '../get-company.js';

describe('getCompanyTool', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns success response with company and open jobs by default', async () => {
    mock.method(WantedAPI.prototype, 'getCompany', async () => ({
      data: {
        id: 100,
        name: 'Toss',
        industry_name: 'Fintech',
        logo_img: { origin: 'logo.png' },
        address: { full_location: 'Seoul' },
        description: 'Finance platform',
        website: 'https://toss.im',
        employee_count: 1000,
      },
    }));
    mock.method(WantedAPI.prototype, 'getCompanyJobs', async () => ({
      data: [{ id: 1, position: 'DevOps Engineer', annual_from: 3, annual_to: 7 }],
    }));

    const result = await getCompanyTool.execute({ company_id: 100 });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.company.id, 100);
    assert.strictEqual(result.company.name, 'Toss');
    assert.strictEqual(result.total_jobs, 1);
    assert.strictEqual(result.open_jobs[0].url, 'https://www.wanted.co.kr/wd/1');
  });

  it('returns error response when company API fails', async () => {
    mock.method(WantedAPI.prototype, 'getCompany', async () => {
      throw new Error('company not found');
    });

    const result = await getCompanyTool.execute({ company_id: 99999 });

    assert.deepStrictEqual(result, {
      success: false,
      error: 'company not found',
    });
  });

  it('uses default include_jobs behavior and can skip job lookup', async () => {
    const getCompanyJobsMock = mock.method(WantedAPI.prototype, 'getCompanyJobs', async () => ({
      data: [],
    }));
    mock.method(WantedAPI.prototype, 'getCompany', async () => ({
      data: { id: 123, name: 'Naver' },
    }));

    await getCompanyTool.execute({ company_id: 123 });
    assert.strictEqual(getCompanyJobsMock.mock.calls.length, 1);

    mock.restoreAll();
    const skippedGetCompanyJobsMock = mock.method(
      WantedAPI.prototype,
      'getCompanyJobs',
      async () => ({
        data: [],
      })
    );
    mock.method(WantedAPI.prototype, 'getCompany', async () => ({
      data: { id: 123, name: 'Naver' },
    }));

    const result = await getCompanyTool.execute({ company_id: 123, include_jobs: false });
    assert.strictEqual(result.success, true);
    assert.strictEqual(skippedGetCompanyJobsMock.mock.calls.length, 0);
  });

  it('handles company jobs API failure without failing main response', async () => {
    mock.method(WantedAPI.prototype, 'getCompany', async () => ({
      data: { id: 321, name: 'Kakao', industry_name: 'IT' },
    }));
    mock.method(WantedAPI.prototype, 'getCompanyJobs', async () => {
      throw new Error('jobs endpoint failed');
    });

    const result = await getCompanyTool.execute({ company_id: 321 });

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.open_jobs, []);
    assert.strictEqual(result.total_jobs, 0);
  });

  it('requires company_id in input schema', () => {
    assert.deepStrictEqual(getCompanyTool.inputSchema.required, ['company_id']);
    assert.strictEqual(getCompanyTool.inputSchema.properties.company_id.type, 'number');
  });
});
