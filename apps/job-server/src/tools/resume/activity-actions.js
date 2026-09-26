/**
 * @typedef {Object} ActivityParams
 * @property {string} [resume_id]
 * @property {string} [activity_id]
 * @property {Record<string, unknown>} [activity]
 */

/**
 * @typedef {Object} ActivitySessionManager
 * @property {(resumeId: string, activityId: string, activity: Record<string, unknown>) => Promise<unknown>} updateResumeActivity
 * @property {(resumeId: string, activity: Record<string, unknown>) => Promise<unknown>} addResumeActivity
 * @property {(resumeId: string, activityId: string) => Promise<unknown>} deleteResumeActivity
 */

/**
 * @param {ActivityParams} params
 * @param {ActivitySessionManager} sessionManager
 * @returns {Promise<{ success: boolean, message?: string, error?: string, activity?: unknown }>}
 */
export async function update_activity(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for update_activity',
    };
  }
  if (!params.activity_id) {
    return {
      success: false,
      error: 'activity_id is required for update_activity',
    };
  }
  if (!params.activity) {
    return {
      success: false,
      error: 'activity object is required for update_activity',
    };
  }

  const result = await sessionManager.updateResumeActivity(
    params.resume_id,
    params.activity_id,
    params.activity
  );
  return {
    success: true,
    message: 'Activity updated successfully',
    activity: result,
  };
}

/**
 * @param {ActivityParams} params
 * @param {ActivitySessionManager} sessionManager
 * @returns {Promise<{ success: boolean, message?: string, error?: string, activity?: unknown }>}
 */
export async function add_activity(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for add_activity',
    };
  }
  if (!params.activity) {
    return {
      success: false,
      error: 'activity object is required for add_activity',
    };
  }

  const result = await sessionManager.addResumeActivity(params.resume_id, params.activity);
  return {
    success: true,
    message: 'Activity added successfully',
    activity: result,
  };
}

/**
 * @param {ActivityParams} params
 * @param {ActivitySessionManager} sessionManager
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function delete_activity(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for delete_activity',
    };
  }
  if (!params.activity_id) {
    return {
      success: false,
      error: 'activity_id is required for delete_activity',
    };
  }

  await sessionManager.deleteResumeActivity(params.resume_id, params.activity_id);
  return {
    success: true,
    message: `Activity ${params.activity_id} deleted successfully`,
  };
}
