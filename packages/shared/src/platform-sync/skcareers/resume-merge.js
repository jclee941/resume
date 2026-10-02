/**
 * @typedef {import('./form-codec.js').FormObject} FormObject
 * @typedef {ReturnType<typeof import('./resume-mapper.js').mapToSkCareersResume>} SkCareersSections
 */

/** Repeated sections the SSoT owns outright, with the prefix of their field names. */
const LIST_SECTIONS = /** @type {const} */ ([
  ['careers', /^car[A-Z]/],
  ['certificates', /^cer[A-Z]/],
]);

/** First field of the attachment section, which follows the certificates on the page. */
const ATTACHMENT_ANCHOR = 'resumeSeq';

/**
 * Fields that identify a saved education item. They stay as saved, so the item is updated in
 * place and its grade fields, named after the random key, still belong to it.
 */
const ITEM_KEY_FIELDS = new Set(['eduhgSeq', 'eduhgRandom', 'eduSeq', 'eduUnivRandom']);

/**
 * The page has a country search box and a country select under this one name, so a browser
 * posts two values, which the site stores joined by a full-width comma. Post one value.
 */
const SINGLE_VALUE_FIELDS = ['prsResidenceNation'];

/**
 * The form to post: the saved resume with the SSoT sections laid over it. Military service and
 * education fields are replaced where they are, careers and certificates are replaced as whole
 * lists, and everything else (account fields, grades, attachments) goes back as saved.
 * `changes` counts what differs from the saved resume per section (fields for single
 * sections, items for lists) and is empty when the saved resume already matches.
 * @param {FormObject} saved form1 of the resume editor, which renders the saved resume
 * @param {SkCareersSections} sections
 * @returns {{ form: FormObject; changes: Record<string, number> }}
 */
export function mergeSkCareersResume(saved, sections) {
  /** @type {FormObject} */
  const fields = { ...sections.personal, ...sections.education };
  for (const key of ITEM_KEY_FIELDS) {
    if (key in fields && saved[key]) fields[key] = saved[key];
  }
  return {
    form: buildForm(saved, fields, sections),
    changes: countChanges(saved, fields, sections),
  };
}

/**
 * @param {FormObject} saved
 * @param {FormObject} fields
 * @param {SkCareersSections} sections
 * @returns {FormObject}
 */
function buildForm(saved, fields, sections) {
  /** @type {FormObject} */
  const form = {};
  const pending = new Map(LIST_SECTIONS.map(([section]) => [section, sections[section]]));
  /** @param {(typeof LIST_SECTIONS)[number][0]} section */
  const placeList = (section) => {
    Object.assign(form, pending.get(section));
    pending.delete(section);
  };
  const placeMissing = () => {
    for (const [key, value] of Object.entries(fields)) if (!(key in saved)) form[key] = value;
    for (const section of [...pending.keys()]) placeList(section);
  };
  for (const [key, value] of Object.entries(saved)) {
    const list = LIST_SECTIONS.find(([, pattern]) => pattern.test(key));
    if (list) {
      if (pending.has(list[0])) placeList(list[0]);
      continue;
    }
    if (key === ATTACHMENT_ANCHOR) placeMissing();
    form[key] = key in fields ? fields[key] : value;
  }
  placeMissing();
  for (const key of SINGLE_VALUE_FIELDS) {
    if (key in form) form[key] = values(form[key]).map(withoutJoinComma).find(Boolean) ?? '';
  }
  return form;
}

/**
 * @param {FormObject} saved
 * @param {FormObject} fields
 * @param {SkCareersSections} sections
 * @returns {Record<string, number>}
 */
function countChanges(saved, fields, sections) {
  /** @type {Record<string, number>} */
  const changes = {};
  for (const section of /** @type {const} */ (['personal', 'education'])) {
    const changed = Object.keys(sections[section]).filter(
      (key) => !same(saved[key], fields[key])
    ).length;
    if (changed > 0) changes[section] = changed;
  }
  for (const [section, pattern] of LIST_SECTIONS) {
    const wanted = sections[section];
    const keys = Object.keys(wanted);
    const differs =
      keys.length > 0
        ? keys.some((key) => !same(saved[key], wanted[key]))
        : Object.keys(saved).some((key) => pattern.test(key));
    if (differs) changes[section] = keys.length > 0 ? values(wanted[keys[0]]).length : 0;
  }
  const joined = SINGLE_VALUE_FIELDS.filter((key) =>
    values(saved[key]).some((value) => value.includes('\uFF0C'))
  );
  if (joined.length > 0) changes.joinedValues = joined.length;
  return changes;
}

/**
 * @param {string | string[] | undefined} a
 * @param {string | string[] | undefined} b
 * @returns {boolean}
 */
function same(a, b) {
  return JSON.stringify(values(a)) === JSON.stringify(values(b));
}

/**
 * @param {string | string[] | undefined} value
 * @returns {string[]}
 */
function values(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * @param {string} value
 * @returns {string}
 */
function withoutJoinComma(value) {
  return value.replaceAll('\uFF0C', '').trim();
}
