function countSsotCareers(ssot) {
  return Array.isArray(ssot?.careers) ? ssot.careers.length : 0;
}

function createCareerResetError(expected, actual, subject) {
  const error = new Error(
    `JobKorea ${subject} are incomplete; refusing to save to avoid career reset ` +
      `(expected=${expected}, actual=${actual}).`
  );
  error.failLoud = true;
  return error;
}

export function assertJobKoreaCareerSlotCoverage(ssot, sectionIndices, options = {}) {
  if (options.dryRun) return;

  const expected = countSsotCareers(ssot);
  if (expected === 0) return;

  const actual = Array.isArray(sectionIndices?.career) ? sectionIndices.career.length : 0;
  if (actual >= expected) return;

  throw createCareerResetError(expected, actual, 'Career slots');
}

export function selectJobKoreaCareerSectionIndices(ssot, sectionIndices, options = {}) {
  if (options.dryRun) return sectionIndices;

  const expected = countSsotCareers(ssot);
  if (expected === 0 || !Array.isArray(sectionIndices?.career)) {
    return sectionIndices;
  }

  return {
    ...sectionIndices,
    career: sectionIndices.career.slice(0, expected),
  };
}

export function assertJobKoreaCareerPayloadCoverage(ssot, fields, options = {}) {
  if (options.dryRun) return;

  const expected = countSsotCareers(ssot);
  if (expected === 0) return;

  const careerNames = new Set();
  for (const field of Array.isArray(fields) ? fields : []) {
    const match = field?.name?.match(/^Career\[([^\]]+)\]\.C_Name$/);
    if (match && String(field.value ?? '').trim().length > 0) {
      careerNames.add(match[1]);
    }
  }

  const actual = careerNames.size;
  if (actual >= expected) return;

  throw createCareerResetError(expected, actual, 'Career payload fields');
}
