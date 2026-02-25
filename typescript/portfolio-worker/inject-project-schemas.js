#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateProjectSchemas } = require('./generate-project-schemas');

/**
 * Inject per-project CreativeWork schemas into HTML files
 */
async function injectSchemas(htmlFile) {
  try {
    const schemas = await generateProjectSchemas();
    const htmlPath = path.join(__dirname, htmlFile);
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Find the insertion point (after WebSite schema)
    const insertionPoint = '    </script>\n\n    <!-- PWA Manifest -->';
    
    // Build the schemas HTML
    let schemasHtml = '\n    <!-- JSON-LD Structured Data: Per-Project CreativeWork Schemas -->\n';
    schemas.forEach((schema, idx) => {
      schemasHtml += `    <!-- Project ${idx + 1}: ${schema.name} -->\n`;
      schemasHtml += '    <script type="application/ld+json">\n';
      schemasHtml += `    ${  JSON.stringify(schema)  }\n`;
      schemasHtml += '    </script>\n\n';
    });

    // Check if schemas already exist
    if (htmlContent.includes('Per-Project CreativeWork Schemas')) {
      console.log(`⚠️  Schemas already exist in ${htmlFile}, skipping`);
      return;
    }

    // Inject schemas
    if (htmlContent.includes(insertionPoint)) {
      htmlContent = htmlContent.replace(
        insertionPoint,
        schemasHtml + insertionPoint
      );
      fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
      console.log(`✅ Injected ${schemas.length} project schemas into ${htmlFile}`);
    } else {
      console.log(`⚠️  Could not find insertion point in ${htmlFile}`);
    }
  } catch (error) {
    console.error('❌ Error injecting schemas:', error.message);
    process.exit(1);
  }
}

// Inject into both Korean and English versions
if (require.main === module) {
  (async () => {
    console.log('📝 Injecting per-project CreativeWork schemas...\n');
    await injectSchemas('index.html');
    await injectSchemas('index-en.html');
    console.log('\n✅ All schemas injected successfully!');
  })();
}

module.exports = { injectSchemas };
