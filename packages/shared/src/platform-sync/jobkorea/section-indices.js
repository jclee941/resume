/**
 * @typedef {{ name: string; value?: string | number | boolean | null }} FormField
 */

/**
 * @param {FormField[]} fields
 * @param {string} indexName
 * @returns {string | undefined}
 */
function firstEntryKey(fields, indexName) {
  const wanted = indexName.toLowerCase();
  const field = fields.find((candidate) => candidate?.name?.toLowerCase() === wanted);
  return String(field?.value ?? '')
    .split(',')
    .map((key) => key.trim())
    .find(Boolean);
}

/**
 * Entry keys of the single-entry sections already rendered on the JobKorea edit
 * form, so SSoT school fields overlay the existing entry instead of a new one.
 * @param {FormField[]} baseFields
 * @returns {{ school?: string; highSchool?: string }}
 */
export function deriveJobKoreaSectionIndices(baseFields) {
  /** @type {{ school?: string; highSchool?: string }} */
  const indices = {};
  const school = firstEntryKey(baseFields, 'UnivSchool.index');
  if (school) indices.school = school;
  const highSchool = firstEntryKey(baseFields, 'HighSchool.index');
  if (highSchool) indices.highSchool = highSchool;
  return indices;
}
