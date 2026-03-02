export async function update_career(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for update_career' };
  }
  if (!params.career_id) {
    return { success: false, error: 'career_id is required for update_career' };
  }
  if (!params.career) {
    return {
      success: false,
      error: 'career object is required for update_career',
    };
  }

  const result = await api.updateResumeCareer(
    params.resume_id,
    params.career_id,
    params.career,
  );
  return { success: true, message: 'Career updated successfully', career: result };
}

export async function add_career(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for add_career' };
  }
  if (!params.career) {
    return {
      success: false,
      error: 'career object is required for add_career',
    };
  }

  const result = await api.addResumeCareer(params.resume_id, params.career);
  return { success: true, message: 'Career added successfully', career: result };
}

export async function delete_career(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for delete_career' };
  }
  if (!params.career_id) {
    return { success: false, error: 'career_id is required for delete_career' };
  }

  await api.deleteResumeCareer(params.resume_id, params.career_id);
  return {
    success: true,
    message: `Career ${params.career_id} deleted successfully`,
  };
}
