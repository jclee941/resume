const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const MODULES = path.join(ROOT, 'apps', 'portfolio', 'src', 'scripts', 'modules');

const EXPECTED_MAPPINGS = {
  'product-ui': ['safetywallet-cf-workers-pwa', 'resume-portfolio'],
  'backend-api': ['safetywallet-cf-workers-pwa', 'ip-blacklist-platform', 'jclee-bot-github-app'],
  'data-workflows': [
    'safetywallet-cf-workers-pwa',
    'ip-blacklist-platform',
    'content-automation-pipeline',
  ],
  'delivery-operations': ['resume-portfolio', 'terraform-homelab-iac', 'observability-platform'],
  'security-reliability': [
    'safetywallet-cf-workers-pwa',
    'security-alert-system',
    'firewall-policy-automation',
  ],
};

const EXPECTED_LABELS = {
  ko: ['제품 UI', '백엔드·API', '데이터·워크플로', '배포·운영', '보안·신뢰성'],
  en: [
    'Product UI',
    'Backend & API',
    'Data & Workflows',
    'Delivery & Operations',
    'Security & Reliability',
  ],
  ja: [
    'プロダクトUI',
    'バックエンド・API',
    'データ・ワークフロー',
    'デリバリー・運用',
    'セキュリティ・信頼性',
  ],
};

let capabilityData;

beforeAll(async () => {
  capabilityData =
    await import('../../../apps/portfolio/src/scripts/modules/capability-evidence-data.js');
});

describe('full-stack capability evidence contract', () => {
  test('uses exactly five stable keys, mappings, and locale labels', () => {
    expect(
      Object.fromEntries(
        capabilityData.CAPABILITY_DEFINITIONS.map(({ id, projectIds }) => [id, projectIds])
      )
    ).toEqual(EXPECTED_MAPPINGS);

    for (const [locale, expected] of Object.entries(EXPECTED_LABELS)) {
      expect(capabilityData.getCapabilities(locale).map(({ label }) => label)).toEqual(expected);
    }
  });

  test('rejects an unknown mapped project id', () => {
    const invalid = capabilityData.CAPABILITY_DEFINITIONS.map((capability) => ({
      ...capability,
      projectIds: [...capability.projectIds],
    }));
    invalid[0].projectIds.push('unknown-project');

    expect(() =>
      capabilityData.validateCapabilityContract({
        definitions: invalid,
        labels: capabilityData.CAPABILITY_LABELS,
        locale: 'ko',
        availableProjectIds: Object.values(EXPECTED_MAPPINGS).flat(),
      })
    ).toThrow(/unknown-project/);
  });

  test('rejects a missing locale label', () => {
    const labels = structuredClone(capabilityData.CAPABILITY_LABELS);
    delete labels.ja['product-ui'];

    expect(() =>
      capabilityData.validateCapabilityContract({
        definitions: capabilityData.CAPABILITY_DEFINITIONS,
        labels,
        locale: 'ja',
        availableProjectIds: Object.values(EXPECTED_MAPPINGS).flat(),
      })
    ).toThrow(/product-ui/);
  });

  test('rejects an empty aria-live project-name list', () => {
    expect(() =>
      capabilityData.buildCapabilityAnnouncement({
        locale: 'en',
        label: 'Product UI',
        projectNames: [],
      })
    ).toThrow(/project names/i);
  });

  test('removes obsolete recruiter and generic keyword-routing modules', () => {
    const obsoleteFiles = [
      'recruiter-enhancements-data.js',
      'recruiter-enhancements.js',
      'recruiter-mobile-actions.js',
      'recruiter-rendering.js',
      'recruiter-role-interactions.js',
      'recruiter-role-proofs.js',
    ];
    for (const filename of obsoleteFiles) {
      expect(fs.existsSync(path.join(MODULES, filename))).toBe(false);
    }

    const capabilitySource = fs
      .readdirSync(MODULES)
      .filter((filename) => filename.startsWith('capability-'))
      .map((filename) => fs.readFileSync(path.join(MODULES, filename), 'utf8'))
      .join('\n');
    expect(capabilitySource).not.toMatch(/ROLE_PROFILES|\.keywords\b|role-chip|recruiter/i);
  });
});
