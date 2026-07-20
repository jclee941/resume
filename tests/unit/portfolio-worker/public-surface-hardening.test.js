const fs = require('node:fs');
const path = require('node:path');

const { TEMPLATE_CACHE } = require('../../../apps/portfolio/lib/config');
const { generateProjectCards } = require('../../../apps/portfolio/lib/cards');
const { generateContactGrid } = require('../../../apps/portfolio/lib/cards/layout');
const { generateWebData } = require('../../../tools/scripts/utils/resume-web-data-generator');

const ROOT = path.resolve(__dirname, '../../..');
const LOCALE_FILES = ['resume_data.json', 'resume_data_en.json', 'resume_data_ja.json'];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('public portfolio hardening', () => {
  beforeEach(() => {
    TEMPLATE_CACHE.dataHash = null;
    TEMPLATE_CACHE.projectCardsHtml = null;
  });

  test.each(LOCALE_FILES)('%s exposes three featured project cards by default', (file) => {
    const data = JSON.parse(read(`packages/data/resumes/master/${file}`));
    const html = generateProjectCards(data.projects, `public-surface:${file}`);

    expect((html.match(/data-project-extra="true"/g) || []).length).toBe(
      data.projects.length - 3
    );
  });

  test.each(LOCALE_FILES)('%s publishes only working contact evidence', (file) => {
    const data = JSON.parse(read(`packages/data/resumes/master/${file}`));
    const html = generateContactGrid(data.contact);

    expect(data.contact.githubBot).toBeUndefined();
    expect(html).not.toContain('jclee-bot');
    const publicData = generateWebData(data);
    expect(publicData.contact.phone).toBeUndefined();
  });

  test.each(['apps/portfolio/index.html', 'apps/portfolio/index-en.html'])(
    '%s omits public telephone and the unavailable repository',
    (file) => {
      const html = read(file);

      expect(html).not.toContain('"telephone"');
      expect(html).not.toContain('github.com/jclee941/jclee-bot');
    }
  );

  test('back-to-top control synchronizes visual and accessibility state', () => {
    const source = read('apps/portfolio/src/scripts/modules/ui.js');

    expect(source).toContain("btn.textContent = '↑'");
    expect(source).toContain("btn.setAttribute('aria-hidden', String(!visible))");
    expect(source).toContain('btn.tabIndex = visible ? 0 : -1');
  });
});
