/**
 * Fixture files with no real counterpart to fake: they are written from the fake pack itself.
 * @param {(repoPath: string) => Promise<string>} readFake read a generated fixture as text
 * @returns {Promise<Array<[string, string]>>} repo path and content pairs
 */
export async function synthesizeFixtures(readFake) {
  const master = JSON.parse(await readFake('packages/data/resumes/master/resume_data.json'));
  const refs = (master.personalProjects ?? [])
    .slice(0, 3)
    .map((project) => `- personalProjects[name="${project.name}"].description`);
  return [
    [
      'packages/data/resumes/wishket/fixture-traceability.md',
      [
        '# Fixture traceability',
        '',
        'Every reference below resolves against the fake master resume.',
        '',
        ...refs,
        '',
      ].join('\n'),
    ],
  ];
}
