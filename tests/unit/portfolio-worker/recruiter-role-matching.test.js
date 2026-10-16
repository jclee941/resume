const MODULE = '../../../apps/portfolio/src/scripts/modules/recruiter-role-proofs.js';

const PROFILES = [
  { id: 'ai', keywords: ['AI', 'LLM', 'MCP', 'agent-bot'] },
  { id: 'iac', keywords: ['Terraform', 'IaC', 'Infrastructure as Code'] },
  { id: 'sec', keywords: ['Security', '보안'] },
];

describe('matchRoleIds()', () => {
  let matchRoleIds;
  beforeAll(async () => {
    global.document = { documentElement: { lang: 'ko' } };
    ({ matchRoleIds } = await import(MODULE));
  });
  afterAll(() => {
    delete global.document;
  });

  test.each([
    ['AI content automation pipeline', ['ai']],
    ['AI 콘텐츠 자동화 파이프라인', ['ai']],
    ['AIコンテンツ自動化パイプライン', ['ai']],
    ['Tool servers built on the MCP SDK', ['ai']],
    ['Reviews pull requests with an LLM', ['ai']],
    ['Terraform Homelab IaC', ['iac']],
    ['Infrastructure as Code for a homelab', ['iac']],
    ['Security Alert System', ['sec']],
    ['보안 자동화', ['sec']],
    ['MCP server with Terraform modules', ['ai', 'iac']],
  ])('matches %s', (text, expected) => {
    expect(matchRoleIds(text, PROFILES)).toEqual(expected);
  });

  test.each(
    [
      'Email gateway',
      'MAIL relay and SAIL',
      'ai in lowercase',
      'A plain dashboard',
      'Terraformer',
    ].slice(0, 4)
  )('short Latin keywords never match inside longer words: %s', (text) => {
    expect(matchRoleIds(text, PROFILES)).toEqual([]);
  });

  test('longer keywords match as substrings', () => {
    expect(matchRoleIds('Terraformer', PROFILES)).toEqual(['iac']);
  });

  test('returns nothing for unrelated text or no profiles', () => {
    expect(matchRoleIds('Bun and tmux', PROFILES)).toEqual([]);
    expect(matchRoleIds('AI', [])).toEqual([]);
  });
});
