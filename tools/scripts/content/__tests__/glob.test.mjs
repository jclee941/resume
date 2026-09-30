import assert from 'node:assert/strict';
import test from 'node:test';
import { compileGlobs, globToRegExp } from '../glob.mjs';

test('** spans directories and matches the directory itself', () => {
  const match = compileGlobs(['docs/**']);
  assert.equal(match('docs'), true);
  assert.equal(match('docs/a/b.md'), true);
  assert.equal(match('other/docs/a.md'), false);
});

test('**/name matches at the root and at any depth', () => {
  const match = compileGlobs(['**/keep.md']);
  assert.equal(match('keep.md'), true);
  assert.equal(match('a/b/keep.md'), true);
  assert.equal(match('a/keep.md.bak'), false);
});

test('* stays inside one path segment and matches dotfiles', () => {
  const match = compileGlobs(['dir/*.json']);
  assert.equal(match('dir/a.json'), true);
  assert.equal(match('dir/.hidden.json'), true);
  assert.equal(match('dir/sub/a.json'), false);
});

test('braces and ? expand to alternatives and one character', () => {
  const match = compileGlobs(['img/og-?.{png,webp}']);
  assert.equal(match('img/og-a.png'), true);
  assert.equal(match('img/og-b.webp'), true);
  assert.equal(match('img/og-ab.png'), false);
  assert.equal(match('img/og-a.jpg'), false);
});

test('regex metacharacters in a glob are literal', () => {
  assert.equal(globToRegExp('a+b(1).txt').test('a+b(1).txt'), true);
  assert.equal(globToRegExp('a+b(1).txt').test('aab(1)xtxt'), false);
});
