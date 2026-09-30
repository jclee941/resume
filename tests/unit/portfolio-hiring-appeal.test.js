const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const { HERO_CONTENT } = require('../../apps/portfolio/lib/hero-content-data');

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

    expect(html).toContain(HERO_CONTENT.ko.availability);
    expect(html).toContain(HERO_CONTENT.ko.positioning);
    expect(html).toContain(
      `<ul class="hero-proof-list" aria-label="${HERO_CONTENT.ko.proofLabel}">`
    );
    expect(html).toContain(HERO_CONTENT.ko.publicProofLabel);
    for (const item of HERO_CONTENT.ko.proofItems) expect(html).toContain(item);
    expect(html).toContain(HERO_CONTENT.ko.packetStatus);
    for (const [, , description] of HERO_CONTENT.ko.publicProofLinks) {
      expect(html).toContain(description);
    }
    for (const [, label] of HERO_CONTENT.ko.quickRoles) expect(html).toContain(label);
    expect(html).toContain(HERO_CONTENT.ko.reviewLinks[2][1]);
    for (const [term, detail] of HERO_CONTENT.ko.packetItems) {
      expect(html).toContain(`<dt>${term}</dt><dd>${detail}</dd>`);
    }
    expect(html).not.toContain('공개 증거 바로가기');
    expect(html).not.toContain('검토할 핵심 증거');
    expect(html).not.toContain('검토할 핵심 근거');
    expect(html).not.toContain('보안 운영 · 보안 인프라 · SRE');
    expect(html).not.toContain('DevSecOps');
    expect(html).not.toContain('자동화 방식');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({
        href: expect.stringMatching(/^mailto:/),
        label: HERO_CONTENT.ko.actions[0],
      }),
      { href: '#resume', label: HERO_CONTENT.ko.actions[1] },
      { href: '#projects', label: HERO_CONTENT.ko.actions[2] },
      expect.objectContaining({ href: '/resume.pdf', label: HERO_CONTENT.ko.actions[3] }),
    ]);
    expect(readPortfolioFile('index.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('English hero gives recruiters a direct hiring-decision path', () => {
    const html = buildHeroContent('en');

    expect(html).toContain(HERO_CONTENT.en.availability);
    expect(html).toContain(HERO_CONTENT.en.positioning);
    expect(html).toContain(HERO_CONTENT.en.proofItems[0].replace(/&/g, '&amp;'));
    expect(html).toContain(HERO_CONTENT.en.proofItems[1]);
    expect(html).toContain(HERO_CONTENT.en.packetStatus);
    for (const [, , description] of HERO_CONTENT.en.publicProofLinks) {
      expect(html).toContain(description);
    }
    for (const [, label] of HERO_CONTENT.en.quickRoles) {
      expect(html).toContain(`class="role-chip__label">${label}</span>`);
    }
    expect(html).not.toContain('Automation Workflow');
    expect(html).toContain(HERO_CONTENT.en.publicProofLabel);
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
        label: HERO_CONTENT.en.actions[0],
      }),
      { href: '#resume', label: HERO_CONTENT.en.actions[1] },
      { href: '#projects', label: HERO_CONTENT.en.actions[2] },
      expect.objectContaining({ href: '/resume.pdf', label: HERO_CONTENT.en.actions[3] }),
    ]);
    expect(readPortfolioFile('index-en.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test.each(['ko', 'en', 'ja'])(
    '%s hero groups keep actions before evidence and navigation',
    (locale) => {
      const html = buildHeroContent(locale);
      const groups = ['hero-intro', 'hero-cta', 'hero-evidence', 'hero-navigation'];
      const positions = groups.map((name) => html.indexOf(`class="${name}"`));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((left, right) => left - right));
      expect(html).not.toContain('hiring-review-packet__summary');
      expect(extractHeroActions(html)).toHaveLength(4);
    }
  );

  test('Japanese hero localizes recruiter evidence and hiring-decision actions', () => {
    const html = buildHeroContent('ja');

    expect(html).toContain(HERO_CONTENT.ja.availability);
    expect(html).toContain(HERO_CONTENT.ja.positioning);
    expect(html).toContain(
      `<ul class="hero-proof-list" aria-label="${HERO_CONTENT.ja.proofLabel}">`
    );
    expect(html).toContain(HERO_CONTENT.ja.proofItems[0].replace(/&/g, '&amp;'));
    expect(html).toContain(HERO_CONTENT.ja.proofItems[1]);
    expect(html).toContain(HERO_CONTENT.ja.packetStatus);
    for (const [, , description] of HERO_CONTENT.ja.publicProofLinks) {
      expect(html).toContain(description);
    }
    for (const [, label] of HERO_CONTENT.ja.quickRoles) expect(html).toContain(label);
    expect(html).not.toContain('職務別レビュー経路');
    expect(html).not.toContain('セキュリティ基盤・SRE');
    expect(html).not.toContain('DevSecOps');
    expect(html).not.toContain('確認可能');
    expect(html).not.toContain('自動化アプローチ');
    expect(html).not.toContain('>Automation<');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({
        href: expect.stringMatching(/^mailto:/),
        label: HERO_CONTENT.ja.actions[0],
      }),
      { href: '#resume', label: HERO_CONTENT.ja.actions[1] },
      { href: '#projects', label: HERO_CONTENT.ja.actions[2] },
      expect.objectContaining({ href: '/resume.pdf', label: HERO_CONTENT.ja.actions[3] }),
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

    expect(roleCopy).toContain('Security Engineering');
    expect(roleCopy).toContain('AI Engineering');
    expect(roleCopy).not.toContain('Security Automation');
    expect(roleCopy).not.toContain('Automation');
    expect(roleCopy).not.toContain('Automation Workflow');
    expect(roleCopy.every((text) => typeof text === 'string' && text.length > 0)).toBe(true);
    expect(roleCopy).not.toContain('Ops Workflow');
    expect(roleCopy).not.toContain('jclee-bot, PR 검토, 시크릿 스캔, 운영 로그');
    expect(roleCopy.join('\n')).not.toMatch(/Security Ops|Ops Visibility/);
  });
});
