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

    expect(html).toContain('운영 흐름');
    expect(html).toContain('운영 워크플로');
    expect(html).not.toContain('자동화 방식');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '채용 문의' }),
      { href: '#resume', label: '경력 보기' },
      { href: '#projects', label: '프로젝트 보기' },
      expect.objectContaining({ href: '/resume.pdf', label: '이력서 PDF' }),
    ]);
    expect(readPortfolioFile('index.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('English hero gives recruiters a direct review-pack path', () => {
    const html = buildHeroContent('en');

    expect(html).toContain('Response workflow');
    expect(html).toContain('Response Workflow');
    expect(html).not.toContain('Automation approach');
    expect(html).not.toContain('>Automation<');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({
        href: expect.stringMatching(/^mailto:/),
        label: 'Contact about role',
      }),
      { href: '#resume', label: 'Career evidence' },
      { href: '#projects', label: 'Project evidence' },
      expect.objectContaining({ href: '/resume.pdf', label: 'Resume PDF' }),
    ]);
    expect(readPortfolioFile('index-en.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('Japanese hero localizes recruiter proof and review-pack actions', () => {
    const html = buildHeroContent('ja');

    expect(html).toContain('<p class="hero-availability">セキュリティ基盤・SIEM・SREを検討中</p>');
    expect(html).toContain('<ul class="hero-proof-list" aria-label="代表的な業務証跡">');
    expect(html).toContain('取引所ネットワーク分離・エンドポイントセキュリティ運用');
    expect(html).toContain('Splunk ES検知ルール・Slack/SMS通知');
    expect(html).toContain('FortiManager APIベースのポリシー照会');
    expect(html).toContain('運用フロー');
    expect(html).toContain('運用ワークフロー');
    expect(html).not.toContain('自動化アプローチ');
    expect(html).not.toContain('>Automation<');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '採用相談' }),
      { href: '#resume', label: '経歴を見る' },
      { href: '#projects', label: 'プロジェクトを見る' },
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
