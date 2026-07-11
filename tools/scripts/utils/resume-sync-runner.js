const fs = require('node:fs');
const path = require('node:path');

const { validateResumeDataFile, formatErrors } = require('./validate-resume-data.js');
const { LANGUAGE_SOURCES, SCHEMA_PATH } = require('./resume-data-paths.js');
const {
  autoCalculateExperience,
  autoTranslatePeriods,
  parseAsOf,
} = require('./resume-sync-derivations.js');
const output = require('./resume-sync-output.js');
const { generateWebData } = require('./resume-web-data-generator.js');

const REQUIRED_OUTPUT_NAMES = ['data.json', 'data_en.json', 'data_ja.json'];

function loadSource(sourcePath) {
  return JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
}

function resolveSources({ sourceDir, outputDir, sourceManifest }) {
  if (!Array.isArray(sourceManifest) || sourceManifest.length !== 3) {
    throw new Error('source manifest must contain exactly three language sources');
  }
  const languages = sourceManifest.map(({ language }) => language);
  if (['ko', 'en', 'ja'].some((language) => !languages.includes(language))) {
    throw new Error('source manifest languages must be exactly: ko, en, ja');
  }
  const sources = sourceManifest.map((source) => ({
    language: source.language,
    sourcePath: sourceDir
      ? path.join(sourceDir, path.basename(source.sourcePath))
      : source.sourcePath,
    webDataPath: outputDir
      ? path.join(outputDir, path.basename(source.webDataPath))
      : source.webDataPath,
  }));
  const outputNames = sources.map(({ webDataPath }) => path.basename(webDataPath));
  if (
    new Set(outputNames).size !== REQUIRED_OUTPUT_NAMES.length ||
    REQUIRED_OUTPUT_NAMES.some((name) => !outputNames.includes(name))
  ) {
    throw new Error(`source manifest outputs must be exactly: ${REQUIRED_OUTPUT_NAMES.join(', ')}`);
  }
  return sources;
}

function validateSources(sources) {
  console.log('📋 Validating multilingual resume data against schema...');
  for (const source of sources) {
    const validation = validateResumeDataFile(source.sourcePath, SCHEMA_PATH);
    if (!validation.valid) {
      throw new Error(
        `Resume data validation failed (${source.language}):${formatErrors(validation.errors)}`
      );
    }
  }
  console.log('✅ Resume data validation passed\n');
}

function printSummary(summary) {
  console.log('\n📊 Summary:');
  for (const item of summary) {
    console.log(`   - [${item.language}] Resume entries: ${item.webData.resume.length}`);
    console.log(`   - [${item.language}] Project entries: ${item.webData.projects.length}`);
    console.log(
      `   - [${item.language}] Source: ${item.sourceData.personal.name} (${item.sourceData.summary.totalExperience})`
    );
  }
}

function runSync({
  asOf,
  sourceDir,
  outputDir,
  sourceManifest = LANGUAGE_SOURCES,
  generate = generateWebData,
} = {}) {
  parseAsOf(asOf);
  const sources = resolveSources({ sourceDir, outputDir, sourceManifest });
  validateSources(sources);
  const bindings = output.prepareOutputDirectories(sources.map(({ webDataPath }) => webDataPath));

  const summary = [];
  const written = [];
  try {
    for (const source of sources) {
      console.log(`📄 Loading source (${source.language}): ${source.sourcePath}`);
      const sourceData = loadSource(source.sourcePath);
      autoCalculateExperience(sourceData, source.language, asOf);
      autoTranslatePeriods(sourceData, source.language);

      console.log(`🔄 Generating ${source.webDataPath}...`);
      const webData = generate(sourceData, source.language);
      const binding = output.bindingForOutput(bindings, source.webDataPath);
      const outputName = path.basename(source.webDataPath);
      output.writeGeneratedSnapshot(binding, outputName, `${JSON.stringify(webData, null, 2)}\n`);
      written.push({ binding, outputName });
      console.log(`✅ ${source.webDataPath} updated`);
      summary.push({ language: source.language, sourceData, webData });
    }
    output.assertOutputDirectoriesCurrent(bindings);
  } catch (error) {
    output.cleanupWrittenSnapshots(written);
    throw error;
  } finally {
    output.closeOutputDirectories(bindings);
  }
  printSummary(summary);
}

module.exports = { autoCalculateExperience, loadSource, parseAsOf, runSync };
