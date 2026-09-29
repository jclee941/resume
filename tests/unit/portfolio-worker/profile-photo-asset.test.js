'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');

describe('portfolio profile photo asset', () => {
  test('is a byte-identical copy of the SSoT resume photo', () => {
    const ssot = fs.readFileSync(path.join(ROOT, 'packages/data/resumes/master/profile-photo.jpg'));
    const asset = fs.readFileSync(path.join(ROOT, 'apps/portfolio/assets/profile-photo.jpg'));
    expect(asset.equals(ssot)).toBe(true);
  });
});
