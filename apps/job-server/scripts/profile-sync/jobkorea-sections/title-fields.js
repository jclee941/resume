import { pushField } from './validators.js';

export const JOBKOREA_RESUME_TITLE = '이재철 - 보안·SRE 엔지니어';

export function mapResumeTitleToFormFields() {
  const fields = [];
  pushField(fields, 'UserResume.M_Resume_Title', JOBKOREA_RESUME_TITLE);
  return fields;
}
