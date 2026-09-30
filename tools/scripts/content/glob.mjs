/**
 * Minimal glob matcher for the pack definition, so the content CLI runs on plain Node before
 * `npm ci` (CI guards run right after checkout). Supports `**`, `*`, `?`, and `{a,b}`; dotfiles
 * match like picomatch's `dot: true`. Anything else is literal.
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
  let source = '';
  let braces = 0;
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      const atStart = i === 0 || glob[i - 1] === '/';
      if (atStart && glob[i + 2] === '/') {
        source += '(?:.*/)?';
        i += 2;
      } else if (atStart && i + 2 === glob.length) {
        // `dir/**` also matches `dir` itself, like picomatch.
        source = source.endsWith('/') ? `${source.slice(0, -1)}(?:/.*)?` : `${source}.*`;
        i += 1;
      } else {
        source += '[^/]*';
        i += 1;
      }
    } else if (char === '*') source += '[^/]*';
    else if (char === '?') source += '[^/]';
    else if (char === '{') {
      braces += 1;
      source += '(?:';
    } else if (char === '}' && braces > 0) {
      braces -= 1;
      source += ')';
    } else if (char === ',' && braces > 0) source += '|';
    else source += char.replace(/[.+^$()|[\]\\{}]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

/**
 * @param {string[]} globs
 * @returns {(repoPath: string) => boolean}
 */
export function compileGlobs(globs) {
  const patterns = globs.map(globToRegExp);
  return (repoPath) => patterns.some((pattern) => pattern.test(repoPath));
}
