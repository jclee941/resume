export async function add_skill(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for add_skill' };
  }
  if (!params.tag_type_id) {
    return {
      success: false,
      error: 'tag_type_id is required for add_skill (Wanted skill tag ID)',
    };
  }

  const result = await api.addResumeSkill(
    params.resume_id,
    params.tag_type_id,
  );
  return { success: true, message: 'Skill added successfully', skill: result };
}

export async function delete_skill(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for delete_skill' };
  }
  if (!params.skill_id) {
    return { success: false, error: 'skill_id is required for delete_skill' };
  }

  await api.deleteResumeSkill(params.resume_id, params.skill_id);
  return {
    success: true,
    message: `Skill ${params.skill_id} deleted successfully`,
  };
}
