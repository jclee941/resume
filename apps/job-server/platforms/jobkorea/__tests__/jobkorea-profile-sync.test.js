import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JobKoreaProfileSync } from '../jobkorea-profile-sync.js';

function createResponse(body, url = 'https://www.jobkorea.co.kr/User/Resume') {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
}

describe('JobKoreaProfileSync.getProfile', () => {
  it('extracts and normalizes profile data from resume HTML', async () => {
    const listHtml = `
      <html><body>
        <a href="/User/Resume/Edit?RNo=12345">이력서 수정</a>
      </body></html>
    `;

    const detailHtml = `
      <html><body>
        <input name="name" value="이재철" />
        <input name="email" value="qws941@kakao.com" />
        <input name="mobile" value="010-5757-9592" />
        <div>생년월일: 1994.10.17</div>

        <ul>
          <li class="education-item">학교명: 한양사이버대학교 전공: 컴퓨터공학과 학위: 학사 2026.02</li>
        </ul>

        <ul>
          <li class="career-item">회사명: (주)아이티센 CTS 직무: 보안운영 담당 2025.03 ~ 2026.02 담당업무: Splunk 기반 로그 분석</li>
        </ul>

        <div class="skill-list">Python, Splunk, FortiGate</div>

        <ul>
          <li class="cert-item">자격증명: CCNP 기관: Cisco date: 2020.08</li>
        </ul>
      </body></html>
    `;

    let fetchCount = 0;
    const crawler = {
      cookies: '',
      sleep: async () => {},
      captchaDetector: {
        detectInHtml: () => null,
        shouldPause: () => false,
      },
      rateLimitedFetch: async (url) => {
        fetchCount += 1;
        if (fetchCount === 1) {
          const response = createResponse(listHtml, url);
          Object.defineProperty(response, 'url', { value: url });
          return response;
        }
        const response = createResponse(detailHtml, url);
        Object.defineProperty(response, 'url', { value: url });
        return response;
      },
    };

    const sync = new JobKoreaProfileSync({
      crawler,
      logger: { debug: () => {}, error: () => {} },
    });

    sync.getCookieStringFromSession = () => 'ACNT_COOKIE=abc; SES_ID=xyz';

    const result = await sync.getProfile();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.personal.name, '이재철');
    assert.strictEqual(result.data.personal.email, 'qws941@kakao.com');
    assert.strictEqual(result.data.personal.phone, '010-5757-9592');
    assert.strictEqual(result.data.personal.birthDate, '1994-10-17');

    assert.strictEqual(result.data.education.school, '한양사이버대학교');
    assert.strictEqual(result.data.education.major, '컴퓨터공학과');
    assert.strictEqual(result.data.education.degree, '학사');
    assert.strictEqual(result.data.education.graduationDate, '2026-02-01');
    assert.strictEqual(result.data.careers.length, 1);
    assert.strictEqual(result.data.careers[0].company, '(주)아이티센 CTS');
    assert.strictEqual(result.data.careers[0].role, '보안운영 담당');
    assert.strictEqual(result.data.careers[0].startDate, '2025-03-01');
    assert.strictEqual(result.data.careers[0].endDate, '2026-02-01');
    assert.deepStrictEqual(result.data.summary.expertise, ['Python', 'Splunk', 'FortiGate']);
    assert.strictEqual(result.data.certifications[0].date, '2020-08-01');
  });

  it('returns structured auth error when redirected to login page', async () => {
    const crawler = {
      cookies: '',
      sleep: async () => {},
      captchaDetector: {
        detectInHtml: () => null,
        shouldPause: () => false,
      },
      rateLimitedFetch: async () => {
        const response = createResponse('<html></html>', 'https://www.jobkorea.co.kr/Login');
        Object.defineProperty(response, 'url', { value: 'https://www.jobkorea.co.kr/Login' });
        return response;
      },
    };

    const sync = new JobKoreaProfileSync({ crawler, logger: { debug: () => {}, error: () => {} } });
    sync.getCookieStringFromSession = () => 'ACNT_COOKIE=abc';

    const result = await sync.getProfile();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 'AUTH_REQUIRED');
  });

  it('returns structured captcha error when captcha is detected', async () => {
    const crawler = {
      cookies: '',
      sleep: async () => {},
      captchaDetector: {
        detectInHtml: () => ({ type: 'cloudflare', url: 'https://www.jobkorea.co.kr/User/Resume' }),
        shouldPause: () => true,
      },
      rateLimitedFetch: async (url) => {
        const response = createResponse('<html>cf_chl_opt</html>', url);
        Object.defineProperty(response, 'url', { value: url });
        return response;
      },
    };

    const sync = new JobKoreaProfileSync({ crawler, logger: { debug: () => {}, error: () => {} } });
    sync.getCookieStringFromSession = () => 'ACNT_COOKIE=abc';

    const result = await sync.getProfile();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 'CAPTCHA_DETECTED');
  });
});

describe('JobKoreaProfileSync.normalizeProfile', () => {
  it('converts Korean date strings to ISO-8601 style values', () => {
    const sync = new JobKoreaProfileSync({ logger: { debug: () => {}, error: () => {} } });

    const normalized = sync.normalizeProfile({
      basic: {
        name: '홍길동',
        birthdate: '1990.01.15',
        email: 'test@example.com',
        phone: '010-1111-2222',
      },
      education: [
        {
          school: '테스트대학교',
          major: '컴퓨터공학',
          degree: '학사',
          graduationDate: '2018.02',
        },
      ],
      careers: [
        {
          company: '테스트회사',
          position: '엔지니어',
          period: '2019.03 ~ 2021.08',
          description: '테스트',
        },
      ],
      skills: ['Node.js'],
      certifications: [
        {
          name: '정보처리기사',
          issuer: 'HRDK',
          date: '2020.05',
        },
      ],
    });

    assert.strictEqual(normalized.personal.birthDate, '1990-01-15');
    assert.strictEqual(normalized.education.graduationDate, '2018-02-01');
    assert.strictEqual(normalized.careers[0].startDate, '2019-03-01');
    assert.strictEqual(normalized.careers[0].endDate, '2021-08-01');
    assert.strictEqual(normalized.certifications[0].date, '2020-05-01');
  });
});
