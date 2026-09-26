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

  test('uses the last commit that touched rendered content', () => {
    const { exec, calls } = execReturning(['2026-09-20\n']);

    expect(resolveContentLastmod({ exec, now })).toBe('2026-09-20');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(`git log -1 --format=%cs -- ${CONTENT_PATHS.join(' ')}`);
  });

  test('falls back to the HEAD commit date when the content history is absent', () => {
    const { exec, calls } = execReturning(['\n', '2026-09-25\n']);

    expect(resolveContentLastmod({ exec, now })).toBe('2026-09-25');
    expect(calls[1]).toBe('git log -1 --format=%cs');
  });

  test('falls back to the build day when git is unavailable', () => {
    const { exec } = execReturning([new Error('git missing'), new Error('git missing')]);

    expect(resolveContentLastmod({ exec, now })).toBe('2030-05-06');
  });
});
