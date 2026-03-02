const fs = require('fs');
const { generateProjectSchemas } = require('./generate-project-schemas');

/**
 * Generate HTML comments and schemas for all projects
 */
async function generateProjectSchemasHtml() {
  const schemas = await generateProjectSchemas();

  let html = '\n    <!-- JSON-LD Structured Data: Per-Project CreativeWork Schemas -->\n';

  schemas.forEach((schema, idx) => {
    html += `    <!-- Project ${idx + 1}: ${schema.name} -->\n`;
    html += '    <script type="application/ld+json">\n';
    html += `    ${JSON.stringify(schema).replace(/"/g, '\\"')}\n`;
    html += '    </script>\n\n';
  });

  return html;
}

// Modify generate-worker.js to inject project schemas
async function _patchGenerateWorker() {
  const generateWorkerPath = './generate-worker.js';
  const _content = fs.readFileSync(generateWorkerPath, 'utf-8');

  // Find the line that processes index.html and add schema injection
  // Look for where INDEX_HTML_RAW is processed
  const _schemaInjectionCode = `
  // Inject per-project CreativeWork schemas
  const projectSchemasHtml = await (() => {
    const { generateProjectSchemas } = require('./generate-project-schemas');
    return generateProjectSchemas();
  })().then(schemas => {
    let html = '\\n    <!-- JSON-LD Structured Data: Per-Project CreativeWork Schemas -->\\n';
    schemas.forEach((schema, idx) => {
      html += \`    <!-- Project \${idx + 1}: \${schema.name} -->\\n\`;
      html += '    <script type="application/ld+json">\\n';
      html += '    ' + JSON.stringify(schema) + '\\n';
      html += '    </script>\\n\\n';
    });
    return html;
  });`;

  console.log('Note: Project schemas need to be injected during build.');
  console.log('This will be handled in the template generation step.');
}

if (require.main === module) {
  (async () => {
    const schemasHtml = await generateProjectSchemasHtml();
    console.log('Project Schemas HTML:');
    console.log(schemasHtml);
  })();
}

module.exports = { generateProjectSchemasHtml };
