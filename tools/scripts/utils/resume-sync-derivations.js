function parseAsOf(asOf) {
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new Error('as-of must be a strict UTC calendar date in YYYY-MM-DD format');
  }
  const [year, month, day] = asOf.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`as-of is not a valid UTC calendar date: ${asOf}`);
  }
  return parsed;
}

function autoCalculateExperience(sourceData, language, asOf) {
  const effectiveDate = parseAsOf(asOf);
  if (!sourceData.summary || !sourceData.summary.experienceStart) return;

  const [startYear, startMonth] = sourceData.summary.experienceStart.split('.').map(Number);
  let years = effectiveDate.getUTCFullYear() - startYear;
  if (effectiveDate.getUTCMonth() + 1 < startMonth) years--;

  const formats = { ko: `${years}년`, en: `${years} years`, ja: `${years}年` };
  const newValue = formats[language] || `${years} years`;
  if (sourceData.summary.totalExperience !== newValue) {
    console.log(`  🔄 totalExperience: "${sourceData.summary.totalExperience}" → "${newValue}"`);
    sourceData.summary.totalExperience = newValue;
  }

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

  const sectionPatterns = {
    ko: { regex: /\d+년차/g, replacement: `${years}년차` },
    en: { regex: /\d+ years/g, replacement: `${years} years` },
    ja: { regex: /\d+年/g, replacement: `${years}年` },
  };
  if (sourceData.sectionDescriptions?.resume && sectionPatterns[language]) {
    const { regex, replacement } = sectionPatterns[language];
    const updated = sourceData.sectionDescriptions.resume.replace(regex, replacement);
    if (updated !== sourceData.sectionDescriptions.resume) {
      console.log(`  🔄 sectionDescriptions.resume: year reference → ${years}`);
      sourceData.sectionDescriptions.resume = updated;
    }
  }
}

function autoTranslatePeriods(sourceData, language) {
  if (language === 'ko') return;
  const target = { en: 'Present', ja: '現在' }[language];
  if (!target) return;

  let count = 0;
  function replacePeriod(item) {
    if (item.period && typeof item.period === 'string' && item.period.includes('현재')) {
      item.period = item.period.replace('현재', target);
      count++;
    }
  }

  for (const career of sourceData.careers || []) {
    replacePeriod(career);
    for (const project of career.projects || []) replacePeriod(project);
  }
  for (const project of sourceData.personalProjects || []) replacePeriod(project);
  if (count > 0) console.log(`  🔄 Translated ${count} period(s): "현재" → "${target}"`);
}

module.exports = { autoCalculateExperience, autoTranslatePeriods, parseAsOf };
