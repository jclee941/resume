const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const { HERO_CONTENT } = require('../../apps/portfolio/lib/hero-content-data');
const {
  buildHeroContent,
  buildProjectRolePaths,
} = require('../../apps/portfolio/lib/hero-content');

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
  const escape = (text) =>
    text.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

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

  test.each(['ko', 'en', 'ja'])('%s hero states the value and keeps one hiring path', (locale) => {
    const content = HERO_CONTENT[locale];
    const html = buildHeroContent(locale);

    expect(html).toContain(escape(content.availability));
    expect(html).toContain(escape(content.positioning));
    expect(html).toContain(
      `<ul class="hero-proof-list" aria-label="${escape(content.proofLabel)}">`
    );
    for (const item of content.proofItems.slice(0, 2)) expect(html).toContain(escape(item));
    expect(html.match(/class="hero-availability"/g)).toHaveLength(1);
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({
        href: expect.stringMatching(/^mailto:/),
        label: content.actions[0],
      }),
      expect.objectContaining({ href: '/resume.pdf', label: content.actions[3] }),
      { href: '#projects', label: content.actions[2] },
    ]);
  });

  test.each(['ko', 'en', 'ja'])(
    '%s hero drops the recruiter panel, path cards, public-project cards and role chips',
    (locale) => {
      const html = buildHeroContent(locale);

      for (const removed of [
        'hiring-review-packet',
        'hero-public-proof',
        'hero-review-path',
        'role-quick-paths',
        'role-chip',
      ]) {
        expect(html).not.toContain(removed);
      }
    }
  );

  test.each(['ko', 'en', 'ja'])('%s hero keeps identity before the portrait aside', (locale) => {
    const html = buildHeroContent(locale, undefined, {
      portraitHtml: '<figure class="hero-portrait"></figure>',
      trustHtml: '<ul class="hero-trust"></ul>',
    });
    const order = ['hero-title', 'hero-positioning', 'hero-cta', 'hero-trust', 'hero-portrait'].map(
      (name) => html.indexOf(`class="${name}`)
    );

    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  test.each(['ko', 'en', 'ja'])(
    '%s role filter chips render for the projects section',
    (locale) => {
      const html = buildProjectRolePaths(locale);

      expect(html).toContain(
        `<h3 class="role-quick-paths__title">${escape(HERO_CONTENT[locale].quickTitle)}</h3>`
      );
      for (const [id, label] of HERO_CONTENT[locale].quickRoles) {
        expect(html).toContain(`data-role-filter="${id}"`);
        expect(html).toContain(`class="role-chip__label">${escape(label)}</span>`);
      }
    }
  );

  test('shells place the hero and the role filter in their sections', () => {
    for (const shell of ['index.html', 'index-en.html']) {
      const html = readPortfolioFile(shell);
      const projects = html.slice(html.indexOf('id="projects"'));

      expect(html).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
      expect(projects.indexOf('<!-- PROJECT_ROLE_PATHS_PLACEHOLDER -->')).toBeGreaterThan(0);
      expect(projects.indexOf('<!-- PROJECT_ROLE_PATHS_PLACEHOLDER -->')).toBeLessThan(
        projects.indexOf('id="project-list"')
      );
    }
  });

  test('copy avoids retired positioning and meta phrases', () => {
    const allCopy = JSON.stringify(HERO_CONTENT);

    for (const stale of [
      'DevSecOps',
      '한 페이지에 모았습니다',
      'on one page',
      '1ページにまとめました',
    ]) {
      expect(allCopy).not.toContain(stale);
    }
    expect(buildHeroContent('ja')).not.toMatch(/[\uac00-\ud7a3]{2,}/);
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
