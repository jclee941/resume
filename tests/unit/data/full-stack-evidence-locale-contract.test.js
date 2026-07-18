const fs = require('node:fs');
const path = require('node:path');

const masterDir = path.join(__dirname, '../../../packages/data/resumes/master');
const localeFiles = ['resume_data.json', 'resume_data_en.json', 'resume_data_ja.json'];
const locales = localeFiles.map((fileName) =>
  JSON.parse(fs.readFileSync(path.join(masterDir, fileName), 'utf8'))
);
const expectedProjectOrder = [
  'safetywallet-cf-workers-pwa',
  'resume-portfolio',
  'ip-blacklist-platform',
  'security-alert-system',
  'observability-platform',
  'terraform-homelab-iac',
  'firewall-policy-automation',
  'jclee-bot-github-app',
  'content-automation-pipeline',
  'bug-bounty-recon-toolkit',
  'hycu-fsds-autonomous-driving',
  'tmux-productivity-suite',
];
const expectedEvidenceKeys = {
  'safetywallet-cf-workers-pwa': [
    'userSurface',
    'backendApi',
    'dataAsync',
    'securityReliability',
    'deliveryOperations',
    'architectureSteps',
  ],
  'resume-portfolio': [
    'userSurface',
    'backendApi',
    'dataAsync',
    'securityReliability',
    'deliveryOperations',
    'architectureSteps',
  ],
  'ip-blacklist-platform': ['backendApi', 'dataAsync', 'securityReliability', 'architectureSteps'],
};
const forbiddenSelectors = {
  platformVariants: (resume) => resume.platformVariants,
  desiredRoles: (resume) => resume.current.desiredRoles,
  hopeRoles: (resume) => resume.hope.roles,
  careers: (resume) => resume.careers,
  projects: (resume) => resume.projects,
  careerSummary: (resume) => resume.careerSummary,
  careerGap: (resume) => resume.careerGap,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function forbiddenSnapshot(resume) {
  return Object.fromEntries(
    Object.entries(forbiddenSelectors).map(([key, select]) => [key, clone(select(resume))])
  );
}

function projectById(resume, id) {
  return resume.personalProjects.find((project) => project.id === id);
}

function assertCanonicalLocaleContract(candidates, forbiddenBaselines) {
  const referenceIds = candidates[0].personalProjects.map(({ id }) => id);
  for (const [localeIndex, resume] of candidates.entries()) {
    expect(resume.personalProjects.map(({ id }) => id)).toEqual(referenceIds);
    const sorted = [...resume.personalProjects].sort(
      (left, right) => left.displayOrder - right.displayOrder
    );
    expect(sorted.map(({ id }) => id)).toEqual(expectedProjectOrder);
    expect(sorted.map(({ displayOrder }) => displayOrder)).toEqual(
      expectedProjectOrder.map((_, index) => index + 1)
    );
    expect(
      resume.personalProjects
        .filter(({ featured }) => featured)
        .map(({ id }) => id)
        .sort()
    ).toEqual(expectedProjectOrder.slice(0, 3).sort());

    for (const [id, expectedKeys] of Object.entries(expectedEvidenceKeys)) {
      const evidence = projectById(resume, id).fullStackEvidence;
      expect(Object.keys(evidence)).toEqual(expectedKeys);
      expect(evidence.architectureSteps).toHaveLength(5);
      for (const value of Object.values(evidence)) {
        if (Array.isArray(value)) {
          expect(value.every((step) => typeof step === 'string' && step.length > 0)).toBe(true);
        } else {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        }
      }
    }
    const blacklistEvidence = projectById(resume, 'ip-blacklist-platform').fullStackEvidence;
    expect(blacklistEvidence).not.toHaveProperty('userSurface');
    expect(blacklistEvidence).not.toHaveProperty('deliveryOperations');
    expect(forbiddenSnapshot(resume)).toEqual(forbiddenBaselines[localeIndex]);
  }
}

describe('canonical locale project contract', () => {
  const forbiddenBaselines = locales.map(forbiddenSnapshot);

  test('keeps featured order, evidence keys, locale parity, and forbidden fields exact', () => {
    assertCanonicalLocaleContract(locales, forbiddenBaselines);
  });

  test.each([
    [
      'duplicate order 1',
      (fixtures) => (projectById(fixtures[1], 'resume-portfolio').displayOrder = 1),
    ],
    [
      'locale evidence key drift',
      (fixtures) =>
        delete projectById(fixtures[1], 'safetywallet-cf-workers-pwa').fullStackEvidence.backendApi,
    ],
    [
      'fallback text in an omitted layer',
      (fixtures) =>
        (projectById(fixtures[2], 'ip-blacklist-platform').fullStackEvidence.userSurface =
          'unsupported fallback'),
    ],
    ['mutated forbidden field', (fixtures) => fixtures[0].current.desiredRoles.push('mutated')],
  ])('rejects %s', (_label, mutate) => {
    const fixtures = clone(locales);
    mutate(fixtures);
    expect(() => assertCanonicalLocaleContract(fixtures, forbiddenBaselines)).toThrow();
  });
});
