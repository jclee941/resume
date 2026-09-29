import { pushField } from './validators.js';

export const JOBKOREA_RESUME_TITLE = '정보보안 엔지니어';

/**
 * @typedef {{
 *   platformVariants?: {
 *     jobkorea?: {
 *       headline?: string;
 *     };
 *   };
 * }} TitleSsot
 */

/**
 * @param {TitleSsot} [ssot]
 * @returns {Array<{ name: string, value: string }>}
 */
export function mapResumeTitleToFormFields(ssot = {}) {
  /** @type {Array<{ name: string, value: string }>} */
  const fields = [];
  const title = ssot?.platformVariants?.jobkorea?.headline || JOBKOREA_RESUME_TITLE;
  pushField(fields, 'UserResume.M_Resume_Title', title);
  return fields;
}
