const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

describe('portfolio hiring appeal copy', () => {
  const portfolioDir = path.join(__dirname, '../../apps/portfolio');
  const readPortfolioFile = (fileName) =>
    fs.readFileSync(path.join(portfolioDir, fileName), 'utf8');
  const importModuleExport = (relativePath, exportName) => {
    const moduleUrl = pathToFileURL(path.join(portfolioDir, relativePath)).href;
    const script = `
      const module = await import(${JSON.stringify(moduleUrl)});
      process.stdout.write(JSON.stringify(module[${JSON.stringify(exportName)}]));
    `;
    return JSON.parse(
      execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', script], {
        encoding: 'utf8',
      })
    );
  };
  const buildHeroContent = (locale) =>
    require('../../apps/portfolio/lib/hero-content').buildHeroContent(locale);

  const extractHeroActions = (html) => {
    const groupMatch = html.match(/<div class="hero-cta"[^>]*>([\s\S]*?)<\/div>/);
    expect(groupMatch).not.toBeNull();

    return Array.from(
      groupMatch[1].matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a\s*>/g)
    ).map(([, href, label]) => ({
      href,
      label: label.trim(),
    }));
  };

  test('Korean hero gives recruiters a direct review-pack path', () => {
    const html = buildHeroContent('ko');

    expect(html).toContain('보안 운영 · 보안 인프라 · SRE 면접 제안 환영');
    expect(html).toContain(
      '최근 보안 운영 경력, 이메일 연락, 면접 일정·근무 형태 협의를 먼저 연결합니다.'
    );
    expect(html).toContain('희망 역할: 보안 운영 · 보안 인프라 · SRE');
    expect(html).toContain('최근 역할: 거래소 보안 인프라 구축·운영');
    expect(html).toContain('면접 제안 가능');
    expect(html).toContain('보안 자동화와 코드 검토 역할 적합도');
    expect(html).toContain('SRE 장애 조사와 운영 가시성 근거');
    expect(html).toContain('운영 워크플로');
    expect(html).not.toContain('검토 가능');
    expect(html).not.toContain('자동화 방식');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '면접 문의' }),
      { href: '#resume', label: '경력 확인' },
      { href: '#projects', label: '프로젝트 확인' },
      expect.objectContaining({ href: '/resume.pdf', label: '이력서 PDF' }),
    ]);
    expect(readPortfolioFile('index.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('English hero gives recruiters a direct review-pack path', () => {
    const html = buildHeroContent('en');

    expect(html).toContain(
      'Open to interview requests for Security Ops, Security Infrastructure, and SRE'
    );
    expect(html).toContain(
      'Recent security operations work is grouped for role fit, email contact, interviews, and work-mode discussion.'
    );
    expect(html).toContain('Target roles: Security Ops, Security Infrastructure, SRE');
    expect(html).toContain('Recent role: exchange security infrastructure build and operations');
    expect(html).toContain('Open to interview requests');
    expect(html).toContain('Security automation and code-review role fit');
    expect(html).toContain('SRE incident review and operational visibility');
    expect(html).toContain('Response Workflow');
    expect(html).not.toContain('Ready to review');
    expect(html).not.toContain('Automation approach');
    expect(html).not.toContain('>Automation<');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({
        href: expect.stringMatching(/^mailto:/),
        label: 'Interview request',
      }),
      { href: '#resume', label: 'Review career' },
      { href: '#projects', label: 'Review projects' },
      expect.objectContaining({ href: '/resume.pdf', label: 'Resume PDF' }),
    ]);
    expect(readPortfolioFile('index-en.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('Japanese hero localizes recruiter proof and review-pack actions', () => {
    const html = buildHeroContent('ja');

    expect(html).toContain('セキュリティ運用・セキュリティ基盤・SREの面接相談を歓迎');
    expect(html).toContain(
      '直近のセキュリティ運用経験、メール連絡、面接日程、勤務形態の相談を先に示します。'
    );
    expect(html).toContain('<ul class="hero-proof-list" aria-label="確認すべき主要証跡">');
    expect(html).toContain('希望職種: セキュリティ運用・セキュリティ基盤・SRE');
    expect(html).toContain('直近役割: 取引所セキュリティ基盤の構築・運用');
    expect(html).toContain('面接相談を受付中');
    expect(html).toContain('セキュリティ自動化とコードレビューの適合性');
    expect(html).toContain('SRE障害調査と運用可視性の根拠');
    expect(html).toContain('運用ワークフロー');
    expect(html).not.toContain('確認可能');
    expect(html).not.toContain('自動化アプローチ');
    expect(html).not.toContain('>Automation<');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '面接相談' }),
      { href: '#resume', label: '経歴確認' },
      { href: '#projects', label: 'プロジェクト確認' },
      expect.objectContaining({ href: '/resume.pdf', label: '履歴書PDF' }),
    ]);

    expect(html).not.toMatch(/[\uac00-\ud7a3]{2,}/);
  });

  test('client recruiter role proof labels avoid stale automation copy', () => {
    const roleProfiles = importModuleExport(
      'src/scripts/modules/recruiter-enhancements-data.js',
      'ROLE_PROFILES'
    );
    const roleCopy = roleProfiles.flatMap((role) => [
      role.label,
      ...Object.values(role.proof || {}),
    ]);

    expect(roleCopy).toContain('Response Workflow');
    expect(roleCopy).not.toContain('Automation');
    expect(roleCopy.join('\n')).not.toMatch(/自動化|자동화/);
  });
});
