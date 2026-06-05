const { generateProjectSchemasHtml } = require('../../../apps/portfolio/lib/cards/project-schemas');

describe('project CreativeWork JSON-LD schemas', () => {
  const projects = [
    { title: 'Alpha', description: 'First project.', related_skills: ['Go', 'Docker'] },
    { title: 'Beta', description: 'Second project.', tech: 'TypeScript, Hono' },
  ];

  test('emits one ld+json script per project with CreativeWork type', () => {
    const html = generateProjectSchemasHtml(projects);
    const blocks = html.match(/<script type="application\/ld\+json">/g) || [];
    expect(blocks.length).toBe(2);
    expect(html).toContain('"@type":"CreativeWork"');
    expect(html).toContain('"name":"Alpha"');
    expect(html).toContain('"name":"Beta"');
  });

  test('escapes </script> in content to avoid breaking out of the script tag', () => {
    const html = generateProjectSchemasHtml([
      { title: 'X', description: 'evil </script> payload', related_skills: [] },
    ]);
    expect(html).not.toContain('</script> payload');
    expect(html).toContain('<\\/script>');
  });

  test('returns empty string for empty/invalid input', () => {
    expect(generateProjectSchemasHtml([])).toBe('');
    expect(generateProjectSchemasHtml(null)).toBe('');
    expect(generateProjectSchemasHtml(undefined)).toBe('');
  });

  test('derives keywords from related_skills or falls back to tech', () => {
    const html = generateProjectSchemasHtml(projects);
    expect(html).toContain('Go, Docker');
    expect(html).toContain('TypeScript, Hono');
  });
});
