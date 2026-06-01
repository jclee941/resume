import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JobKoreaCrawler from '../jobkorea-crawler.js';

const PROFILE_HTML = `
<main>
  <section class="resume-basic">
    <h1 class="profile-name">홍길동</h1>
    <p class="resume-title">DevSecOps 엔지니어</p>
    <span>hong@example.com</span>
    <span>010-1234-5678</span>
  </section>
  <section class="career-section">
    <div class="career-item">
      <strong>회사명: Example Corp</strong>
      <p>부서: Platform</p>
      <p>직무: SRE</p>
      <p>2020.01 ~ 현재</p>
      <p>담당업무: 인프라 자동화</p>
    </div>
  </section>
  <section class="education-section">
    <div class="education-item">
      <p>학교: 한국대학교</p>
      <p>전공: 컴퓨터공학</p>
      <p>졸업</p>
      <p>2012.03 ~ 2016.02</p>
    </div>
  </section>
  <section class="skill-section">Kubernetes · Terraform · Prometheus</section>
  <section class="certification-section">
    <div class="certificate-item">
      <p>CKA</p>
      <p>CNCF</p>
      <p>2024.01</p>
    </div>
  </section>
</main>`;

function createBrowserRunner({
  url = 'https://www.jobkorea.co.kr/User/Resume/View?rNo=123',
  html,
  error,
} = {}) {
  return async (action) => {
    if (error) throw error;
    const page = {
      cookies: [],
      async setCookie(...cookies) {
        this.cookies.push(...cookies);
      },
      async goto(targetUrl) {
        this.targetUrl = targetUrl;
      },
      url() {
        return url;
      },
      async waitForSelector() {},
      async content() {
        return html || PROFILE_HTML;
      },
    };
    return action(page);
  };
}

describe('JobKoreaCrawler.getProfile', () => {
  it('returns AUTH_REQUIRED when no cookies set', async () => {
    const crawler = new JobKoreaCrawler();
    const result = await crawler.getProfile();
    assert.equal(result.success, false);
    assert.equal(result.source, 'jobkorea');
    assert.equal(result.status, 'AUTH_REQUIRED');
    assert.equal(result.error, 'Authentication required');
  });

  it('scrapes the authenticated resume view into a normalized profile', async () => {
    const crawler = new JobKoreaCrawler({
      cookies: 'session=abc123',
      resumeNo: '123',
      browserRunner: createBrowserRunner(),
    });
    const result = await crawler.getProfile();

    assert.equal(result.success, true);
    assert.equal(result.source, 'jobkorea');
    assert.equal(result.profile.basic.name, '홍길동');
    assert.equal(result.profile.basic.email, 'hong@example.com');
    assert.equal(result.profile.basic.phone, '010-1234-5678');
    assert.equal(result.profile.careers[0].company, 'Example Corp');
    assert.equal(result.profile.education.school, '한국대학교');
    assert.deepEqual(result.profile.skills, ['Kubernetes', 'Terraform', 'Prometheus']);
    assert.equal(result.profile.certifications[0].name, 'CKA');
    assert.equal(result.profile.meta.resumeNo, '123');
  });

  it('returns SESSION_EXPIRED when JobKorea redirects to login', async () => {
    const crawler = new JobKoreaCrawler({
      cookies: 'session=abc123',
      resumeNo: '123',
      browserRunner: createBrowserRunner({
        url: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp?re_url=/User/Resume/View',
      }),
    });
    const result = await crawler.getProfile();

    assert.equal(result.success, false);
    assert.equal(result.source, 'jobkorea');
    assert.equal(result.status, 'SESSION_EXPIRED');
    assert.equal(result.profile, null);
  });

  it('does not throw and returns structured failure on scrape errors', async () => {
    const crawler = new JobKoreaCrawler({
      cookies: 'session=xyz',
      resumeNo: '123',
      browserRunner: createBrowserRunner({ error: new Error('browser unavailable') }),
    });
    await assert.doesNotReject(() => crawler.getProfile());
    const result = await crawler.getProfile();
    assert.equal(result.success, false);
    assert.equal(result.status, 'SCRAPE_FAILED');
    assert.equal(result.error, 'browser unavailable');
  });
});
