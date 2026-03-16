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
 * Auto-calculate totalExperience from summary.experienceStart.
 * Updates sourceData.summary.totalExperience in-place with language-appropriate format.
 * @param {Object} sourceData - Parsed resume data
 * @param {string} language - Language code (ko/en/ja)
 */
function autoCalculateExperience(sourceData, language) {
  if (!sourceData.summary || !sourceData.summary.experienceStart) return;

  const [startYear, startMonth] = sourceData.summary.experienceStart.split('.').map(Number);
  const now = new Date();
  let years = now.getFullYear() - startYear;
  if (now.getMonth() + 1 < startMonth) years--;

  const formats = { ko: `${years}년`, en: `${years} years`, ja: `${years}年` };
  const newValue = formats[language] || `${years} years`;

  if (sourceData.summary.totalExperience !== newValue) {
    console.log(`  🔄 totalExperience: "${sourceData.summary.totalExperience}" → "${newValue}"`);
    sourceData.summary.totalExperience = newValue;
  }

  // Auto-update year references in profileStatement
  const profilePatterns = {
    ko: { regex: /\d+년차/g, replacement: `${years}년차` },
    en: { regex: /\d+ years/g, replacement: `${years} years` },
    ja: { regex: /\d+年目/g, replacement: `${years}年目` },
  };
  if (sourceData.summary.profileStatement && profilePatterns[language]) {
    const { regex, replacement } = profilePatterns[language];
    const updated = sourceData.summary.profileStatement.replace(regex, replacement);
    if (updated !== sourceData.summary.profileStatement) {
      console.log(`  🔄 profileStatement: year reference → ${years}`);
      sourceData.summary.profileStatement = updated;
    }
  }

  // Auto-update year references in sectionDescriptions.resume
  const sectionPatterns = {
    ko: { regex: /\d+년차/g, replacement: `${years}년차` },
    en: { regex: /\d+ years/g, replacement: `${years} years` },
    ja: { regex: /\d+年/g, replacement: `${years}年` },
  };
  if (sourceData.sectionDescriptions && sourceData.sectionDescriptions.resume && sectionPatterns[language]) {
    const { regex, replacement } = sectionPatterns[language];
    const updated = sourceData.sectionDescriptions.resume.replace(regex, replacement);
    if (updated !== sourceData.sectionDescriptions.resume) {
      console.log(`  🔄 sectionDescriptions.resume: year reference → ${years}`);
      sourceData.sectionDescriptions.resume = updated;
    }
  }
}

/**
 * Auto-translate Korean "현재" in period strings to the target language equivalent.
 * Only applies to non-Korean languages. Modifies sourceData in-place.
 * @param {Object} sourceData - Parsed resume data
 * @param {string} language - Language code (ko/en/ja)
 */
function autoTranslatePeriods(sourceData, language) {
  if (language === 'ko') return;

  const replacements = { en: 'Present', ja: '現在' };
  const target = replacements[language];
  if (!target) return;

  let count = 0;

  function replacePeriod(obj) {
    if (obj.period && typeof obj.period === 'string' && obj.period.includes('현재')) {
      obj.period = obj.period.replace('현재', target);
      count++;
    }
  }

  // Career periods and nested project periods
  if (sourceData.careers) {
    for (const career of sourceData.careers) {
      replacePeriod(career);
      if (career.projects) {
        for (const project of career.projects) {
          replacePeriod(project);
        }
      }
    }
  }

  // Personal project periods
  if (sourceData.personalProjects) {
    for (const project of sourceData.personalProjects) {
      replacePeriod(project);
    }
  }

  if (count > 0) {
    console.log(`  🔄 Translated ${count} period(s): "현재" → "${target}"`);
  }
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

    // Auto-correct derived fields before web data generation
    autoCalculateExperience(sourceData, source.language);
    autoTranslatePeriods(sourceData, source.language);

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
