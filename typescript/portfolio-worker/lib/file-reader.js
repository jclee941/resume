/**
 * File reading and bundling utilities for worker generation
 * @module file-reader
 */

const path = require('path');
const esbuild = require('esbuild');
const { ESCAPE_PATTERNS } = require('./config');
const { readAllFiles } = require('./utils');

/**
 * Build configuration for source files loaded by the generator.
 * @param {string} baseDir - Portfolio worker directory.
 * @returns {Array<{path: string, encoding: string|null, name: string}>} File list.
 */
function getFilesToRead(baseDir) {
  return [
    {
      path: path.join(baseDir, 'index.html'),
      encoding: 'utf-8',
      name: 'indexHtmlRaw',
    },
    {
      path: path.join(baseDir, 'index-en.html'),
      encoding: 'utf-8',
      name: 'indexEnHtmlRaw',
    },
    {
      path: path.join(baseDir, 'data.json'),
      encoding: 'utf-8',
      name: 'projectDataRaw',
    },
    {
      path: path.join(baseDir, 'manifest.json'),
      encoding: 'utf-8',
      name: 'manifestJson',
    },
    {
      path: path.join(baseDir, 'sw.js'),
      encoding: 'utf-8',
      name: 'serviceWorker',
    },
    {
      path: path.join(baseDir, 'robots.txt'),
      encoding: 'utf-8',
      name: 'robotsTxt',
    },
    {
      path: path.join(baseDir, 'sitemap.xml'),
      encoding: 'utf-8',
      name: 'sitemapXml',
    },
    {
      path: path.join(baseDir, 'og-image.webp'),
      encoding: null,
      name: 'ogImageBuffer',
    },
    {
      path: path.join(baseDir, 'og-image-en.webp'),
      encoding: null,
      name: 'ogImageEnBuffer',
    },
    {
      path: path.join(baseDir, '..', 'data', 'resumes', 'master', 'resume_final.pdf'),
      encoding: null,
      name: 'resumePdfBuffer',
    },
  ];
}

/**
 * Bundle main.js using esbuild and escape for template literal embedding.
 * @param {string} baseDir - Portfolio worker directory.
 * @returns {Promise<string>} Bundled and escaped JavaScript source.
 */
async function bundleMainScript(baseDir) {
  const bundleResult = await esbuild.build({
    entryPoints: [path.join(baseDir, 'src', 'scripts', 'main.js')],
    bundle: true,
    minify: true,
    write: false,
    format: 'iife',
    target: ['es2020'],
    absWorkingDir: baseDir,
  });

  return bundleResult.outputFiles[0].text
    .replace(ESCAPE_PATTERNS.BACKSLASH, '\\\\')
    .replace(ESCAPE_PATTERNS.BACKTICK, '\\`')
    .replace(ESCAPE_PATTERNS.DOLLAR, '\\$');
}

/**
 * Bundle CSS with esbuild.
 * @param {string} baseDir - Portfolio worker directory.
 * @returns {Promise<string>} Minified CSS bundle.
 */
async function bundleCss(baseDir) {
  const cssBundleResult = await esbuild.build({
    entryPoints: [path.join(baseDir, 'src', 'styles', 'main.css')],
    bundle: true,
    minify: true,
    write: false,
  });

  return cssBundleResult.outputFiles[0].text;
}

/**
 * Read all build input files and bundle dependent assets.
 * @param {{baseDir: string, logger: {log: Function}}} options - Build options.
 * @returns {Promise<Object>} Raw source payload.
 */
async function readBuildInputs({ baseDir, logger }) {
  logger.log('📂 Reading source files...');
  const filesToRead = getFilesToRead(baseDir);
  const fileContents = readAllFiles(filesToRead);

  logger.log('📦 Bundling main.js...');
  const mainJs = await bundleMainScript(baseDir);

  logger.log('📦 Bundling CSS...');
  const cssContent = await bundleCss(baseDir);

  return {
    ...fileContents,
    mainJs,
    cssContent,
  };
}

module.exports = {
  readBuildInputs,
  bundleMainScript,
  bundleCss,
  getFilesToRead,
};
