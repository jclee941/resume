export async function update_education(params, sessionManager) {
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

  const result = await sessionManager.updateResumeEducation(
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

export async function add_education(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for add_education',
    };
  }
  if (!params.education) {
    return {
      success: false,
      error: 'education object is required for add_education',
    };
  }

  const result = await sessionManager.addResumeEducation(params.resume_id, params.education);
  return {
    success: true,
    message: 'Education added successfully',
    education: result,
  };
}

export async function delete_education(params, sessionManager) {
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

  await sessionManager.deleteResumeEducation(params.resume_id, params.education_id);
  return {
    success: true,
    message: `Education ${params.education_id} deleted successfully`,
  };
}
