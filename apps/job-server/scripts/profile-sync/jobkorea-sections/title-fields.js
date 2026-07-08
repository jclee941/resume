import { pushField } from './validators.js';

export const JOBKOREA_RESUME_TITLE = '정보보안 엔지니어';

export function mapResumeTitleToFormFields(ssot = {}) {
  const fields = [];
  const title = ssot?.platformVariants?.jobkorea?.headline || JOBKOREA_RESUME_TITLE;
  pushField(fields, 'UserResume.M_Resume_Title', title);
  return fields;
}
