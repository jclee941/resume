export async function list_resumes(api, params) {
  const resumes = await api.getResumeList();
  return { success: true, resumes };
}

export async function get_resume(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for get_resume' };
  }
  const data = await api.getResumeDetail(params.resume_id);

  const formattedCareers = data.careers?.map((c) => ({
    id: c.id,
    job_role: c.job_role,
    title: c.title,
    company: c.company?.name,
    employment_type: c.employment_type,
    period: `${c.start_time} ~ ${c.end_time || '현재'}`,
    served: c.served,
    projects: c.projects?.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
    })),
  }));

  return {
    success: true,
    resume: {
      title: data.resume?.title,
      lang: data.resume?.lang,
      is_complete: data.resume?.is_complete,
      key: data.resume?.key,
      careers: formattedCareers,
      educations: data.educations,
      skills: data.skills,
      _raw: data,
    },
  };
}

export async function save_resume(api, params) {
  if (!params.resume_id) {
    return { success: false, error: 'resume_id is required for save_resume' };
  }
  await api.saveResume(params.resume_id);
  return { success: true, message: 'Resume saved and PDF regenerated' };
}
