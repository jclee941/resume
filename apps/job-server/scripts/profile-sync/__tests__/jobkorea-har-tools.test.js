import assert from 'node:assert';
import { describe, it } from 'node:test';
import { analyzeJobKoreaHar, findJobKoreaPortfolioRequests, findJobKoreaSaveRequests, summarizeHarRequest } from '../jobkorea-handler/har-analyze.js';
import { assertNoSensitiveHarContent, sanitizeHar, sanitizeHeaders, sanitizePostData } from '../jobkorea-handler/har-sanitize.js';
import saveHar from '../__fixtures__/jobkorea-save-request.sanitized.json' with { type: 'json' };
import portfolioHar from '../__fixtures__/jobkorea-portfolio-request.sanitized.json' with { type: 'json' };

function rawHar() {
  return {
    log: {
      entries: [
        {
          request: {
            method: 'POST',
            url: 'https://www.jobkorea.co.kr/User/Resume/Save?_=1777777777777',
            headers: [
              { name: 'Cookie', value: 'JKSESSION=secret-session' },
              { name: 'Authorization', value: 'Bearer secret-token' },
              { name: 'Content-Type', value: 'application/x-www-form-urlencoded; charset=UTF-8' },
            ],
            queryString: [{ name: '_', value: '1777777777777' }],
            postData: {
              mimeType: 'application/x-www-form-urlencoded; charset=UTF-8',
              params: [
                { name: 'M_ID', value: 'real-user' },
                { name: 'M_PWD', value: 'real-password' },
                { name: 'UserResume.Email', value: 'person@example.test' },
                { name: 'Career[c1].C_Name', value: 'Example Cloud Operations' },
              ],
            },
          },
          response: {
            status: 200,
            headers: [{ name: 'Set-Cookie', value: 'NEWSESSION=secret' }],
            content: { mimeType: 'application/json', text: '{"saveResult":{"IsSuccess":true}}' },
          },
        },
      ],
    },
  };
}

describe('JobKorea HAR sanitizer', () => {
  it('redacts sensitive headers while preserving names', () => {
    const headers = sanitizeHeaders([
      { name: 'Cookie', value: 'A=B' },
      { name: 'Content-Type', value: 'application/json' },
    ]);

    assert.deepStrictEqual(headers, [
      { name: 'Cookie', value: '[REDACTED]' },
      { name: 'Content-Type', value: 'application/json' },
    ]);
  });

  it('redacts sensitive form fields but preserves field names', () => {
    const postData = sanitizePostData({
      params: [
        { name: 'M_ID', value: 'real-user' },
        { name: 'UserResume.Cellphone', value: '010-1111-2222' },
        { name: 'Career[c1].C_Name', value: 'Example Cloud Operations' },
      ],
    });

    assert.strictEqual(postData.params[0].name, 'M_ID');
    assert.strictEqual(postData.params[0].value, '[REDACTED]');
    assert.strictEqual(postData.params[1].value, '[REDACTED]');
    assert.strictEqual(postData.params[2].value, 'Example Cloud Operations');
  });

  it('normalizes volatile save timestamp query params', () => {
    const sanitized = sanitizeHar(rawHar());
    const entry = sanitized.log.entries[0];

    assert.strictEqual(entry.request.url, 'https://www.jobkorea.co.kr/User/Resume/Save?_=<timestamp>');
    assert.deepStrictEqual(entry.request.queryString, [{ name: '_', value: '<timestamp>' }]);
  });

  it('fails when sensitive content remains', () => {
    assert.throws(() => assertNoSensitiveHarContent('Cookie: JKSESSION=secret-session'), /Sensitive HAR content/);
    assert.doesNotThrow(() => assertNoSensitiveHarContent(JSON.stringify(sanitizeHar(rawHar()))));
  });

  it('does not flag cookie object properties in JS response content', () => {
    const harWithJsResponse = {
      log: {
        entries: [
          {
            request: { method: 'GET', url: 'https://example.com/api.js', headers: [] },
            response: {
              status: 200,
              headers: [],
              content: {
                mimeType: 'application/javascript',
                text: 'var o={cookie:""},Dp=function(a){return a&&Wf(5)?a:0};',
              },
            },
          },
        ],
      },
    };
    assert.doesNotThrow(() => assertNoSensitiveHarContent(JSON.stringify(harWithJsResponse, null, 2)));
  });
});

describe('JobKorea HAR analyzer', () => {
  it('finds save POST requests', () => {
    const requests = findJobKoreaSaveRequests(saveHar);

    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0].request.url, 'https://www.jobkorea.co.kr/User/Resume/Save?_=<timestamp>');
  });

  it('finds portfolio POST requests', () => {
    const requests = findJobKoreaPortfolioRequests(portfolioHar);

    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0].request.url, 'https://www.jobkorea.co.kr/User/Resume/AddUserFileDB');
  });

  it('summarizes headers and request field counts', () => {
    const summary = summarizeHarRequest(saveHar.log.entries[1]);

    assert.strictEqual(summary.method, 'POST');
    assert.ok(summary.requiredHeaders.includes('Content-Type'));
    assert.ok(summary.requiredHeaders.includes('X-Requested-With'));
    assert.ok(summary.requestFieldCount >= 10);
    assert.ok(summary.hiddenFields.includes('hdnIsCompleteSave'));
  });

  it('extracts endpoint response shapes', () => {
    const combined = { log: { entries: [...saveHar.log.entries, ...portfolioHar.log.entries] } };
    const analysis = analyzeJobKoreaHar(combined);

    assert.deepStrictEqual(analysis.endpoints.save.responseShape, {
      saveResult: { IsSuccess: 'boolean' },
    });
    assert.deepStrictEqual(analysis.endpoints.portfolio.responseShape, { sc: 'number', idx: 'number' });
  });
});
