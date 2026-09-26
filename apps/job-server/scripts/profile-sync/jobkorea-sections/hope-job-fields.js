import { JK_DEFAULT_HOPE_LOCATION, JK_JOB_CATEGORY, JK_LOCATION_CODES } from './constants.js';

/**
 * @typedef {{
 *   hope?: {
 *     roles?: string[];
 *     locations?: string[];
 *     jobCodes?: (string | number)[];
 *     salary?: string;
 *     industries?: string[];
 *   };
 *   careers?: Array<{ role?: string; position?: string }>;
 * }} SsotProfile
 */

/**
 * @param {unknown[]} values
 * @returns {string[]}
 */
const compactStrings = (values) =>
  values.map((value) => String(value || '').trim()).filter(Boolean);

/**
 * @param {SsotProfile | null | undefined} ssot
 * @returns {string[]}
 */
function getHopeRoles(ssot) {
  const hopeRoles = Array.isArray(ssot?.hope?.roles) ? compactStrings(ssot.hope.roles) : [];
  if (hopeRoles.length > 0) return hopeRoles;
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  return compactStrings(careers.map((career) => career?.role || career?.position));
}

/**
 * @param {SsotProfile | null | undefined} ssot
 * @returns {string[]}
 */
function getHopeLocations(ssot) {
  const hopeLocations = Array.isArray(ssot?.hope?.locations)
    ? compactStrings(ssot.hope.locations)
    : [];
  return hopeLocations.length > 0 ? hopeLocations : JK_DEFAULT_HOPE_LOCATION;
}

/**
 * @param {SsotProfile | null | undefined} ssot
 * @returns {Array<{ name: string, value: string }>}
 */
export function mapHopeJobToFormFields(ssot) {
  const roles = getHopeRoles(ssot);
  const jobCodes = Array.isArray(ssot?.hope?.jobCodes) ? ssot.hope.jobCodes : [];
  const labels = Array.isArray(ssot?.hope?.roles) ? ssot.hope.roles : roles;

  /** @type {Map<string, string>} */
  const codes = new Map();
  jobCodes.forEach((/** @type {string | number} */ code, /** @type {number} */ idx) => {
    codes.set(String(code), labels[idx] || '');
  });

  if (codes.size === 0 && roles.length > 0) {
    console.warn(`[jobkorea-sections] Unmapped HopeJob roles skipped: ${roles.join(', ')}`);
  }

  const locationPairs = getHopeLocations(ssot)
    .map(
      /**
       * @param {string} location
       * @returns {[string | undefined, string]}
       */
      (location) => [/** @type {Record<string, string>} */ (JK_LOCATION_CODES)[location], location]
    )
    .filter(
      /**
       * @param {[string | undefined, string]} pair
       * @returns {pair is [string, string]}
       */
      ([code]) => Boolean(code)
    );

  const normalizedLocations =
    locationPairs.length > 0
      ? locationPairs
      : JK_DEFAULT_HOPE_LOCATION.map(
          /**
           * @param {string} location
           * @returns {[string, string]}
           */
          (location) => [
            /** @type {Record<string, string>} */ (JK_LOCATION_CODES)[location],
            location,
          ]
        );

  return [
    { name: 'HopeJob.HJ_Code', value: String(JK_JOB_CATEGORY) },
    { name: 'HopeJob.HJ_Name_Code', value: [...codes.keys()].join(',') },
    { name: 'HopeJob.HJ_Name', value: [...codes.values()].join(',') },
    {
      name: 'HopeJob.HJ_Local_Code',
      value: normalizedLocations.map(([code]) => code).join(','),
    },
    {
      name: 'HopeJob.HJ_Local_Name',
      value: normalizedLocations.map(([, location]) => location).join(','),
    },
    { name: 'InputStat.HopeJobInputStat', value: 'True' },
    ...(ssot?.hope?.salary ? [{ name: 'HopeJob.HJ_Salary', value: ssot.hope.salary }] : []),
    ...(ssot?.hope?.industries?.length
      ? [{ name: 'HopeJob.HJ_Industry', value: ssot.hope.industries.join(',') }]
      : []),
  ];
}
