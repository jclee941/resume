'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Guard: wishket traceability/portfolio docs must reference SSoT by
 * reorder-stable, RESOLVABLE paths.
 *
 * 1. No numeric personalProjects[N] indices (break on add/remove/reorder).
 * 2. Every `personalProjects[name="X"].field` path must resolve: the named
 *    project must exist AND the first field segment must exist on it.
 *    (Catches stale `.metrics.*` paths after the field was never present.)
 */
const wishketDir = path.join(__dirname, '../../../packages/data/resumes/wishket');
const ssotPath = path.join(
  __dirname,
  '../../../packages/data/resumes/master/resume_data.json'
);

const mdFiles = fs.existsSync(wishketDir)
  ? fs.readdirSync(wishketDir).filter((f) => f.endsWith('.md'))
  : [];

const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf-8'));
const projectsByName = new Map(
  (ssot.personalProjects || []).map((p) => [p.name, p])
);

describe('wishket docs use reorder-stable personalProjects references', () => {
  it('finds wishket markdown files to check', () => {
    expect(mdFiles.length).toBeGreaterThan(0);
  });

  mdFiles.forEach((file) => {
    const content = fs.readFileSync(path.join(wishketDir, file), 'utf-8');

    it(`${file} has no brittle numeric personalProjects[N] references`, () => {
      const numericRefs = content.match(/personalProjects\[\d+\]/g) || [];
      expect(numericRefs).toEqual([]);
    });

    it(`${file} name-based personalProjects refs resolve to real fields`, () => {
      const re = /personalProjects\[name="([^"]+)"\]\.([A-Za-z0-9_]+)/g;
      const unresolved = [];
      let m;
      while ((m = re.exec(content)) !== null) {
        const name = m[1];
        const field = m[2];
        const proj = projectsByName.get(name);
        if (!proj) {
          unresolved.push(`unknown project "${name}"`);
        } else if (!(field in proj)) {
          unresolved.push(`"${name}".${field} (field absent)`);
        }
      }
      expect(unresolved).toEqual([]);
    });
  });
});
