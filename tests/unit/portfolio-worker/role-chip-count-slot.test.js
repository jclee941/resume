const { buildProjectRolePaths } = require('../../../apps/portfolio/lib/hero-content');
const { createFakeDocument, createFakeElement } = require('../../helpers/fake-dom');

describe('role chip proof-count slot', () => {
  test.each([
    ['ko', '근거 00건'],
    ['en', '00 evidence items'],
    ['ja', '00件の根拠'],
  ])('%s chips render an empty, hidden slot sized for the widest count', (locale, sizer) => {
    const html = buildProjectRolePaths(locale);
    const chips = html.match(/<button type="button" class="role-chip"[\s\S]*?<\/button>/g);
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip).toContain(
        `<span class="role-chip__count" data-sizer="${sizer}" aria-hidden="true"></span>`
      );
    }
  });

  test('the client fills the existing slot instead of adding one and exposes it', async () => {
    const document = createFakeDocument();
    const chip = createFakeElement('button');
    chip.setAttribute('data-role-filter', 'security');
    const slot = createFakeElement('span');
    slot.className = 'role-chip__count';
    slot.setAttribute('aria-hidden', 'true');
    chip.appendChild(slot);
    document.querySelectorAll = () => [chip];
    global.document = document;
    global.window = {};
    const { applyRoleProofCounts } =
      await import('../../../apps/portfolio/src/scripts/modules/recruiter-role-proofs.js');
    applyRoleProofCounts(new Map([['security', 3]]));
    expect(chip.querySelectorAll('.role-chip__count')).toEqual([slot]);
    expect(slot.textContent).toContain('3');
    expect(slot.hasAttribute('aria-hidden')).toBe(false);
    delete global.document;
    delete global.window;
  });
});
