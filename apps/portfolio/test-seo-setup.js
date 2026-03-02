#!/usr/bin/env node

/**
 * SEO Setup Validation & Testing Script
 * Validates robots.txt, sitemap.xml, and hreflang configuration
 *
 * Usage: node test-seo-setup.js
 */

const fs = require('fs');
const xml2js = require('xml2js');

const DOMAIN = 'https://resume.jclee.me';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log(`\n${  '='.repeat(60)}`);
  log(COLORS.cyan, title);
  console.log('='.repeat(60));
}

async function validateRobotsTxt() {
  logSection('🤖 VALIDATING ROBOTS.TXT');

  try {
    const content = fs.readFileSync('./robots.txt', 'utf8');
    const lines = content.split('\n');

    const checks = {
      hasSitemap: false,
      hasGooglebot: false,
      hasEnPath: false,
      hasCrawlDelay: false,
      hasAIBots: false,
    };

    lines.forEach((line) => {
      if (line.includes('Sitemap:')) checks.hasSitemap = true;
      if (line.includes('User-agent: Googlebot')) checks.hasGooglebot = true;
      if (line.includes('Allow: /en/')) checks.hasEnPath = true;
      if (line.includes('Crawl-delay')) checks.hasCrawlDelay = true;
      if (line.includes('GPTBot') || line.includes('ChatGPT-User')) checks.hasAIBots = true;
    });

    log(COLORS.green, '✓ robots.txt exists');
    log(COLORS.green, `✓ File size: ${(content.length / 1024).toFixed(2)} KB`);

    Object.entries(checks).forEach(([key, value]) => {
      const icon = value ? '✓' : '✗';
      const color = value ? COLORS.green : COLORS.red;
      const messages = {
        hasSitemap: 'Sitemap reference present',
        hasGooglebot: 'Googlebot user-agent defined',
        hasEnPath: '/en/ path allowed',
        hasCrawlDelay: 'Crawl-delay configured',
        hasAIBots: 'AI bot user-agents allowed',
      };
      log(color, `${icon} ${messages[key]}`);
    });

    return Object.values(checks).every((v) => v);
  } catch (error) {
    log(COLORS.red, `✗ Error reading robots.txt: ${error.message}`);
    return false;
  }
}

