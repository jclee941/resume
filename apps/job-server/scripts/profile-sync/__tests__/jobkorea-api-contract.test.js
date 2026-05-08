import assert from 'node:assert';
import { describe, it } from 'node:test';
import { analyzeJobKoreaHar } from '../jobkorea-handler/har-analyze.js';
import saveHar from '../__fixtures__/jobkorea-save-request.sanitized.json' with { type: 'json' };
import portfolioHar from '../__fixtures__/jobkorea-portfolio-request.sanitized.json' with { type: 'json' };
import editFields from '../__fixtures__/jobkorea-edit-form-fields.sanitized.json' with { type: 'json' };
import saveSuccess from '../__fixtures__/jobkorea-save-response-success.sanitized.json' with { type: 'json' };
import saveFailure from '../__fixtures__/jobkorea-save-response-failure.sanitized.json' with { type: 'json' };

function encodePayload(fields) {
  return new URLSearchParams(fields.map(({ name, value }) => [name, value ?? ''])).toString();
}

function classifyJobKoreaResponse({ url = '', status = 200, contentType = '', body = '' }) {
  if (/\/Login/i.test(url) || status === 302) return 'login_redirect';
  if (/보안인증|reCAPTCHA|자동가입 방지|비정상적인 접근|captcha/i.test(body)) return 'captcha';
  if (/json/i.test(contentType)) return 'api_response';
  return 'unknown';
}

describe('JobKorea API contract fixtures', () => {
  it('encodes serialized form-array payloads for save', () => {
    const payload = encodePayload(editFields);

    assert.match(payload, /UserResume\.Resume_Title=DevSecOps\+SRE\+Engineer/);
    assert.match(payload, /Career%5Bc1%5D\.C_Name=Example\+Cloud\+Operations/);
    assert.match(payload, /hdnIsCompleteSave=False/);
    assert.doesNotMatch(payload, /person@example|010-/);
  });

  it('uses the confirmed save endpoint contract', () => {
    const analysis = analyzeJobKoreaHar(saveHar);

    assert.strictEqual(analysis.endpoints.save.method, 'POST');
    assert.strictEqual(analysis.endpoints.save.path, '/User/Resume/Save');
    assert.strictEqual(analysis.endpoints.save.query, '?_=<timestamp>');
    assert.match(analysis.endpoints.save.contentType, /x-www-form-urlencoded/);
    assert.deepStrictEqual(saveSuccess, { saveResult: { IsSuccess: true } });
    assert.strictEqual(saveFailure.saveResult.IsSuccess, false);
  });

  it('uses the confirmed portfolio registration shape', () => {
    const analysis = analyzeJobKoreaHar(portfolioHar);

    assert.strictEqual(analysis.endpoints.portfolio.method, 'POST');
    assert.strictEqual(analysis.endpoints.portfolio.path, '/User/Resume/AddUserFileDB');
    assert.deepStrictEqual(analysis.endpoints.portfolio.requestFields, [
      'File_Name',
      'Display_File_Name',
      'File_Type',
      'File_Up_Stat',
      'File_Size',
    ]);
    assert.deepStrictEqual(analysis.endpoints.portfolio.responseShape, { sc: 'number', idx: 'number' });
  });

  it('classifies login redirects', () => {
    assert.strictEqual(
      classifyJobKoreaResponse({ url: 'https://www.jobkorea.co.kr/Login', status: 200, body: '<html>login</html>' }),
      'login_redirect'
    );
  });

  it('classifies CAPTCHA and verification pages', () => {
    assert.strictEqual(
      classifyJobKoreaResponse({ body: '<html><body>보안인증 reCAPTCHA</body></html>' }),
      'captcha'
    );
  });
});
