/**
 * @typedef {Object} ProjectApi
 * @property {(resumeId: string | number, careerId: string | number, project: Record<string, unknown>) => Promise<Record<string, unknown>>} addCareerProject
 * @property {(resumeId: string | number, careerId: string | number, projectId: string | number) => Promise<unknown>} deleteCareerProject
 */

/**
 * @typedef {Object} ProjectParams
 * @property {string | number} [resume_id]
 * @property {string | number} [career_id]
 * @property {string | number} [project_id]
 * @property {Record<string, unknown>} [project]
 */

/**
 * @param {ProjectParams} params
 * @param {ProjectApi} sessionManager
 */
export async function add_project(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for add_project',
    };
  }
  if (!params.career_id) {
    return {
      success: false,
      error: 'career_id is required for add_project',
    };
  }
  if (!params.project) {
    return {
      success: false,
      error: 'project object is required for add_project',
    };
  }

  const result = await sessionManager.addCareerProject(
    params.resume_id,
    params.career_id,
    params.project
  );
  return {
    success: true,
    message: 'Project added successfully',
    project: result,
  };
}

/**
 * @param {ProjectParams} params
 * @param {ProjectApi} sessionManager
 */
export async function delete_project(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for delete_project',
    };
  }
  if (!params.career_id) {
    return {
      success: false,
      error: 'career_id is required for delete_project',
    };
  }
  if (!params.project_id) {
    return {
      success: false,
      error: 'project_id is required for delete_project',
    };
  }

  await sessionManager.deleteCareerProject(params.resume_id, params.career_id, params.project_id);
  return {
    success: true,
    message: `Project ${params.project_id} deleted successfully`,
  };
}
