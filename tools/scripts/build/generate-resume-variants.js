#!/usr/bin/env node

/**
 * Resume Variants Generator
 *
 * Generates company-specific and format-specific resume variants
 * from the master resume template.
 *
 * Usage:
 *   node scripts/build/generate-resume-variants.js [variant]
 *
 * Variants:
 *   - all: Generate all variants (default)
 *   - general: General purpose resume
 *   - short: Short form (1-page)
 *   - technical: Technical focus
 *   - security: Security focus
 *
 * @requires fs/promises
 */

const fs = require('fs').promises;

const {CONFIG} = require('./resume-variant-config');
const {parseMasterResume, generateVariant} = require('./resume-variant-generator');
const {archiveOldResumes} = require('./resume-variant-archive');

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Resume Variants Generator\n');

  const args = process.argv.slice(2);
  const requestedVariant = args[0] || 'all';

  try {
    // Ensure output directory exists
    await fs.mkdir(CONFIG.outputDir, {recursive: true});
    console.log(`✅ Output directory ready: ${CONFIG.outputDir}`);

    // Archive old resumes
    await archiveOldResumes();

    // Parse master resume
    console.log('\n📖 Parsing master resume...');
    const sections = await parseMasterResume();
    console.log(`   ✅ Parsed ${Object.keys(sections).length} sections`);

    // Generate variants
    const results = [];

    if (requestedVariant === 'all') {
      for (const [name, config] of Object.entries(CONFIG.variants)) {
        const result = await generateVariant(name, config, sections);
        results.push(result);
      }
    } else if (CONFIG.variants[requestedVariant]) {
      const result = await generateVariant(
        requestedVariant,
        CONFIG.variants[requestedVariant],
        sections
      );
      results.push(result);
    } else {
      console.error(`\n❌ Unknown variant: ${requestedVariant}`);
      console.log('\nAvailable variants:');
      for (const [name, config] of Object.entries(CONFIG.variants)) {
        console.log(`  - ${name}: ${config.description}`);
      }
      process.exit(1);
    }

    // Summary
    console.log(`\n${  '='.repeat(60)}`);
    console.log('✅ Generation complete!');
    console.log('='.repeat(60));
    console.log(`\n📊 Generated ${results.length} variant(s):\n`);

    for (const result of results) {
      const sizeKB = (result.size / 1024).toFixed(2);
      console.log(`   • ${result.name}: ${result.filename} (${sizeKB} KB)`);
    }

    console.log(`\n📁 Output directory: ${CONFIG.outputDir}`);
    console.log(`📁 Archive directory: ${CONFIG.archiveDir}`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {parseMasterResume, generateVariant, CONFIG};
