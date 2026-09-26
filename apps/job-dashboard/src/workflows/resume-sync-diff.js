/**
 * @typedef {Record<string, unknown> & {
 *   company_name?: string;
 *   company?: string;
 *   title?: string;
 *   school_name?: string;
 *   major?: string;
 *   text?: string;
 *   name?: string;
 *   id?: string | number;
 * }} ResumeItem
 */

/**
 * @typedef {Object} DiffAddition
 * @property {string} section
 * @property {ResumeItem} item
 */

/**
 * @typedef {Object} DiffUpdate
 * @property {string} section
 * @property {ResumeItem} item
 * @property {ResumeItem} existing
 */

/**
 * @typedef {Object} DiffDeletion
 * @property {string} section
 * @property {ResumeItem} item
 */

/**
 * @typedef {Object} ResumeDiff
 * @property {DiffAddition[]} additions
 * @property {DiffUpdate[]} updates
 * @property {DiffDeletion[]} deletions
 */

const DEFAULT_COMPARE_SECTIONS = [
  'careers',
  'educations',
  'skills',
  'activities',
  'language_certs',
];

/**
 * @param {Record<string, ResumeItem[]>} master
 * @param {Record<string, ResumeItem[]>} platform
 * @param {string[]} [sections]
 * @returns {ResumeDiff}
 */
export function calculateDiff(master, platform, sections = []) {
  /** @type {ResumeDiff} */
  const diff = {
    additions: [],
    updates: [],
    deletions: [],
  };

  const sectionsToCompare = sections.length > 0 ? sections : DEFAULT_COMPARE_SECTIONS;

  for (const section of sectionsToCompare) {
    const masterItems = master[section] || [];
    const platformItems = platform[section] || [];

    for (const masterItem of masterItems) {
      const key = getItemKey(section, masterItem);
      const platformItem = platformItems.find((p) => getItemKey(section, p) === key);

      if (!platformItem) {
        diff.additions.push({ section, item: masterItem });
      } else if (!itemsEqual(masterItem, platformItem)) {
        diff.updates.push({ section, item: masterItem, existing: platformItem });
      }
    }

    for (const platformItem of platformItems) {
      const key = getItemKey(section, platformItem);
      const masterItem = masterItems.find((m) => getItemKey(section, m) === key);

      if (!masterItem) {
        diff.deletions.push({ section, item: platformItem });
      }
    }
  }

  return diff;
}

/**
 * @param {string} section
 * @param {ResumeItem} item
 * @returns {string | number | undefined}
 */
export function getItemKey(section, item) {
  switch (section) {
    case 'careers':
      return `${item.company_name || item.company}:${item.title}`;
    case 'educations':
      return `${item.school_name}:${item.major}`;
    case 'skills':
      return item.text || item.name;
    default:
      return item.id || JSON.stringify(item);
  }
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function itemsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
