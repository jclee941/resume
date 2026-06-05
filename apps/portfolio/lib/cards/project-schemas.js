/**
 * Generate per-project schema.org/CreativeWork JSON-LD for a given locale's
 * projects array. Emitted as `<script type="application/ld+json">` blocks that
 * the build later stamps with a CSP nonce (same path as the other inline
 * JSON-LD schemas). This surfaces each project to search engines as structured
 * data without changing the visible layout.
 *
 * @param {Array<Object>} projects - locale-specific projects (data.projects)
 * @returns {string} concatenated <script type="application/ld+json"> blocks, or ''
 */
function buildProjectSchema(project, index) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `https://resume.jclee.me/#project-${index + 1}`,
    name: project.title || project.name || '',
    description: project.description || '',
    keywords: Array.isArray(project.related_skills) && project.related_skills.length
      ? project.related_skills.join(', ')
      : project.tech || '',
    creator: {
      '@type': 'Person',
      name: '이재철',
      alternateName: 'Jaecheol Lee',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Jaecheol Lee Resume',
      url: 'https://resume.jclee.me',
    },
  };

  const url = project.githubUrl || project.repoUrl || project.demoUrl || project.liveUrl;
  if (url) schema.url = url;

  return schema;
}

function generateProjectSchemasHtml(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return '';

  return projects
    .map((project, index) => {
      const json = JSON.stringify(buildProjectSchema(project, index))
        // Prevent the JSON payload from prematurely closing the <script> tag.
        .replace(/<\/(script)/gi, '<\\/$1')
        .replace(/<!--/g, '<\\!--');
      return `<script type="application/ld+json">${json}</script>`;
    })
    .join('\n    ');
}

module.exports = { generateProjectSchemasHtml };
