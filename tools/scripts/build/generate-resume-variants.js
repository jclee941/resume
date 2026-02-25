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
const path = require('path');

// Configuration
const CONFIG = {
  masterFile: path.join(__dirname, '../../resumes/master/resume_master.md'),
  outputDir: path.join(__dirname, '../../resumes/generated'),
  archiveDir: path.join(__dirname, '../../resumes/archive/pre-consolidation'),

  variants: {
    general: {
      filename: 'resume_general.md',
      description: 'General purpose resume for all industries',
      sections: ['all'],
      maxLength: null,
    },
    short: {
      filename: 'resume_short.md',
      description: 'Short form resume (1-2 pages)',
      sections: ['contact', 'summary', 'experience-recent', 'skills'],
      maxLength: 2000, // Approximate words
    },
    technical: {
      filename: 'resume_technical.md',
      description: 'Technical infrastructure focus',
      sections: [
        'contact',
        'summary',
        'experience',
        'skills-technical',
        'projects',
      ],
      emphasis: ['automation', 'infrastructure', 'devops', 'monitoring'],
    },
    security: {
      filename: 'resume_security.md',
      description: 'Security and compliance focus',
      sections: [
        'contact',
        'summary',
        'experience',
        'skills-security',
        'certifications',
      ],
      emphasis: ['security', 'compliance', 'incident', 'soc', 'audit'],
    },
  },
};

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
        currentSection = line
          .substring(3)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '');
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
 * Filter sections based on variant configuration
 */
function filterSections(sections, variantConfig) {
  if (variantConfig.sections.includes('all')) {
    return sections;
  }

  const filtered = {};

  for (const [key, content] of Object.entries(sections)) {
    // Check if section matches any allowed section pattern
    const isIncluded = variantConfig.sections.some(pattern => {
      if (pattern.endsWith('-recent')) {
        return key.startsWith(pattern.replace('-recent', ''));
      }
      if (pattern.endsWith('-technical') || pattern.endsWith('-security')) {
        return key.includes(pattern.split('-')[0]);
      }
      return key.includes(pattern);
    });

    if (isIncluded) {
      filtered[key] = content;
    }
  }

  return filtered;
}

/**
 * Emphasize specific keywords in content
 */
function emphasizeContent(content, keywords) {
  if (!keywords || keywords.length === 0) {
    return content;
  }

  // Split into lines and filter/sort by keyword relevance
  const lines = content.split('\n');
  const scored = lines.map(line => {
    const score = keywords.reduce((acc, keyword) => {
      return acc + (line.toLowerCase().includes(keyword) ? 1 : 0);
    }, 0);
    return {line, score};
  });

  // Keep high-scoring lines and essential structure
  return scored
    .filter(
      item =>
        item.score > 0 || item.line.startsWith('#') || item.line.startsWith('-')
    )
    .map(item => item.line)
    .join('\n');
}

/**
 * Truncate content to maximum length
 */
function truncateContent(content, maxLength) {
  if (!maxLength) {
    return content;
  }

  const words = content.split(/\s+/);
  if (words.length <= maxLength) {
    return content;
  }

  // Truncate at maxLength words
  const truncated = words.slice(0, maxLength).join(' ');

  // Try to end at a section boundary
  const lastSection = truncated.lastIndexOf('\n## ');
  if (lastSection > maxLength * 0.8) {
    return truncated.substring(0, lastSection);
  }

  return `${truncated  }\n\n---\n\n*(Resume truncated for brevity)*`;
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

/**
 * Archive old company-specific resumes
 */
async function archiveOldResumes() {
  console.log('\n🗂️  Archiving old company-specific resumes...');

  try {
    // Ensure archive directory exists
    await fs.mkdir(CONFIG.archiveDir, {recursive: true});

    // Find old resume files
    const companiesDir = path.join(__dirname, '../../resumes/companies');

    try {
      const entries = await fs.readdir(companiesDir, {withFileTypes: true});

      let archived = 0;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Archive entire company directory
          const sourcePath = path.join(companiesDir, entry.name);
          const destPath = path.join(CONFIG.archiveDir, entry.name);

          // Skip if already archived
          try {
            await fs.access(destPath);
            console.log(`   ⏭️  Skipped (already archived): ${entry.name}`);
            continue;
          } catch {
            // Directory doesn't exist in archive, proceed with copy
          }

          // Copy directory (recursively)
          await fs.cp(sourcePath, destPath, {recursive: true});
          console.log(`   ✅ Archived: ${entry.name}/`);
          archived++;
        }
      }

      console.log(`\n   📦 Total archived: ${archived} directories`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('   ℹ️  No companies directory found (nothing to archive)');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('   ❌ Error during archiving:', error.message);
    // Don't throw - archiving is non-critical
  }
}

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