async function validateSitemap() {
  logSection('🗺️  VALIDATING SITEMAP.XML');

  try {
    const content = fs.readFileSync('./sitemap.xml', 'utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);

    const urls = result.urlset.url || [];

    log(COLORS.green, '✓ sitemap.xml is valid XML');
    log(COLORS.green, `✓ Total URLs: ${urls.length}`);

    // Analyze URL distribution
    const stats = {
      homePages: 0,
      projectPages: 0,
      sections: 0,
      infrastructure: 0,
      apiEndpoints: 0,
      externalServices: 0,
      withHreflang: 0,
      withPriority: 0,
    };

    const hreflangStats = {
      koKR: 0,
      enUS: 0,
      xDefault: 0,
    };

    const priorities = {};

    urls.forEach((url) => {
      const loc = url.loc[0];
      const priority = url.priority ? parseFloat(url.priority[0]) : null;
      const hreflang = url['xhtml:link'] || [];

      if (priority) {
        stats.withPriority++;
        priorities[priority] = (priorities[priority] || 0) + 1;
      }

      if (hreflang.length > 0) {
        stats.withHreflang++;
        hreflang.forEach((link) => {
          if (link.$.hreflang === 'ko-KR') hreflangStats.koKR++;
          if (link.$.hreflang === 'en-US') hreflangStats.enUS++;
          if (link.$.hreflang === 'x-default') hreflangStats.xDefault++;
        });
      }

      if (loc.includes('#project-')) stats.projectPages++;
      else if (loc.includes('#resume')) stats.sections++;
      else if (loc.includes('#infra')) stats.infrastructure++;
      else if (loc.includes('/health') || loc.includes('/metrics')) stats.apiEndpoints++;
      else if (loc === DOMAIN || loc === `${DOMAIN}/en/`) stats.homePages++;
      else if (loc.includes('grafana') || loc.includes('gitlab') || loc.includes('n8n'))
        stats.externalServices++;
      else stats.sections++;
    });

    log(COLORS.green, '\n📊 URL Distribution:');
    log(COLORS.blue, `  • Home pages: ${stats.homePages}`);
    log(COLORS.blue, `  • Project pages: ${stats.projectPages}`);
    log(COLORS.blue, `  • Sections: ${stats.sections}`);
    log(COLORS.blue, `  • Infrastructure: ${stats.infrastructure}`);
    log(COLORS.blue, `  • API endpoints: ${stats.apiEndpoints}`);
    log(COLORS.blue, `  • External services: ${stats.externalServices}`);

    log(COLORS.green, '\n🌐 hreflang Coverage:');
    log(
      COLORS.blue,
      `  • URLs with hreflang: ${stats.withHreflang}/${urls.length} (${((stats.withHreflang / urls.length) * 100).toFixed(1)}%)`
    );
    log(COLORS.blue, `  • ko-KR links: ${hreflangStats.koKR}`);
    log(COLORS.blue, `  • en-US links: ${hreflangStats.enUS}`);
    log(COLORS.blue, `  • x-default links: ${hreflangStats.xDefault}`);

    log(COLORS.green, '\n⚖️  Priority Distribution:');
    Object.entries(priorities)
      .sort(([a], [b]) => b - a)
      .forEach(([priority, count]) => {
        log(COLORS.blue, `  • Priority ${priority}: ${count} URLs`);
      });

    // Validate structure
    const validations = {
      hasHomePages: stats.homePages >= 2, // Ko + En
      hasProjectPages: stats.projectPages === 5,
      hasInfrastructure: stats.infrastructure >= 4,
      hasHreflangs: stats.withHreflang > 0,
      consistentPriorities: Object.keys(priorities).length > 0,
    };

    log(COLORS.green, '\n✅ Structure Validation:');
    Object.entries(validations).forEach(([key, value]) => {
      const icon = value ? '✓' : '✗';
      const color = value ? COLORS.green : COLORS.red;
      const messages = {
        hasHomePages: 'Both language home pages present',
        hasProjectPages: 'All 5 projects included',
        hasInfrastructure: 'Infrastructure services included',
        hasHreflangs: 'hreflang annotations present',
        consistentPriorities: 'Priority values assigned',
      };
      log(color, `${icon} ${messages[key]}`);
    });

    return Object.values(validations).every((v) => v);
  } catch (error) {
    log(COLORS.red, `✗ Error parsing sitemap.xml: ${error.message}`);
    return false;
  }
}

async function validateLanguageVariants() {
  logSection('🌍 VALIDATING LANGUAGE VARIANTS');

  try {
    const content = fs.readFileSync('./sitemap.xml', 'utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);

    const urls = result.urlset.url || [];
    const issues = [];

    // Check that every URL with anchor has both language versions
    const anchorUrls = urls.filter((u) => u.loc[0].includes('#'));

    log(COLORS.green, `Checking ${anchorUrls.length} anchored URLs for language consistency...`);

    const anchorSet = new Set();
    anchorUrls.forEach((url) => {
      const loc = url.loc[0];
      const anchor = loc.split('#')[1];
      const hreflang = url['xhtml:link'] || [];

      const hasKoKR = hreflang.some((link) => link.$.hreflang === 'ko-KR');
      const hasEnUS = hreflang.some((link) => link.$.hreflang === 'en-US');

      if (!hasKoKR || !hasEnUS) {
        issues.push(`Anchor #${anchor} missing language variant`);
      }
      anchorSet.add(anchor);
    });

    if (issues.length === 0) {
      log(COLORS.green, `✓ All ${anchorUrls.length} anchored URLs have proper hreflang`);
    } else {
      issues.forEach((issue) => log(COLORS.red, `✗ ${issue}`));
    }

    // Verify home page has both variants
    const homePages = urls.filter((u) => u.loc[0] === DOMAIN || u.loc[0] === `${DOMAIN}/en/`);
    log(COLORS.green, `\n✓ Home page variants: ${homePages.length}/2 found`);

    return issues.length === 0;
  } catch (error) {
    log(COLORS.red, `✗ Error validating language variants: ${error.message}`);
    return false;
  }
}

async function generateReport() {
  logSection('📋 SEO IMPLEMENTATION REPORT');

  const robotsValid = await validateRobotsTxt();
  const sitemapValid = await validateSitemap();
  const langValid = await validateLanguageVariants();

  logSection('📊 SUMMARY');

  const results = {
    'robots.txt': robotsValid,
    'sitemap.xml': sitemapValid,
    'Language Variants': langValid,
  };

  Object.entries(results).forEach(([name, valid]) => {
    const icon = valid ? '✓' : '✗';
    const color = valid ? COLORS.green : COLORS.red;
    log(color, `${icon} ${name}: ${valid ? 'VALID' : 'ISSUES FOUND'}`);
  });

  const allValid = Object.values(results).every((v) => v);

  logSection(allValid ? '✅ ALL CHECKS PASSED' : '⚠️  SOME CHECKS FAILED');

  if (allValid) {
    log(COLORS.green, 'Your SEO setup is properly configured!');
    log(COLORS.blue, '\nNext steps:');
    log(COLORS.blue, '  1. Submit sitemap.xml to Google Search Console');
    log(COLORS.blue, '  2. Monitor robots.txt crawl stats in GSC');
    log(COLORS.blue, '  3. Verify hreflang implementation in GSC');
    log(COLORS.blue, '  4. Monitor mobile usability issues');
  } else {
    log(COLORS.yellow, 'Please fix the issues above before deployment.');
  }

  console.log();
  return allValid;
}

// Main execution
async function main() {
  try {
    const success = await generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(COLORS.red, `\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
