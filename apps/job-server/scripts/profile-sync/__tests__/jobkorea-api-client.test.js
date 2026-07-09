import assert from 'node:assert';
import { afterEach, describe, it } from 'node:test';
import { JobKoreaAPIClient } from '../jobkorea-handler/api-client.js';
import {
  JobKoreaAuthError,
  JobKoreaCaptchaError,
  JobKoreaSaveError,
} from '../jobkorea-handler/api-errors.js';

function jsonResponse(body, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    url: options.url ?? 'https://www.jobkorea.co.kr/User/Resume/Save',
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

afterEach(() => {
  global.fetch = undefined;
});

describe('JobKoreaAPIClient', () => {
  it('saves a resume using the confirmed direct API contract', async () => {
    const fixedNow = 1777777777777;
    const originalNow = Date.now;
    Date.now = () => fixedNow;
    const requests = [];
    global.fetch = async (url, options) => {
      requests.push({ url, options });
      return jsonResponse({ saveResult: { IsSuccess: true } });
    };

    try {
      const client = new JobKoreaAPIClient({ cookieString: 'JKSESSION=abc' });
      const result = await client.saveResume(
        [{ name: 'UserResume.Resume_Title', value: 'Title' }],
        {
          tokens: {
            IsEditPage: 'True',
            IsCompleteSave: 'False',
            LastEditDateTicks: '123',
            hdnIsCompleteSave: 'False',
          },
        }
      );
      // fetchEditPageTokens is skipped when tokens are provided
      const { url, options } = requests[0];

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.result, { saveResult: { IsSuccess: true } });
      assert.strictEqual(
        url.toString(),
        `https://www.jobkorea.co.kr/User/Resume/Save?_=${fixedNow}`
      );
      assert.strictEqual(options.method, 'POST');
      assert.match(options.headers['Content-Type'], /application\/x-www-form-urlencoded/);
      assert.strictEqual(options.headers['X-Requested-With'], 'XMLHttpRequest');
      assert.strictEqual(options.headers.Origin, 'https://www.jobkorea.co.kr');
      assert.strictEqual(options.headers.Cookie, 'JKSESSION=abc');
      assert.match(options.body, /UserResume\.Resume_Title=Title/);
      assert.match(options.body, /hdnIsCompleteSave=False/);
    } finally {
      Date.now = originalNow;
    }
  });

  it('throws JobKoreaSaveError when saveResult.IsSuccess is false', async () => {
    global.fetch = async () =>
      jsonResponse({ saveResult: { IsSuccess: false, ErrorMessage: 'invalid resume' } });

    const client = new JobKoreaAPIClient({ cookieString: 'JKSESSION=abc' });

    await assert.rejects(
      () => client.saveResume([]),
      (error) => {
        assert.ok(error instanceof JobKoreaSaveError);
        assert.strictEqual(error.message, 'invalid resume');
        assert.strictEqual(error.endpoint, '/User/Resume/Save');
        return true;
      }
    );
  });

  it('registers a portfolio URL and extracts file idx', async () => {
    const requests = [];
    global.fetch = async (url, options) => {
      requests.push({ url, options });
      return jsonResponse(
        { sc: 1, idx: 12345 },
        { url: 'https://www.jobkorea.co.kr/User/Resume/AddUserFileDB' }
      );
    };

    const client = new JobKoreaAPIClient({ cookieString: 'JKSESSION=abc' });
    const result = await client.registerPortfolio('https://resume.example.test');
    const { options } = requests[0];

    assert.deepStrictEqual(result, {
      success: true,
      fileIdx: 12345,
      rawResponse: JSON.stringify({ sc: 1, idx: 12345 }),
    });
    assert.match(options.body, /File_Name=https%3A%2F%2Fresume\.example\.test/);
    assert.match(options.body, /File_Type=2/);
  });

  it('detects auth redirects in API responses and session checks', async () => {
    global.fetch = async () =>
      jsonResponse('<html>login</html>', { url: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp' });

    const client = new JobKoreaAPIClient({ cookieString: 'JKSESSION=abc' });

    await assert.rejects(() => client.saveResume([]), JobKoreaAuthError);

    const session = await client.checkSession();
    assert.deepStrictEqual(session, { valid: false, reason: 'jwt_expired' });
  });

  it('detects CAPTCHA challenge responses', async () => {
    global.fetch = async () => jsonResponse('<html><body>보안인증 reCAPTCHA</body></html>');

    const client = new JobKoreaAPIClient({ cookieString: 'JKSESSION=abc' });

    await assert.rejects(() => client.saveResume([]), JobKoreaCaptchaError);
  });

  it('injects updated cookie headers after setCookies', async () => {
    const requests = [];
    global.fetch = async (url, options) => {
      requests.push({ url, options });
      return jsonResponse({ saveResult: { IsSuccess: true } });
    };

    const client = new JobKoreaAPIClient({ cookieString: 'OLD=1' });
    client.setCookies('NEW=2; OTHER=3');
    await client.saveResume([]);

    assert.strictEqual(requests[0].options.headers.Cookie, 'NEW=2; OTHER=3');
  });

  it('rejects login pages when fetching edit-page base fields', async () => {
    global.fetch = async () =>
      jsonResponse('<html>login</html>', { url: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp' });

    const client = new JobKoreaAPIClient({ cookieString: 'JKSESSION=abc' });

    await assert.rejects(() => client.fetchEditPageBaseFields(), JobKoreaAuthError);
  });

  it('rejects empty edit-page base fields before a preservation-sensitive save', async () => {
    global.fetch = async () => jsonResponse('<html><form id="frm1"></form></html>');

    const client = new JobKoreaAPIClient({ cookieString: 'JKSESSION=abc' });

    await assert.rejects(
      () => client.fetchEditPageBaseFields(),
      /edit-page base fields were empty/
    );
  });
});
