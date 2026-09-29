/**
 * @typedef {{ careers?: Array<Record<string, unknown>> | null }} SsotInput
 * @typedef {Record<string, string[]>} SectionIndices
 * @typedef {{ name?: string, value?: unknown }} FormField
 * @typedef {{ dryRun?: boolean }} GuardOptions
 * @typedef {Error & { failLoud?: boolean }} CareerResetError
 */

/**
 * @param {SsotInput | null | undefined} ssot
 * @returns {number}
 */
function countSsotCareers(ssot) {
  return Array.isArray(ssot?.careers) ? ssot.careers.length : 0;
}

/**
 * @param {number} expected
 * @param {number} actual
 * @param {string} subject
 * @returns {Error & { failLoud: boolean }}
 */
function createCareerResetError(expected, actual, subject) {
  const error = /** @type {CareerResetError} */ (
    new Error(
      `JobKorea ${subject} are incomplete; refusing to save to avoid career reset ` +
        `(expected=${expected}, actual=${actual}).`
    )
  );
  error.failLoud = true;
  return /** @type {Error & { failLoud: boolean }} */ (error);
}

/**
 * @param {SsotInput | null | undefined} ssot
 * @param {SectionIndices | null | undefined} sectionIndices
 * @param {GuardOptions} [options]
 * @returns {void}
 */
export function assertJobKoreaCareerSlotCoverage(ssot, sectionIndices, options = {}) {
  if (options.dryRun) return;

  const expected = countSsotCareers(ssot);
  if (expected === 0) return;

  const actual = Array.isArray(sectionIndices?.career) ? sectionIndices.career.length : 0;
  if (actual >= expected) return;

  throw createCareerResetError(expected, actual, 'Career slots');
}

/**
 * @template {SectionIndices} T
 * @param {SsotInput | null | undefined} ssot
 * @param {T} sectionIndices
 * @param {GuardOptions} [options]
 * @returns {T}
 */
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

/**
 * @param {SsotInput | null | undefined} ssot
 * @param {FormField[] | null | undefined} fields
 * @param {GuardOptions} [options]
 * @returns {void}
 */
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
