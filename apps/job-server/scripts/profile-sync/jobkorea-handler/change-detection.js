import { PLATFORMS } from '../constants.js';
import { describeJobKoreaField } from './describe-field.js';

export { describeJobKoreaField };

const KEY_FIELD_PATTERNS = [
  /\.C_Name$/,
  /\.C_Part$/,
  /\.CSYM$/,
  /\.CEYM$/,
  /\.M_MainJob_Jikwi$/,
  /\.RetireSt$/,
  /\.M_MainField$/,
  /^Career\[c\d+\]\.(Co_Code|CName_Code|Biz_No|Job_Type_Code|M_MainField|M_MainJob|Job_Field_Direct|M_MainPay_User|Retire_Rsn_Code|CNameHold|OpenStat)$/,
  /\.Prfm_Prt$/,
  /^ResumeProfile\[c\d+\]\.(Header|Contents)$/,
  /^UserResume\.(M_Resume_Title|M_Career_Text|M_Career_Text_Stat)$/,
  /^InputStat\.UserIntroduceInputStat$/,
];

export function getEditUrl() {
  const profileUrl = PLATFORMS.jobkorea?.profileUrl || '';
  const match = profileUrl.match(/[?&]rNo=(\d+)/i);
  if (!match) {
    const error = /** @type {Error & { failLoud?: boolean }} */ (
      new Error(
        `Cannot extract rNo from PLATFORMS.jobkorea.profileUrl ("${profileUrl}"). ` +
          'Set profileUrl to https://www.jobkorea.co.kr/User/Resume/View?rNo=XXXXX'
      )
    );
    error.failLoud = true;
    throw error;
  }
  return `https://www.jobkorea.co.kr/User/Resume/Edit?RNo=${match[1]}`;
}

/**
 * @param {string} name
 * @param {unknown} value
 * @returns {string}
 */
function normalizeJobKoreaValue(name, value) {
  const text = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (/^Career\[[^\]]+\]\.(CSYM|CEYM)$/.test(name)) return text.replace(/\./g, '');
  if (/^Career\[[^\]]+\]\.M_MainJob_Jikwi$/.test(name)) return text.slice(0, 1);
  return text;
}

/**
 * @typedef {{ name: string; value?: unknown }} FormField
 * @typedef {{ field: string; from: string; to: string }} FieldChange
 */

/**
 * @param {FormField[] | null | undefined} currentFields
 * @param {FormField[] | null | undefined} targetFields
 * @param {(name: string) => string} describeField
 * @returns {FieldChange[]}
 */
export function computeChangesForJobKorea(currentFields, targetFields, describeField) {
  /** @type {Map<string, string>} */
  const currentByName = new Map();
  for (const field of currentFields || []) {
    if (!currentByName.has(field.name)) {
      currentByName.set(field.name, String(field.value ?? ''));
    }
  }

  /** @type {FieldChange[]} */
  const changes = [];
  for (const field of targetFields || []) {
    const isKeyField = KEY_FIELD_PATTERNS.some((pattern) => pattern.test(field.name));
    if (!isKeyField) {
      continue;
    }
    const from = currentByName.get(field.name) ?? '';
    const to = String(field.value ?? '');
    if (normalizeJobKoreaValue(field.name, from) !== normalizeJobKoreaValue(field.name, to)) {
      changes.push({
        field: describeField(field.name),
        from: from || '(empty)',
        to: to || '(empty)',
      });
    }
  }

  return changes;
}
