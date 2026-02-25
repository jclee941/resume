#!/usr/bin/env node
/**
 * Screenshot Generation Script
 * Generates demo screenshots for documentation and marketing
 *
 * Usage:
 *   node scripts/build/generate-screenshots.js [output-dir]
 *
 * Example:
 *   node scripts/build/generate-screenshots.js demo/screenshots
 */

const {chromium} = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const DEFAULT_OUTPUT_DIR = 'demo/screenshots';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://resume.jclee.me';

// Screenshot configurations
const SCREENSHOTS = [
  // Desktop screenshots
  {
    name: 'desktop-homepage-light',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'light',
    fullPage: true,
    description: 'Desktop homepage (light mode)',
  },
  {
    name: 'desktop-homepage-dark',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'dark',
    fullPage: true,
    description: 'Desktop homepage (dark mode)',
  },
  {
    name: 'desktop-hero-section',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'light',
    selector: '.hero',
    description: 'Hero section with download buttons',
  },
  {
    name: 'desktop-projects-section',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'light',
    selector: '#projects',
    description: 'Projects showcase section',
  },
  {
    name: 'desktop-resume-section',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'light',
    selector: '#resume',
    description: 'Resume cards section',
  },

  // Mobile screenshots
  {
    name: 'mobile-homepage-light',
    viewport: {width: 375, height: 667},
    colorScheme: 'light',
    fullPage: true,
    description: 'Mobile homepage (iPhone SE)',
  },
  {
    name: 'mobile-homepage-dark',
    viewport: {width: 375, height: 667},
    colorScheme: 'dark',
    fullPage: true,
    description: 'Mobile homepage dark mode',
  },
  {
    name: 'mobile-project-card',
    viewport: {width: 375, height: 667},
    colorScheme: 'light',
    selector: '.project-card',
    description: 'Mobile project card',
  },

  // Tablet screenshots
  {
    name: 'tablet-homepage',
    viewport: {width: 768, height: 1024},
    colorScheme: 'light',
    fullPage: true,
    description: 'Tablet homepage (iPad)',
  },

  // Component screenshots
  {
    name: 'component-download-buttons',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'light',
    selector: '.hero-download',
    description: 'Download buttons component',
  },
  {
    name: 'component-project-card',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'light',
    selector: '.project-card',
    description: 'Project card component',
  },
  {
    name: 'component-footer',
    viewport: {width: 1920, height: 1080},
    colorScheme: 'light',
    selector: 'footer',
    description: 'Footer component',
  },
];

async function generateScreenshots() {
  const outputDir = process.argv[2] || DEFAULT_OUTPUT_DIR;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }

  console.log('📸 Starting screenshot generation...');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`🌐 URL: ${BASE_URL}`);
  console.log(`📊 Total screenshots: ${SCREENSHOTS.length}\n`);

  const browser = await chromium.launch({
    headless: true,
  });

  let successCount = 0;
  let failCount = 0;

  for (const config of SCREENSHOTS) {
    try {
      console.log(`📸 Capturing: ${config.name}...`);

      const context = await browser.newContext({
        viewport: config.viewport,
        colorScheme: /** @type {'light' | 'dark'} */ (
          config.colorScheme || 'light'
        ),
      });

      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait for animations

      const outputPath = path.join(outputDir, `${config.name}.png`);

      if (config.selector) {
        // Screenshot specific element
        const element = page.locator(config.selector).first();
        await element.scrollIntoViewIfNeeded();
        await element.screenshot({path: outputPath});
      } else if (config.fullPage) {
        // Full page screenshot
        await page.screenshot({path: outputPath, fullPage: true});
      } else {
        // Viewport screenshot
        await page.screenshot({path: outputPath});
      }

      const stats = fs.statSync(outputPath);
      console.log(
        `   ✅ Saved: ${config.name}.png (${(stats.size / 1024).toFixed(1)} KB)`
      );
      console.log(`   📝 ${config.description}\n`);

      await context.close();
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${config.name}`);
      console.error(`   Error: ${error.message}\n`);
      failCount++;
    }
  }

  await browser.close();

  // Generate index file
  generateIndexFile(outputDir);

  // Summary
  console.log(`\n${  '='.repeat(60)}`);
  console.log('📊 Screenshot Generation Summary');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Output: ${outputDir}`);

  // Calculate total size
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
  let totalSize = 0;
  files.forEach(file => {
    const stats = fs.statSync(path.join(outputDir, file));
    totalSize += stats.size;
  });
  console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`${'='.repeat(60)  }\n`);
}

/**
 * Generate index markdown file
 * @param {string} outputDir - Output directory path
 */
function generateIndexFile(outputDir) {
  const indexPath = path.join(outputDir, 'INDEX.md');

  let content = '# Demo Screenshots\n\n';
  content += `**Generated**: ${new Date().toISOString().split('T')[0]}\n`;
  content += `**Total**: ${SCREENSHOTS.length} screenshots\n\n`;
  content += '---\n\n';

  // Group by category
  const categories = {
    Desktop: SCREENSHOTS.filter(s => s.name.startsWith('desktop-')),
    Mobile: SCREENSHOTS.filter(s => s.name.startsWith('mobile-')),
    Tablet: SCREENSHOTS.filter(s => s.name.startsWith('tablet-')),
    Components: SCREENSHOTS.filter(s => s.name.startsWith('component-')),
  };

  for (const [category, screenshots] of Object.entries(categories)) {
    if (screenshots.length === 0) continue;

    content += `## ${category}\n\n`;

    for (const config of screenshots) {
      const filename = `${config.name}.png`;
      content += `### ${config.description}\n\n`;
      content += `![${config.description}](${filename})\n\n`;
      content += `**File**: \`${filename}\`\n`;
      content += `**Viewport**: ${config.viewport.width}x${config.viewport.height}\n`;
      content += `**Mode**: ${config.colorScheme || 'light'}\n\n`;
      content += '---\n\n';
    }
  }

  content += '## Usage\n\n';
  content += '### In Documentation\n\n';
  content += '```markdown\n';
  content += '![Homepage](demo/screenshots/desktop-homepage-light.png)\n';
  content += '```\n\n';
  content += '### In README\n\n';
  content += '```markdown\n';
  content += '## Screenshots\n\n';
  content += '| Desktop | Mobile |\n';
  content += '|---------|--------|\n';
  content +=
    '| ![Desktop](demo/screenshots/desktop-homepage-light.png) | ![Mobile](demo/screenshots/mobile-homepage-light.png) |\n';
  content += '```\n\n';
  content += '### In Presentations\n\n';
  content +=
    'Use high-resolution PNG files directly in PowerPoint, Keynote, or Google Slides.\n\n';

  fs.writeFileSync(indexPath, content);
  console.log(`📄 Generated index: ${indexPath}`);
}

// Main execution
generateScreenshots().catch(console.error);
