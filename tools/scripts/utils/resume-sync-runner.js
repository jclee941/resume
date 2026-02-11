const fs = require('fs');
const { validateResumeDataFile, formatErrors } = require('./validate-resume-data.js');
const { SOURCE_PATH, SCHEMA_PATH, WEB_DATA_PATH } = require('./resume-data-paths.js');
const { generateWebData } = require('./resume-web-data-generator.js');

/**
 * Load master resume source file.
 * @returns {Object} Parsed source data.
 */
function loadSource() {
  const raw = fs.readFileSync(SOURCE_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Execute sync-resume-data workflow.
 */
function runSync() {
  console.log('📋 Validating resume data against schema...');
  const validation = validateResumeDataFile(SOURCE_PATH, SCHEMA_PATH);

  if (!validation.valid) {
    console.error('❌ Resume data validation FAILED:');
    console.error(formatErrors(validation.errors));
    console.error('\n⚠️  Fix the errors above and try again.');
    process.exit(1);
  }
  console.log('✅ Resume data validation passed\n');

  console.log('📄 Loading source: resumes/master/resume_data.json');
  const source = loadSource();

  console.log('🔄 Generating web/data.json...');
  const webData = generateWebData(source);
  fs.writeFileSync(WEB_DATA_PATH, JSON.stringify(webData, null, 2) + '\n');
  console.log('✅ web/data.json updated');

  console.log('\n📊 Summary:');
  console.log(`   - Resume entries: ${webData.resume.length}`);
  console.log(`   - Project entries: ${webData.projects.length}`);
  console.log(`   - Source: ${source.personal.name} (${source.summary.totalExperience})`);
}

module.exports = {
  runSync,
  loadSource,
};
