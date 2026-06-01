/**
 * Characterization test for the Mission Control module BEFORE splitting it.
 * mission-control.js (599 LOC) violates the <500 LOC hard rule and will be split
 * (command palette extracted to a submodule). These source-structure assertions
 * pin the observable contract so the refactor cannot silently change behavior.
 *
 * Asserts against SOURCE (combined across the module + its future submodules) so
 * the split can move code without breaking the contract.
 */

const fs = require('fs');
const path = require('path');

const MODULES = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'apps',
  'portfolio',
  'src',
  'scripts',
  'modules'
);

// Combine mission-control.js with any files under modules/mission-control/ so
// the contract holds whether code lives in the orchestrator or an extracted submodule.
function missionControlSource() {
  let src = fs.readFileSync(path.join(MODULES, 'mission-control.js'), 'utf-8');
  const subdir = path.join(MODULES, 'mission-control');
  if (fs.existsSync(subdir)) {
    for (const f of fs.readdirSync(subdir)) {
      if (f.endsWith('.js')) src += '\n' + fs.readFileSync(path.join(subdir, f), 'utf-8');
    }
  }
  return src;
}

describe('mission-control: public entry preserved', () => {
  test('mission-control.js exports initMissionControl', () => {
    const orch = fs.readFileSync(path.join(MODULES, 'mission-control.js'), 'utf-8');
    expect(orch).toMatch(/export function initMissionControl/);
  });

  test('main.js imports initMissionControl from ./modules/mission-control.js', () => {
    const main = fs.readFileSync(path.join(MODULES, '..', 'main.js'), 'utf-8');
    expect(main).toMatch(/import \{ initMissionControl \} from '\.\/modules\/mission-control\.js'/);
    expect(main).toMatch(/initMissionControl\(\)/);
  });
});

describe('mission-control: command palette contract', () => {
  const src = missionControlSource();

  test('all 4 command ids + labels are present', () => {
    for (const [id, label] of [
      ['experience', 'cat experience.md'],
      ['skills', 'ls skills/'],
      ['projects', 'inspect projects'],
      ['contact', 'open contact'],
    ]) {
      expect(src).toContain(`'${id}'`);
      expect(src).toContain(label);
    }
  });

  test('command targets scroll to the right sections', () => {
    expect(src).toMatch(/scrollToSection\('resume'\)/);
    expect(src).toMatch(/scrollToSection\('skills'\)/);
    expect(src).toMatch(/scrollToSection\('projects'\)/);
    expect(src).toMatch(/scrollToSection\('contact'\)/);
  });

  test('palette selectors + ARIA wiring preserved', () => {
    expect(src).toContain('mc-command-palette');
    expect(src).toContain('mc-command-suggestions');
    expect(src).toContain('aria-activedescendant');
    expect(src).toContain('scrollOffset');
    expect(src).toMatch(/clockUpdateInterval/);
  });
});

describe('mission-control: file-size hard rule', () => {
  test('mission-control.js is under 500 LOC', () => {
    const lines = fs
      .readFileSync(path.join(MODULES, 'mission-control.js'), 'utf-8')
      .split('\n').length;
    expect(lines).toBeLessThan(500);
  });
});
