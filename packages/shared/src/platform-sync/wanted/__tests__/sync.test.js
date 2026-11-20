import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ResumeEndpoint } from '../../../clients/wanted/endpoints/resume.js';
import { mapToWantedFormat } from '../format-mapper.js';
import { syncWantedResume } from '../sync.js';

const resumeId = 'test-resume';
const linksPath = `/resumes/v2/${resumeId}/links`;
const blog = 'https://example.com/blog';
const portfolio = { id: 7, order: 3, title: 'Portfolio', url: 'https://example.com/work' };

function setup(links, createdLink = { id: 8 }) {
  const calls = [];
  const resume = new ResumeEndpoint({
    async chaosRequest(path, options) {
      if (!options) return { data: { links } };
      calls.push([path, options]);
      return { data: { link: createdLink } };
    },
  });
  return {
    calls,
    sync(contact) {
      const source = { contact };
      return syncWantedResume(
        {
          resume,
          getResumeDetail: (id) => resume.getDetail(id),
          updateProfile: async () => {},
          resumeEducation: { add: async () => {} },
        },
        mapToWantedFormat(source),
        resumeId,
        source
      );
    },
  };
}

describe('Wanted blog link sync', () => {
  it('appends the blog to the existing links through the editor API', async () => {
    const { sync, calls } = setup([portfolio]);

    const result = await sync({ blog });

    assert.deepEqual(result.errors, []);
    assert.ok(result.updated.includes('links'));
    assert.deepEqual(calls, [
      [linksPath, { method: 'POST', body: { order: 4 } }],
      [`${linksPath}/8`, { method: 'PATCH', body: { title: 'Blog' } }],
      [`${linksPath}/8`, { method: 'PATCH', body: { url: blog } }],
    ]);
  });

  it('reports a failed link sync without patching when creation returns no link ID', async () => {
    const { sync, calls } = setup([], {});

    const result = await sync({ blog });

    assert.deepEqual(
      result.errors.map(({ section }) => section),
      ['links']
    );
    assert.deepEqual(calls, [[linksPath, { method: 'POST', body: { order: 0 } }]]);
  });

  for (const { condition, contact, links } of [
    {
      condition: 'the URL is already present',
      contact: { blog },
      links: [{ ...portfolio, url: blog }],
    },
    { condition: 'contact.blog is absent', contact: undefined, links: [portfolio] },
  ]) {
    it(`leaves links unchanged when ${condition}`, async () => {
      const { sync, calls } = setup(links);

      const result = await sync(contact);

      assert.deepEqual(result.errors, []);
      assert.deepEqual(calls, []);
    });
  }
});
