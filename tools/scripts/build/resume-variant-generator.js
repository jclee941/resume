/**
 * Master resume parsing and single-variant generation.
 *
 * Parses the master resume markdown into structured sections and renders
 * individual variant files using the content transformation helpers.
 */

const fs = require('fs').promises;
const path = require('path');

const {CONFIG, SECTION_NAME_MAP} = require('./resume-variant-config');
const {
  filterSections,
  emphasizeContent,
  truncateContent,
} = require('./resume-variant-content');

/**
 * Parse master resume into structured sections
 */
async function parseMasterResume() {
  try {
    const content = await fs.readFile(CONFIG.masterFile, 'utf-8');

    const sections = {};
    let currentSection = 'header';
    let currentContent = [];

    const lines = content.split('\n');

    for (const line of lines) {
      // Detect section headers (##)
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n');
        }

        // Start new section
        const rawName = line
          .substring(3)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');
        currentSection = SECTION_NAME_MAP[rawName] || rawName;
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n');
    }

    return sections;
  } catch (error) {
    console.error('❌ Error parsing master resume:', error.message);
    throw error;
  }
}

/**
 * Generate a single variant
 */
async function generateVariant(name, config, sections) {
  console.log(`\n📝 Generating variant: ${name}`);
  console.log(`   Description: ${config.description}`);

  try {
    // Filter sections
    const filtered = filterSections(sections, config);

    // Convert to string
    let content = Object.values(filtered).join('\n\n---\n\n');

    // Apply emphasis
    if (config.emphasis) {
      content = emphasizeContent(content, config.emphasis);
    }

    // Truncate if needed
    if (config.maxLength) {
      content = truncateContent(content, config.maxLength);
    }

    // Add metadata header
    const metadata = [
      '<!-- Generated from master resume -->',
      `<!-- Variant: ${name} -->`,
      `<!-- Generated: ${new Date().toISOString()} -->`,
      `<!-- Description: ${config.description} -->`,
      '',
    ].join('\n');

    content = metadata + content;

    // Write to file
    const outputPath = path.join(CONFIG.outputDir, config.filename);
    await fs.writeFile(outputPath, content, 'utf-8');

    // Get file stats
    const stats = await fs.stat(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`   ✅ Generated: ${config.filename}`);
    console.log(`   📊 Size: ${sizeKB} KB`);
    console.log(`   📍 Path: ${outputPath}`);

    return {name, filename: config.filename, size: stats.size};
  } catch (error) {
    console.error(`   ❌ Error generating ${name}:`, error.message);
    throw error;
  }
}

module.exports = {parseMasterResume, generateVariant};
