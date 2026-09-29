/**
 * @typedef {{ name: string; value?: string | number | boolean | null }} FormField
 * @typedef {import('./sections/base.js').JobKoreaSectionIndices} JobKoreaSectionIndices
 */

/** Rows JobKorea already stores are keyed `c<id>`; any other key is a row the editor has not saved. */
const STORED_ROW_KEY = /^c\d+$/;
/** New-row keys offered after the stored ones; the mappers take only as many as they need. */
const NEW_ROW_KEY_COUNT = 30;

/**
 * @param {FormField[]} fields
 * @param {string} indexName
 * @returns {string[]}
 */
function entryKeys(fields, indexName) {
  const wanted = indexName.toLowerCase();
  return fields
    .filter((candidate) => candidate?.name?.toLowerCase() === wanted)
    .flatMap((field) => String(field.value ?? '').split(','))
    .map((key) => key.trim())
    .filter(Boolean);
}

/**
 * Entry keys for the SSoT overlay, read from the live JobKorea edit form: the first
 * school entry, and for the sections a save replaces wholesale (careers, licenses,
 * awards) the stored `c<id>` rows in form order followed by `<n>_<timestamp>` keys, the
 * format the editor gives rows it adds. The mappers' `c1`, `c2`… fallback names no
 * stored row: JobKorea reported such a save as successful without storing those rows.
 * @param {FormField[]} baseFields
 * @param {number} [now]
 * @returns {JobKoreaSectionIndices}
 */
export function deriveJobKoreaSectionIndices(baseFields, now = Date.now()) {
  const newKeys = Array.from({ length: NEW_ROW_KEY_COUNT }, (_, i) => `${i + 1}_${now + i}`);
  /** @param {string} section */
  const rowKeys = (section) => [
    ...entryKeys(baseFields, `${section}.index`).filter((key) => STORED_ROW_KEY.test(key)),
    ...newKeys,
  ];
  /** @type {JobKoreaSectionIndices} */
  const indices = {
    career: rowKeys('Career'),
    license: rowKeys('License'),
    award: rowKeys('Award'),
  };
  const [school] = entryKeys(baseFields, 'UnivSchool.index');
  if (school) indices.school = school;
  const [highSchool] = entryKeys(baseFields, 'HighSchool.index');
  if (highSchool) indices.highSchool = highSchool;
  return indices;
}
