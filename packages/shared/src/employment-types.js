/** @param {string|null|undefined} workType */
export function mapWorkTypeToWantedEmploymentType(workType) {
  const normalized = String(workType || '').trim();
  if (/프리랜서|freelance/i.test(normalized)) return 'FREELANCE';
  if (/계약|contract/i.test(normalized)) return 'CONTRACT';
  if (/인턴|intern/i.test(normalized)) return 'INTERN';
  if (/파트|part.?time/i.test(normalized)) return 'PARTTIME';
  return 'FULLTIME';
}
