const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { generateWebData } = require('../resume-web-data-generator.js');

const SSOT_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'data',
  'resumes',
  'master',
  'resume_data.json'
);
const ssot = require(SSOT_PATH);

describe('generateWebData → content policy', () => {
  it('does not emit concrete count metrics in generated project copy', () => {
    const out = generateWebData(ssot, 'en');
    const generatedText = JSON.stringify(out.projectsEn);

    assert.doesNotMatch(generatedText, /\b\d[\d,]*\s+CSV\b/);
    assert.doesNotMatch(generatedText, /\b\d[\d,]*\s+FortiGate\s+LogID/);
  });
});

describe('generateWebData → projects[] live demo dashboards', () => {
  it('propagates Observability Platform Grafana and ELK dashboard links from SSoT', () => {
    const out = generateWebData(ssot, 'ko');
    const project = out.projects.find((item) => item.id === 'observability-platform');

    assert.ok(project, 'Observability Platform must be projected');
    assert.deepEqual(project.dashboards, [
      {
        name: 'Grafana',
        url: 'https://grafana.jclee.me/public-dashboards/d179bed28cb64b87877464527550396e',
      },
      {
        name: 'ELK',
        url: 'https://kibana.jclee.me/s/portfolio-demo/app/dashboards?auth_provider_hint=portfolio_demo#/view/portfolio-demo-dashboard',
      },
    ]);
  });
});

describe('generateWebData → public jclee941 repository showcase', () => {
  it('includes selected public repos and excludes user-rejected repos', () => {
    const out = generateWebData(ssot, 'ko');
    const projectIds = out.projects.map((project) => project.id);
    const repoUrls = out.projects.map((project) => project.repoUrl);

    assert.ok(projectIds.includes('jclee-bot-github-app'), 'jclee-bot must be showcased');
    assert.ok(
      projectIds.includes('firewall-policy-automation'),
      'firewall automation must be showcased'
    );
    assert.ok(projectIds.includes('tmux-productivity-suite'), 'tmux suite must be showcased');
    assert.ok(
      !repoUrls.includes('https://github.com/jclee941/jclee-bot'),
      'unavailable jclee-bot repository must stay unlinked'
    );
    assert.ok(repoUrls.includes('https://github.com/jclee941/firewall'));
    assert.ok(repoUrls.includes('https://github.com/jclee941/tmux'));

    const searchableProjectRefs = out.projects.flatMap((project) => [
      project.id,
      project.githubUrl,
      project.repoUrl,
      project.liveUrl,
    ]);

    for (const rejected of [
      'mcp-server-hub',
      'idle-outpost',
      'account',
      'meetup-coordinator-mcp',
      'nunchi-translator-mcp',
    ]) {
      assert.ok(
        !searchableProjectRefs.some((value) => String(value || '').includes(rejected)),
        `${rejected} must stay excluded from public projects`
      );
    }
  });

  it('excludes rejected infrastructure cards from public portfolio data', () => {
    const out = generateWebData(ssot, 'ko');
    const infrastructureRefs = out.infrastructure.flatMap((item) => [
      item.id,
      item.title,
      item.description,
      item.url,
    ]);

    for (const rejected of ['mcp-server-hub', 'MCP Server Hub', 'idle-outpost', 'account']) {
      assert.ok(
        !infrastructureRefs.some((value) => String(value || '').includes(rejected)),
        `${rejected} must stay excluded from public infrastructure cards`
      );
    }
  });
});
