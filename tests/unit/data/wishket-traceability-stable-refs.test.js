'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Guard: wishket traceability/portfolio docs must NOT reference personalProjects
 * by numeric array index (e.g. personalProjects[1]). Numeric indices break
 * whenever a project is added/removed/reordered (as happened when the n8n
 * Automation project was deleted). Use name-based references instead:
 *   personalProjects[name="Security Alert System"]
 */
describe('wishket docs use reorder-stable personalProjects references', () => {
  const wishketDir = path.join(
    __dirname,
    '../../../packages/data/resumes/wishket'
  );

  const mdFiles = fs.existsSync(wishketDir)
    ? fs.readdirSync(wishketDir).filter((f) => f.endsWith('.md'))
    : [];

  it('finds wishket markdown files to check', () => {
    expect(mdFiles.length).toBeGreaterThan(0);
  });

  mdFiles.forEach((file) => {
    it(`${file} has no brittle numeric personalProjects[N] references`, () => {
      const content = fs.readFileSync(path.join(wishketDir, file), 'utf-8');
      const numericRefs = content.match(/personalProjects\[\d+\]/g) || [];
      expect(numericRefs).toEqual([]);
    });
  });
});
