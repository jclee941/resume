/**
 * @typedef {Object} CareerParams
 * @property {string} [resume_id]
 * @property {string} [career_id]
 * @property {Record<string, unknown>} [career]
 */

/**
 * @typedef {Object} CareerSessionManager
 * @property {(resumeId: string, careerId: string, career: Record<string, unknown>) => Promise<unknown>} updateResumeCareer
 * @property {(resumeId: string, career: Record<string, unknown>) => Promise<unknown>} addResumeCareer
 * @property {(resumeId: string, careerId: string) => Promise<unknown>} deleteResumeCareer
 */

/**
 * @param {CareerParams} params
 * @param {CareerSessionManager} sessionManager
 * @returns {Promise<{ success: boolean, message?: string, error?: string, career?: unknown }>}
 */
export async function update_career(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for update_career',
    };
  }
  if (!params.career_id) {
    return {
      success: false,
      error: 'career_id is required for update_career',
    };
  }
  if (!params.career) {
    return {
      success: false,
      error: 'career object is required for update_career',
    };
  }

  const result = await sessionManager.updateResumeCareer(
    params.resume_id,
    params.career_id,
    params.career
  );
  return {
    success: true,
    message: 'Career updated successfully',
    career: result,
  };
}

/**
 * @param {CareerParams} params
 * @param {CareerSessionManager} sessionManager
 * @returns {Promise<{ success: boolean, message?: string, error?: string, career?: unknown }>}
 */
export async function add_career(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for add_career',
    };
  }
  if (!params.career) {
    return {
      success: false,
      error: 'career object is required for add_career',
    };
  }

  const result = await sessionManager.addResumeCareer(params.resume_id, params.career);
  return {
    success: true,
    message: 'Career added successfully',
    career: result,
  };
}

/**
 * @param {CareerParams} params
 * @param {CareerSessionManager} sessionManager
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function delete_career(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for delete_career',
    };
  }
  if (!params.career_id) {
    return {
      success: false,
      error: 'career_id is required for delete_career',
    };
  }

  await sessionManager.deleteResumeCareer(params.resume_id, params.career_id);
  return {
    success: true,
    message: `Career ${params.career_id} deleted successfully`,
  };
}
