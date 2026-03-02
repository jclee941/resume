export async function add_project(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for add_project' };
  }
  if (!params.career_id) {
    return { success: false, error: 'career_id is required for add_project' };
  }
  if (!params.project) {
    return {
      success: false,
      error: 'project object is required for add_project',
    };
  }

  const result = await api.addCareerProject(
    params.resume_id,
    params.career_id,
    params.project,
  );
  return { success: true, message: 'Project added successfully', project: result };
}

export async function delete_project(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for delete_project' };
  }
  if (!params.career_id) {
    return { success: false, error: 'career_id is required for delete_project' };
  }
  if (!params.project_id) {
    return { success: false, error: 'project_id is required for delete_project' };
  }

  await api.deleteCareerProject(
    params.resume_id,
    params.career_id,
    params.project_id,
  );
  return {
    success: true,
    message: `Project ${params.project_id} deleted successfully`,
  };
}
