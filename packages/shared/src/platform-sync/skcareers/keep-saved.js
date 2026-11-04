/**
 * @typedef {import('./form-codec.js').FormObject} FormObject
 */

/** Education fields the SSoT never provides; a blank there means "no opinion", not a deletion. */
export const KEEP_EDUCATION_FIELDS = ['eduEducationRegion', 'eduDaytimeYN'];

/**
 * Per list section: the pattern of its field names, the fields that identify an item across
 * saves, and the fields the SSoT never provides (kept as saved while the SSoT item is blank).
 */
export const LIST_RULES = /** @type {const} */ ({
  careers: {
    pattern: /^car[A-Z]/,
    identity: ['carCorpName', 'carFromDate'],
    keepWhenBlank: ['carDeptName', 'carPosition', 'carSalary', 'carRetireDesc'],
  },
  certificates: {
    pattern: /^cer[A-Z]/,
    identity: ['cerCertName', 'cerCertDate'],
    keepWhenBlank: ['cerCertNumber', 'cerCertFilePath', 'cerCertFileText', 'cerCertFileName'],
  },
});

/**
 * @param {string | string[] | undefined} value
 * @returns {string[]}
 */
function values(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * @param {FormObject} form
 * @param {RegExp} pattern
 * @returns {Array<Record<string, string>>}
 */
function rowsOf(form, pattern) {
  const keys = Object.keys(form).filter((key) => pattern.test(key));
  const count = Math.max(0, ...keys.map((key) => values(form[key]).length));
  return Array.from({ length: count }, (_, i) =>
    Object.fromEntries(keys.map((key) => [key, values(form[key])[i] ?? '']))
  );
}

/**
 * @param {Record<string, string>} row
 * @param {readonly string[]} fields
 * @returns {string}
 */
const identityOf = (row, fields) => fields.map((field) => (row[field] ?? '').trim()).join('\u0000');

/**
 * Lay the SSoT items of one list section over the saved ones. An SSoT item takes over the saved
 * item with the same identity (each saved item at most once, so duplicate names pair in order),
 * or else the only unclaimed saved item of that name on both sides. A matched item keeps the
 * saved fields the SSoT does not provide; every mapped field takes the SSoT value, blank or not,
 * so removals propagate. Saved items nothing matches are dropped.
 * @param {FormObject} saved
 * @param {keyof typeof LIST_RULES} section
 * @param {FormObject} wanted mapped columns of the section
 * @returns {FormObject}
 */
export function mergeListSection(saved, section, wanted) {
  const { pattern, identity, keepWhenBlank } = LIST_RULES[section];
  const wantedRows = rowsOf(wanted, pattern);
  if (wantedRows.length === 0) return {};
  const savedRows = rowsOf(saved, pattern);
  const claimed = new Set();
  const nameOf = (/** @type {Record<string, string>} */ row) => (row[identity[0]] ?? '').trim();
  const match = wantedRows.map((row) => {
    const key = identityOf(row, identity);
    const found = savedRows.findIndex((s, i) => !claimed.has(i) && identityOf(s, identity) === key);
    if (found >= 0) claimed.add(found);
    return found;
  });
  match.forEach((found, w) => {
    if (found >= 0) return;
    const free = savedRows.filter((s, i) => !claimed.has(i) && nameOf(s) === nameOf(wantedRows[w]));
    const sameName = wantedRows.filter(
      (r, i) => match[i] < 0 && nameOf(r) === nameOf(wantedRows[w])
    );
    if (free.length === 1 && sameName.length === 1) {
      match[w] = savedRows.indexOf(free[0]);
      claimed.add(match[w]);
    }
  });
  const keys = [
    ...Object.keys(wanted),
    ...Object.keys(saved).filter((key) => pattern.test(key) && !(key in wanted)),
  ];
  const merged = wantedRows.map((row, w) => {
    const old = match[w] >= 0 ? savedRows[match[w]] : {};
    return Object.fromEntries(
      keys.map((key) => {
        const mapped = row[key];
        const keep =
          mapped === undefined || (mapped === '' && keepWhenBlank.some((field) => field === key));
        return [key, keep ? (old[key] ?? '') : mapped];
      })
    );
  });
  return Object.fromEntries(
    keys.map((key) => {
      const column = merged.map((row) => row[key]);
      return [key, column.length === 1 ? column[0] : column];
    })
  );
}
