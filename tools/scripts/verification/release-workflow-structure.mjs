export function workflowSteps(definition) {
  return Object.values(definition.jobs ?? {}).flatMap((job) => job.steps ?? []);
}

export function shellCommands(step) {
  if (typeof step.run !== 'string') return [];
  const commands = [];
  let command = '';
  for (const rawLine of step.run.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    command += `${command === '' ? '' : ' '}${line}`;
    if (command.endsWith('\\')) {
      command = command.slice(0, -1).trimEnd();
      continue;
    }
    commands.push(command);
    command = '';
  }
  if (command !== '') commands.push(command);
  return commands;
}

export function publishBoundarySteps(definition) {
  return workflowSteps(definition).filter((step) =>
    shellCommands(step).some((command) =>
      /^go -C tools\/scripts run \.\/release\/publish(?:\s|$)/u.test(command)
    )
  );
}

function commandWords(command) {
  return command
    .split(/\s+/u)
    .map((word) => word.replace(/^["']|["']$/gu, ''))
    .filter(Boolean);
}

function apiMethod(words) {
  for (let index = 2; index < words.length; index += 1) {
    if (words[index] === '--method' || words[index] === '-X') return words[index + 1] ?? '';
    if (words[index].startsWith('--method=')) return words[index].slice('--method='.length);
    if (words[index].startsWith('-X') && words[index].length > 2) return words[index].slice(2);
  }
  return words.some(
    (word) =>
      word === '-f' ||
      word === '-F' ||
      word === '--field' ||
      word === '--raw-field' ||
      (word.startsWith('-f') && word.length > 2) ||
      (word.startsWith('-F') && word.length > 2) ||
      word.startsWith('--field=') ||
      word.startsWith('--raw-field=')
  )
    ? 'POST'
    : 'GET';
}

export function isDirectReleaseMutation(command) {
  const words = commandWords(command);
  const ghIndex = words.indexOf('gh');
  const ghWords = ghIndex === -1 ? [] : words.slice(ghIndex);
  if (ghWords[1] === 'release') {
    return new Set(['create', 'edit', 'delete', 'upload']).has(ghWords[2]);
  }
  const gitIndex = words.indexOf('git');
  const gitWords = gitIndex === -1 ? [] : words.slice(gitIndex);
  if (gitWords[1] === 'push') {
    return gitWords.some((word) => word === '--tags' || word.includes('refs/tags/'));
  }
  if (ghWords[1] !== 'api') return false;
  if (!new Set(['POST', 'PATCH', 'DELETE']).has(apiMethod(ghWords).toUpperCase())) return false;
  const releaseEndpoint = ghWords.some((word) => /(?:^|\/)releases(?:\/|$)/u.test(word));
  const refsEndpoint = ghWords.some((word) => /(?:^|\/)git\/refs(?:\/|$)/u.test(word));
  const tagArgument = ghWords.some((word) => word.includes('refs/tags/'));
  return releaseEndpoint || (refsEndpoint && tagArgument);
}

export function directMutationCommands(definition) {
  return workflowSteps(definition).flatMap(shellCommands).filter(isDirectReleaseMutation);
}

export function hasDirectReleaseWriter(definition) {
  return (
    directMutationCommands(definition).length > 0 ||
    workflowSteps(definition).some(
      (step) => typeof step.uses === 'string' && step.uses.includes('action-gh-release')
    )
  );
}

export function hasDecisionArtifact(definition) {
  return workflowSteps(definition).some(
    (step) =>
      typeof step.uses === 'string' &&
      step.uses.startsWith('actions/upload-artifact@') &&
      step.with?.path === 'release-decision.json' &&
      step.with?.['if-no-files-found'] === 'error'
  );
}
