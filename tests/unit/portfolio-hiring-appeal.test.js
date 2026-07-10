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

  test('Korean hero gives recruiters a direct hiring-decision path', () => {
    const html = buildHeroContent('ko');

    expect(html).toContain('보안 자동화 · 보안 인프라 면접 제안 가능');
    expect(html).toContain(
      '보안 인프라 이력과 프로젝트를 확인하세요. 연락처와 이력서 PDF도 바로 확인할 수 있습니다.'
    );
    expect(html).toContain('<ul class="hero-proof-list" aria-label="채용 판단 핵심 근거">');
    expect(html).toContain('공개 자동화 근거');
    expect(html).toContain('대상 역할: Security Automation / Infrastructure Engineer');
    expect(html).toContain('최근 근거: 넥스트레이드 보안 인프라 구축·자동화와 FSDC 감사 대응');
    expect(html).toContain('면접 제안 가능');
    expect(html).toContain('PR 리뷰 · 시크릿 스캔 · Check Run으로 코드 변경 위험을 설명');
    expect(html).toContain('메트릭·로그 관측성으로 장애와 보안 신호를 함께 확인');
    expect(html).toContain('자동화 연계');
    expect(html).toContain('연락·PDF');
    expect(html).toContain(
      '보안 자동화 역할 판단에 필요한 경력, 공개 자동화 근거, 연락·PDF를 연결했습니다.'
    );
    expect(html).not.toContain('공개 증거 바로가기');
    expect(html).not.toContain('검토할 핵심 증거');
    expect(html).not.toContain('검토할 핵심 근거');
    expect(html).not.toContain('보안 운영 · 보안 인프라 · SRE');
    expect(html).not.toContain('DevSecOps');
    expect(html).not.toContain('자동화 방식');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '면접 문의' }),
      { href: '#resume', label: '경력 보기' },
      { href: '#projects', label: '프로젝트 보기' },
      expect.objectContaining({ href: '/resume.pdf', label: '이력서 PDF' }),
    ]);
    expect(readPortfolioFile('index.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('English hero gives recruiters a direct hiring-decision path', () => {
    const html = buildHeroContent('en');

    expect(html).toContain(
      'Open to interview requests for security automation and security infrastructure roles'
    );
    expect(html).toContain(
      'Hiring decision signals are grouped first: public automation evidence, contact and resume PDF, and recent security infrastructure work.'
    );
    expect(html).toContain('Target role: Security Automation / Infrastructure Engineer');
    expect(html).toContain('Recent role: exchange security infrastructure build and automation');
    expect(html).toContain('Open to interview requests');
    expect(html).toContain('PR review, secrets scan, and check runs explain change risk');
    expect(html).toContain('Metrics and logs provide observability for incidents and signals');
    expect(html).toContain('Automation Workflow');
    expect(html).toContain('Public automation evidence');
    expect(html).not.toContain('Public proof shortcuts');
    expect(html).not.toContain('Review path');
    expect(html).not.toContain('Security Infrastructure, and SRE');
    expect(html).not.toContain('DevSecOps');
    expect(html).not.toContain('Ready to review');
    expect(html).not.toContain('Automation approach');
    expect(html).not.toContain('>Automation<');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({
        href: expect.stringMatching(/^mailto:/),
        label: 'Interview request',
      }),
      { href: '#resume', label: 'Career evidence' },
      { href: '#projects', label: 'Project evidence' },
      expect.objectContaining({ href: '/resume.pdf', label: 'Resume PDF' }),
    ]);
    expect(readPortfolioFile('index-en.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('Japanese hero localizes recruiter evidence and hiring-decision actions', () => {
    const html = buildHeroContent('ja');

    expect(html).toContain('セキュリティ自動化・セキュリティ基盤の面接依頼を歓迎');
    expect(html).toContain(
      '採用判断に必要な公開自動化根拠、連絡・履歴書PDF、直近の基盤構築を先に示します。'
    );
    expect(html).toContain('<ul class="hero-proof-list" aria-label="採用判断の主要根拠">');
    expect(html).toContain('希望職種: Security Automation / Infrastructure Engineer');
    expect(html).toContain('直近役割: 取引所セキュリティ基盤の構築・自動化');
    expect(html).toContain('面接依頼を受付中');
    expect(html).toContain('PR確認・シークレットスキャン・チェックランで変更リスクを説明');
    expect(html).toContain('メトリクスとログの可観測性で障害とセキュリティ信号を確認');
    expect(html).toContain('自動化連携');
    expect(html).not.toContain('職務別レビュー経路');
    expect(html).not.toContain('セキュリティ基盤・SRE');
    expect(html).not.toContain('DevSecOps');
    expect(html).not.toContain('確認可能');
    expect(html).not.toContain('自動化アプローチ');
    expect(html).not.toContain('>Automation<');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '面接依頼' }),
      { href: '#resume', label: '経歴確認' },
      { href: '#projects', label: 'プロジェクト確認' },
      expect.objectContaining({ href: '/resume.pdf', label: '履歴書PDF' }),
    ]);

    expect(html).not.toMatch(/[\uac00-\ud7a3]{2,}/);
  });

  test('client recruiter role evidence labels avoid stale operations copy', () => {
    const roleProfiles = importModuleExport(
      'src/scripts/modules/recruiter-enhancements-data.js',
      'ROLE_PROFILES'
    );
    const roleCopy = roleProfiles.flatMap((role) => [
      role.label,
      ...Object.values(role.proof || {}),
    ]);

    expect(roleCopy).toContain('Automation Workflow');
    expect(roleCopy).toContain('jclee-bot, PR 검토, 시크릿 스캔, Check Run');
    expect(roleCopy).not.toContain('Ops Workflow');
    expect(roleCopy).not.toContain('jclee-bot, PR 검토, 시크릿 스캔, 운영 로그');
    expect(roleCopy.join('\n')).not.toMatch(/Security Ops|Ops Visibility/);
  });
});
