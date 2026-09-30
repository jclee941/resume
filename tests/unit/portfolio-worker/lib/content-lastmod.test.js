const {
  CONTENT_PATHS,
  resolveContentLastmod,
} = require('../../../../apps/portfolio/lib/content-lastmod');

function execReturning(outputs) {
  const calls = [];
  const exec = (command) => {
    calls.push(command);
    const next = outputs.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { exec, calls };
}

describe('resolveContentLastmod', () => {
  const now = () => new Date('2030-05-06T12:00:00Z');
  const noManifest = () => {
    throw new Error('ENOENT');
  };
  const manifestOf =
    (...files) =>
    () =>
      JSON.stringify({ version: 1, source: 'd1', files });

  test('uses the last commit that touched rendered content', () => {
    const { exec, calls } = execReturning(['2026-09-20\n']);

    expect(resolveContentLastmod({ exec, now, readManifest: noManifest })).toBe('2026-09-20');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(`git log -1 --format=%cs -- ${CONTENT_PATHS.join(' ')}`);
  });

  test('falls back to the HEAD commit date when the content history is absent', () => {
    const { exec, calls } = execReturning(['\n', '2026-09-25\n']);

    expect(resolveContentLastmod({ exec, now, readManifest: noManifest })).toBe('2026-09-25');
    expect(calls[1]).toBe('git log -1 --format=%cs');
  });

  test('falls back to the build day when git is unavailable', () => {
    const { exec } = execReturning([new Error('git missing'), new Error('git missing')]);

    expect(resolveContentLastmod({ exec, now, readManifest: noManifest })).toBe('2030-05-06');
  });

  describe('D1 content updates', () => {
    const entry = (p, updated_at) => ({ path: p, sha256: 'x', size: 1, updated_at });

    test('uses the manifest date when a D1 update is newer than the git date', () => {
      const { exec } = execReturning(['2026-09-20\n']);
      const readManifest = manifestOf(
        entry('apps/portfolio/index.html', '2026-09-28T10:00:00.000Z'),
        entry('packages/data/resumes/master/resume_data.json', '2026-09-27 08:00:00')
      );

      expect(resolveContentLastmod({ exec, now, readManifest })).toBe('2026-09-28');
    });

    test('keeps the git date when it is newer than every D1 update', () => {
      const { exec } = execReturning(['2026-09-30\n']);
      const readManifest = manifestOf(entry('apps/portfolio/src/a.js', '2026-09-28T10:00:00Z'));

      expect(resolveContentLastmod({ exec, now, readManifest })).toBe('2026-09-30');
    });

    test('ignores entries outside CONTENT_PATHS and entries without a valid updated_at', () => {
      const { exec } = execReturning(['2026-09-20\n']);
      const readManifest = manifestOf(
        entry('applications/role/cover.md', '2026-10-01T00:00:00Z'),
        entry('apps/portfolio/index-ja.html', '2026-10-02T00:00:00Z'),
        entry('apps/portfolio/library/x.js', '2026-10-03T00:00:00Z'),
        entry('apps/portfolio/lib/a.js', 'not-a-date'),
        { path: 'apps/portfolio/lib/b.js', sha256: 'x', size: 1 },
        entry('apps/portfolio/lib/c.js', '2026-09-22T05:00:00Z')
      );

      expect(resolveContentLastmod({ exec, now, readManifest })).toBe('2026-09-22');
    });

    test('ignores a malformed manifest', () => {
      for (const text of ['{not json', 'null', '{"files":"nope"}', '{"files":[null,1]}']) {
        const { exec } = execReturning(['2026-09-20\n']);

        expect(resolveContentLastmod({ exec, now, readManifest: () => text })).toBe('2026-09-20');
      }
    });

    test('uses the manifest date when git is unavailable', () => {
      const { exec } = execReturning([new Error('git missing'), new Error('git missing')]);
      const readManifest = manifestOf(entry('apps/portfolio/lib/a.js', '2026-09-22T05:00:00Z'));

      expect(resolveContentLastmod({ exec, now, readManifest })).toBe('2026-09-22');
    });
  });
});
