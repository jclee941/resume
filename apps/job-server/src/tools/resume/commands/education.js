/**
 * @typedef {Object} EducationParams
 * @property {string} [resume_id]
 * @property {string} [education_id]
 * @property {Record<string, unknown>} [education]
 */

/**
 * @typedef {Object} EducationApi
 * @property {(resumeId: string, educationId: string, education: Record<string, unknown>) => Promise<unknown>} updateResumeEducation
 * @property {(resumeId: string, education: Record<string, unknown>) => Promise<unknown>} addResumeEducation
 * @property {(resumeId: string, educationId: string) => Promise<unknown>} deleteResumeEducation
 */

/**
 * @param {EducationApi} api
 * @param {EducationParams} params
 * @returns {Promise<{ success: boolean, message?: string, error?: string, education?: unknown }>}
 */
export async function update_education(api, params) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for update_education',
    };
  }
  if (!params.education_id) {
    return {
      success: false,
      error: 'education_id is required for update_education',
    };
  }
  if (!params.education) {
    return {
      success: false,
      error: 'education object is required for update_education',
    };
  }

  const result = await api.updateResumeEducation(
    params.resume_id,
    params.education_id,
    params.education
  );
  return {
    success: true,
    message: 'Education updated successfully',
    education: result,
  };
}

/**
 * @param {EducationApi} api
 * @param {EducationParams} params
 * @returns {Promise<{ success: boolean, message?: string, error?: string, education?: unknown }>}
 */
export async function add_education(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for add_education' };
  }
  if (!params.education) {
    return {
      success: false,
      error: 'education object is required for add_education',
    };
  }

  const result = await api.addResumeEducation(params.resume_id, params.education);
  return {
    success: true,
    message: 'Education added successfully',
    education: result,
  };
}

/**
 * @param {EducationApi} api
 * @param {EducationParams} params
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function delete_education(api, params) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for delete_education',
    };
  }
  if (!params.education_id) {
    return {
      success: false,
      error: 'education_id is required for delete_education',
    };
  }

  await api.deleteResumeEducation(params.resume_id, params.education_id);
  return {
    success: true,
    message: `Education ${params.education_id} deleted successfully`,
  };
}
