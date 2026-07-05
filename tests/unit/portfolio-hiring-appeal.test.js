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

    expect(html).toContain('보안 운영 · 보안 인프라 역할의 면접 제안을 우선 검토합니다');
    expect(html).toContain(
      '본인가와 감사 대응에서 설명 가능한 보안 운영 근거를 먼저 볼 수 있게 정리했습니다.'
    );
    expect(html).toContain('<ul class="hero-proof-list" aria-label="검토할 핵심 근거">');
    expect(html).toContain('공개 근거 바로가기');
    expect(html).toContain('검토 역할: 보안 운영 · 보안 인프라 · SIEM');
    expect(html).toContain('최근 근거: 넥스트레이드 구축·운영과 FSDC 감사 대응');
    expect(html).toContain('면접 제안 우선 검토');
    expect(html).toContain('PR 리뷰 · 시크릿 스캔 · Check Run');
    expect(html).toContain('메트릭·로그를 함께 보는 운영 대시보드');
    expect(html).toContain('Ops Workflow');
    expect(html).toContain('메일·PDF 확인');
    expect(html).toContain('검토 순서대로 경력·프로젝트·PDF를 연결했습니다.');
    expect(html).not.toContain('공개 증거 바로가기');
    expect(html).not.toContain('검토할 핵심 증거');
    expect(html).not.toContain('보안 운영 · 보안 인프라 · SRE');
    expect(html).not.toContain('DevSecOps');
    expect(html).not.toContain('면접 제안 가능');
    expect(html).not.toContain('자동화 방식');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '면접 문의' }),
      { href: '#resume', label: '경력 보기' },
      { href: '#projects', label: '프로젝트 보기' },
      expect.objectContaining({ href: '/resume.pdf', label: '이력서 PDF' }),
    ]);
    expect(readPortfolioFile('index.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('English hero gives recruiters a direct review-pack path', () => {
    const html = buildHeroContent('en');

    expect(html).toContain(
      'Open to interview requests for security operations and security infrastructure roles'
    );
    expect(html).toContain(
      'Exchange security build and operations, SIEM alerting, and appliance API lookup evidence are grouped first.'
    );
    expect(html).toContain('Target roles: Security Operations and Security Infrastructure');
    expect(html).toContain('Recent role: exchange security infrastructure build and operations');
    expect(html).toContain('Open to interview requests');
    expect(html).toContain('Security automation and code-review role fit');
    expect(html).toContain('Operational log and metric visibility');
    expect(html).toContain('Ops Workflow');
    expect(html).toContain('Public evidence shortcuts');
    expect(html).not.toContain('Public proof shortcuts');
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
      { href: '#resume', label: 'Review career' },
      { href: '#projects', label: 'Review projects' },
      expect.objectContaining({ href: '/resume.pdf', label: 'Resume PDF' }),
    ]);
    expect(readPortfolioFile('index-en.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('Japanese hero localizes recruiter evidence and review-pack actions', () => {
    const html = buildHeroContent('ja');

    expect(html).toContain('セキュリティ運用・セキュリティ基盤の面接相談を歓迎');
    expect(html).toContain(
      '取引所セキュリティ基盤の構築・運用、SIEM通知、機器API照会の根拠を先に示します。'
    );
    expect(html).toContain('<ul class="hero-proof-list" aria-label="確認すべき主要根拠">');
    expect(html).toContain('希望職種: セキュリティ運用・セキュリティ基盤');
    expect(html).toContain('直近役割: 取引所セキュリティ基盤の構築・運用');
    expect(html).toContain('面接相談を受付中');
    expect(html).toContain('セキュリティ自動化とコードレビューの適合性');
    expect(html).toContain('運用ログ・メトリクス確認の根拠');
    expect(html).toContain('Ops Workflow');
    expect(html).not.toContain('セキュリティ基盤・SRE');
    expect(html).not.toContain('DevSecOps');
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

  test('client recruiter role evidence labels avoid stale automation copy', () => {
    const roleProfiles = importModuleExport(
      'src/scripts/modules/recruiter-enhancements-data.js',
      'ROLE_PROFILES'
    );
    const roleCopy = roleProfiles.flatMap((role) => [
      role.label,
      ...Object.values(role.proof || {}),
    ]);

    expect(roleCopy).toContain('Ops Workflow');
    expect(roleCopy).toContain('jclee-bot, PR 검토, 시크릿 스캔, Check Run');
    expect(roleCopy).not.toContain('Automation');
    expect(roleCopy).not.toContain('jclee-bot, PR 검토, 시크릿 스캔, 운영 로그');
    expect(roleCopy.join('\n')).not.toMatch(/自動化|자동화/);
  });
});
