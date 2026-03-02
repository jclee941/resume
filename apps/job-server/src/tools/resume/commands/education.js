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
    params.education,
  );
  return {
    success: true,
    message: 'Education updated successfully',
    education: result,
  };
}

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

  const result = await api.addResumeEducation(
    params.resume_id,
    params.education,
  );
  return {
    success: true,
    message: 'Education added successfully',
    education: result,
  };
}

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
