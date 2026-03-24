#!/usr/bin/env node
/**
 * Demo Video Recording Script
 * Records a demo video of the resume website using Playwright
 *
 * Usage:
 *   node scripts/utils/record-demo-video.js [output-path]
 *
 * Example:
 *   node scripts/utils/record-demo-video.js demo/resume-demo.webm
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const DEFAULT_OUTPUT = 'demo/resume-demo.webm';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://resume.jclee.me';

async function recordDemo() {
  const outputPath = process.argv[2] || DEFAULT_OUTPUT;
  const outputDir = path.dirname(outputPath);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎬 Starting demo video recording...');
  console.log(`📹 Output: ${outputPath}`);
  console.log(`🌐 URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({
    headless: false, // Show browser for visual confirmation
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  try {
    // Scene 1: Homepage Load (5 seconds)
    console.log('📍 Scene 1: Loading homepage...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Scene 2: Scroll to Projects (3 seconds)
    console.log('📍 Scene 2: Scrolling to projects...');
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    // Scene 3: Hover over project cards (4 seconds)
    console.log('📍 Scene 3: Hovering over project cards...');
    const projectCards = await page.locator('.project-card').all();
    for (let i = 0; i < Math.min(3, projectCards.length); i++) {
      await projectCards[i].hover();
      await page.waitForTimeout(1000);
    }

    // Scene 4: Scroll to Resume section (3 seconds)
    console.log('📍 Scene 4: Scrolling to resume section...');
    await page.locator('#resume').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    // Scene 5: Hover over resume cards (4 seconds)
    console.log('📍 Scene 5: Hovering over resume cards...');
    const resumeCards = await page.locator('.doc-card').all();
    for (let i = 0; i < Math.min(3, resumeCards.length); i++) {
      await resumeCards[i].hover();
      await page.waitForTimeout(1000);
    }

    // Scene 6: Test dark mode toggle (3 seconds)
    console.log('📍 Scene 6: Testing dark mode...');
    await page.locator('#theme-toggle').click();
    await page.waitForTimeout(1500);
    await page.locator('#theme-toggle').click();
    await page.waitForTimeout(1500);

    // Scene 7: Scroll to footer (2 seconds)
    console.log('📍 Scene 7: Scrolling to footer...');
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    // Scene 8: Scroll back to top (2 seconds)
    console.log('📍 Scene 8: Scrolling to top...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    console.log('\n✅ Recording complete!');
    console.log('⏱️  Total duration: ~28 seconds');
  } catch (error) {
    console.error('❌ Error during recording:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();

    // Move video to final location
    const videoFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith('.webm'));
    if (videoFiles.length > 0) {
      const tempVideo = path.join(outputDir, videoFiles[0]);
      fs.renameSync(tempVideo, outputPath);
      console.log(`\n📹 Video saved to: ${outputPath}`);

      const stats = fs.statSync(outputPath);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }
}

// Mobile version
async function recordMobileDemo() {
  const outputPath = process.argv[2] || 'demo/resume-demo-mobile.webm';
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📱 Starting mobile demo video recording...');
  console.log(`📹 Output: ${outputPath}`);
  console.log(`🌐 URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    recordVideo: {
      dir: outputDir,
      size: { width: 375, height: 667 },
    },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  const page = await context.newPage();

  try {
    console.log('📍 Scene 1: Loading homepage...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    console.log('📍 Scene 2: Scrolling through content...');
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1500);

    console.log('📍 Scene 3: Testing dark mode...');
    await page.locator('#theme-toggle').click();
    await page.waitForTimeout(1500);
    await page.locator('#theme-toggle').click();
    await page.waitForTimeout(1500);

    console.log('📍 Scene 4: Scrolling to top...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    console.log('\n✅ Mobile recording complete!');
  } catch (error) {
    console.error('❌ Error during recording:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();

    const videoFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith('.webm'));
    if (videoFiles.length > 0) {
      const tempVideo = path.join(outputDir, videoFiles[0]);
      fs.renameSync(tempVideo, outputPath);
      console.log(`\n📹 Video saved to: ${outputPath}`);

      const stats = fs.statSync(outputPath);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }
}

// Main execution
const mode = process.argv[3] || 'desktop';

if (mode === 'mobile') {
  recordMobileDemo().catch(console.error);
} else {
  recordDemo().catch(console.error);
}
