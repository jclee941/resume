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

    assert.doesNotMatch(generatedText, /\d\s?%/);
    assert.doesNotMatch(generatedText, /\b\d{1,3}(?:,\d{3})+\b/);
  });
});

describe('generateWebData → projects[] live demo dashboards', () => {
  it('propagates every SSoT project dashboard link verbatim', () => {
    const out = generateWebData(ssot, 'ko');
    const withDashboards = ssot.personalProjects.filter(
      (source) => Array.isArray(source.dashboards) && source.dashboards.length > 0
    );

    assert.ok(withDashboards.length > 0, 'SSoT must define at least one project with dashboards');
    for (const source of withDashboards) {
      const project = out.projects.find((item) => item.id === source.id);
      assert.ok(project, `${source.id} must be projected`);
      assert.deepEqual(project.dashboards, source.dashboards);
    }
  });
});

describe('generateWebData → projects[] activity period', () => {
  it('preserves the SSoT period used by project activity metadata', () => {
    const out = generateWebData(ssot, 'ko');

    assert.ok(out.projects.length > 0, 'projects must be projected');
    for (const project of out.projects) {
      const source = ssot.personalProjects.find((item) => item.id === project.id);
      assert.ok(source, `${project.id} must come from the SSoT`);
      assert.equal(project.period, source.period, `${project.id} period`);
    }
  });
});

describe('generateWebData → public repository showcase', () => {
  it('projects only SSoT projects, in order, and never invents a repository link', () => {
    const out = generateWebData(ssot, 'ko');
    const sourceById = new Map(ssot.personalProjects.map((source) => [source.id, source]));
    const projectIds = out.projects.map((project) => project.id);

    assert.ok(projectIds.length > 0, 'projects must be projected');
    assert.deepEqual(
      projectIds,
      ssot.personalProjects.map((source) => source.id).filter((id) => projectIds.includes(id)),
      'projected projects must be SSoT projects in SSoT order'
    );
    for (const project of out.projects) {
      const source = sourceById.get(project.id);
      assert.ok(
        project.repoUrl == null || project.repoUrl === source.githubUrl,
        `${project.id} repoUrl must be empty or the SSoT githubUrl`
      );
      if (project.githubUrl == null) {
        assert.ok(project.repoUrl == null, `${project.id} without githubUrl must stay unlinked`);
      }
    }
  });

  it('keeps SSoT projects that the generator drops out of public projects', () => {
    const out = generateWebData(ssot, 'ko');
    const projectedIds = new Set(out.projects.map((project) => project.id));
    const dropped = ssot.personalProjects.filter((source) => !projectedIds.has(source.id));
    const searchableProjectRefs = out.projects.flatMap((project) => [
      project.id,
      project.githubUrl,
      project.repoUrl,
      project.liveUrl,
    ]);

    for (const source of dropped) {
      assert.ok(
        !searchableProjectRefs.includes(source.id) &&
          !(source.githubUrl && searchableProjectRefs.includes(source.githubUrl)),
        `${source.id} must stay excluded from public projects`
      );
    }
  });

  it('excludes dropped infrastructure cards from public portfolio data', () => {
    const out = generateWebData(ssot, 'ko');
    const infrastructureIds = new Set(out.infrastructure.map((item) => item.id));
    const sourceIds = new Set(ssot.infrastructure.map((item) => item.id));

    assert.ok(out.infrastructure.length > 0, 'infrastructure must be projected');
    for (const id of infrastructureIds) {
      assert.ok(sourceIds.has(id), `${id} must come from the SSoT`);
    }
    for (const source of ssot.infrastructure.filter((item) => !infrastructureIds.has(item.id))) {
      const refs = out.infrastructure.flatMap((item) => [item.id, item.title, item.url]);
      assert.ok(
        !refs.includes(source.id) && !refs.includes(source.title),
        `${source.id} must stay excluded from public infrastructure cards`
      );
    }
  });
});
