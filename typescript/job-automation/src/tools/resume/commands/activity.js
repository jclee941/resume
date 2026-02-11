export async function update_activity(api, params) {
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

  const result = await api.updateResumeActivity(
    params.resume_id,
    params.activity_id,
    params.activity,
  );
  return {
    success: true,
    message: 'Activity updated successfully',
    activity: result,
  };
}

export async function add_activity(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for add_activity' };
  }
  if (!params.activity) {
    return {
      success: false,
      error: 'activity object is required for add_activity',
    };
  }

  const result = await api.addResumeActivity(
    params.resume_id,
    params.activity,
  );
  return {
    success: true,
    message: 'Activity added successfully',
    activity: result,
  };
}

export async function delete_activity(api, params) {
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

  await api.deleteResumeActivity(params.resume_id, params.activity_id);
  return {
    success: true,
    message: `Activity ${params.activity_id} deleted successfully`,
  };
}
