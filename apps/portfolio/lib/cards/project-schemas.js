/**
 * @typedef {Object} ProjectSchemaData
 * @property {string} [title]
 * @property {string} [name]
 * @property {string} [description]
 * @property {string[]} [related_skills]
 * @property {string} [tech]
 * @property {string} [githubUrl]
 * @property {string} [repoUrl]
 * @property {string} [demoUrl]
 * @property {string} [liveUrl]
 */

/**
 * @typedef {{
 *   '@context': string,
 *   '@type': string,
 *   '@id': string,
 *   name: string,
 *   description: string,
 *   keywords: string,
 *   creator: { '@type': string, name: string, alternateName: string },
 *   isPartOf: { '@type': string, name: string, url: string },
 *   url?: string
 * }} ProjectJsonLd
 */

/**
 * @param {ProjectSchemaData} project
 * @param {number} index
 * @returns {ProjectJsonLd}
 */
function buildProjectSchema(project, index) {
  /** @type {ProjectJsonLd} */
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `https://resume.jclee.me/#project-${index + 1}`,
    name: project.title || project.name || '',
    description: project.description || '',
    keywords:
      Array.isArray(project.related_skills) && project.related_skills.length
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

/**
 * Generate per-project schema.org/CreativeWork JSON-LD for a given locale's
 * projects array. Emitted as `<script type="application/ld+json">` blocks that
 * the build later stamps with a CSP nonce (same path as the other inline
 * JSON-LD schemas). This surfaces each project to search engines as structured
 * data without changing the visible layout.
 *
 * @param {Array<ProjectSchemaData>} projects - locale-specific projects (data.projects)
 * @returns {string} concatenated <script type="application/ld+json"> blocks, or ''
 */
function generateProjectSchemasHtml(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return '';

  return projects
    .map((project, index) => {
      const json = JSON.stringify(buildProjectSchema(project, index))
        // Escape every '<' as a JSON unicode escape so the payload can never
        // prematurely close the <script> tag or start an HTML comment. \u003c
        // is valid JSON (unlike a literal backslash-bang) and parses back to '<'.
        .replace(/</g, '\\u003c');
      return `<script type="application/ld+json">${json}</script>`;
    })
    .join('\n    ');
}

module.exports = { generateProjectSchemasHtml };
