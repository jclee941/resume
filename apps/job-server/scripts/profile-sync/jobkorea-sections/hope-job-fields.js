import {
  JK_DEFAULT_HOPE_JOB,
  JK_DEFAULT_HOPE_LOCATION,
  JK_JOB_CATEGORY,
  JK_JOB_CODES,
  JK_LOCATION_CODES,
} from './constants.js';

const compactStrings = (values) =>
  values.map((value) => String(value || '').trim()).filter(Boolean);

function getHopeRoles(ssot) {
  const hopeRoles = Array.isArray(ssot?.hope?.roles) ? compactStrings(ssot.hope.roles) : [];
  if (hopeRoles.length > 0) return hopeRoles;
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  return compactStrings(careers.map((career) => career?.role || career?.position));
}

function getHopeLocations(ssot) {
  const hopeLocations = Array.isArray(ssot?.hope?.locations)
    ? compactStrings(ssot.hope.locations)
    : [];
  return hopeLocations.length > 0 ? hopeLocations : JK_DEFAULT_HOPE_LOCATION;
}

function collectHopeJobCodes(roles) {
  const codes = new Map();
  const unmatchedRoles = [];
  for (const role of roles) {
    const matches = Object.entries(JK_JOB_CODES).filter(
      ([label]) => role.includes(label) || label.includes(role)
    );
    matches.forEach(([label, code]) => codes.set(String(code), label));
    if (matches.length === 0) unmatchedRoles.push(role);
  }
  return { codes, unmatchedRoles };
}

export function mapHopeJobToFormFields(ssot) {
  const { codes, unmatchedRoles } = collectHopeJobCodes(getHopeRoles(ssot));
  if (unmatchedRoles.length > 0) {
    console.warn(
      `[jobkorea-sections] Unmapped HopeJob roles skipped: ${unmatchedRoles.join(', ')}`
    );
  }
  if (codes.size === 0) {
    for (const [code, label] of Object.entries(JK_DEFAULT_HOPE_JOB)) codes.set(code, label);
  }
  const locationPairs = getHopeLocations(ssot)
    .map((location) => [JK_LOCATION_CODES[location], location])
    .filter(([code]) => Boolean(code));
  const normalizedLocations =
    locationPairs.length > 0
      ? locationPairs
      : JK_DEFAULT_HOPE_LOCATION.map((location) => [JK_LOCATION_CODES[location], location]);

  return [
    { name: 'HopeJob.HJ_Code', value: String(JK_JOB_CATEGORY) },
    { name: 'HopeJob.HJ_Name_Code', value: [...codes.keys()].join(',') },
    { name: 'HopeJob.HJ_Name', value: [...codes.values()].join(',') },
    { name: 'HopeJob.HJ_Local_Code', value: normalizedLocations.map(([code]) => code).join(',') },
    {
      name: 'HopeJob.HJ_Local_Name',
      value: normalizedLocations.map(([, location]) => location).join(','),
    },
    { name: 'InputStat.HopeJobInputStat', value: 'True' },
    ...(ssot?.hope?.salary ? [{ name: 'HopeJob.HJ_Salary', value: ssot.hope.salary }] : []),
    ...(ssot?.hope?.industries?.length ? [{ name: 'HopeJob.HJ_Industry', value: ssot.hope.industries.join(',') }] : []),
  ];
}
