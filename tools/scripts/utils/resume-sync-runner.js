const fs = require('fs');
const { validateResumeDataFile, formatErrors } = require('./validate-resume-data.js');
const { LANGUAGE_SOURCES, SCHEMA_PATH } = require('./resume-data-paths.js');
const { generateWebData } = require('./resume-web-data-generator.js');

/**
 * Load resume source file.
 * @param {string} sourcePath - Source JSON path
 * @returns {Object} Parsed source data.
 */
function loadSource(sourcePath) {
  const raw = fs.readFileSync(sourcePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Execute sync-resume-data workflow.
 */
function runSync() {
  console.log('📋 Validating multilingual resume data against schema...');

  for (const source of LANGUAGE_SOURCES) {
    const validation = validateResumeDataFile(source.sourcePath, SCHEMA_PATH);
    if (!validation.valid) {
      console.error(`❌ Resume data validation FAILED (${source.language}):`);
      console.error(formatErrors(validation.errors));
      console.error('\n⚠️  Fix the errors above and try again.');
      process.exit(1);
    }
  }

  console.log('✅ Resume data validation passed\n');

  const summary = [];

  for (const source of LANGUAGE_SOURCES) {
    console.log(`📄 Loading source (${source.language}): ${source.sourcePath}`);
    const sourceData = loadSource(source.sourcePath);

    console.log(`🔄 Generating ${source.webDataPath}...`);
    const webData = generateWebData(sourceData);
    fs.writeFileSync(source.webDataPath, `${JSON.stringify(webData, null, 2)  }\n`);
    console.log(`✅ ${source.webDataPath} updated`);

    summary.push({ language: source.language, sourceData, webData });
  }

  console.log('\n📊 Summary:');
  for (const item of summary) {
    console.log(`   - [${item.language}] Resume entries: ${item.webData.resume.length}`);
    console.log(`   - [${item.language}] Project entries: ${item.webData.projects.length}`);
    console.log(
      `   - [${item.language}] Source: ${item.sourceData.personal.name} (${item.sourceData.summary.totalExperience})`
    );
  }
}

module.exports = {
  runSync,
  loadSource,
};
