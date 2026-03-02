const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Generate per-project CreativeWork JSON-LD schemas
 * Each project gets a schema.org/CreativeWork entry
 */
async function generateProjectSchemas() {
  const dataPath = path.join(__dirname, 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const schemas = [];

  // Generate CreativeWork schema for each project
  data.projects.forEach((project, index) => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      '@id': `https://resume.jclee.me/#project-${index + 1}`,
      'name': project.title,
      'description': project.description,
      'keywords': (project.related_skills || []).join(', '),
      'creator': {
        '@type': 'Person',
        'name': '이재철',
        'alternateName': 'Jaecheol Lee'
      },
      'dateCreated': new Date().toISOString().split('T')[0],
      'inLanguage': ['ko', 'en'],
      'isPartOf': {
        '@type': 'WebSite',
        'name': '이재철 포트폴리오',
        'url': 'https://resume.jclee.me'
      }
    };

    // Add business impact if available
    if (project.businessImpact) {
      schema.award = project.businessImpact;
    }

    // Add metrics/achievements
    if (project.metrics) {
      const metrics = Object.entries(project.metrics)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
      schema.about = metrics;
    }

    schemas.push(schema);
  });

  return schemas;
}

/**
 * Format schemas as JSON-LD script tags for HTML insertion
 */
function formatSchemaAsJsonLd(schema) {
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

// Export for use in HTML generation
module.exports = { generateProjectSchemas, formatSchemaAsJsonLd };

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      const schemas = await generateProjectSchemas();
      console.log(`📋 Generated ${schemas.length} CreativeWork schemas\n`);
      
      schemas.forEach((schema, idx) => {
        console.log(`Project ${idx + 1}: ${schema.name}`);
        console.log(`  ID: ${schema['@id']}`);
        console.log(`  Keywords: ${schema.keywords}`);
        console.log('');
      });

      // Also output HTML
      console.log('\n📄 HTML-ready schemas:\n');
      schemas.forEach((schema, idx) => {
        console.log(`<!-- Project ${idx + 1}: CreativeWork -->`);
        console.log(formatSchemaAsJsonLd(schema));
        console.log('');
      });
    } catch (error) {
      logger.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
