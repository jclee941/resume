/**
 * @typedef {Object} ResumeProjectDetail
 * @property {string | number} [id]
 * @property {string} [title]
 * @property {string} [description]
 */

/**
 * @typedef {Object} ResumeCompanyDetail
 * @property {string} [name]
 */

/**
 * @typedef {Object} ResumeCareerDetail
 * @property {string | number} [id]
 * @property {string} [job_role]
 * @property {string} [title]
 * @property {ResumeCompanyDetail} [company]
 * @property {string} [employment_type]
 * @property {string} [start_time]
 * @property {string} [end_time]
 * @property {unknown} [served]
 * @property {ResumeProjectDetail[]} [projects]
 */

/**
 * @typedef {Object} ResumeMeta
 * @property {string} [title]
 * @property {string} [lang]
 * @property {boolean} [is_complete]
 * @property {string} [key]
 */

/**
 * @typedef {Object} ResumeDetailData
 * @property {ResumeCareerDetail[]} [careers]
 * @property {ResumeMeta} [resume]
 * @property {unknown[]} [educations]
 * @property {unknown[]} [skills]
 * @property {Record<string, unknown>} [extra]
 */

/**
 * @typedef {Object} ResumeCrudApi
 * @property {() => Promise<unknown>} getResumeList
 * @property {(resumeId: string | number) => Promise<ResumeDetailData>} getResumeDetail
 * @property {(resumeId: string | number) => Promise<unknown>} saveResume
 */

/**
 * @typedef {Object} ResumeCrudParams
 * @property {string | number} [resume_id]
 */

/**
 * @param {Record<string, unknown>} _params
 * @param {ResumeCrudApi} sessionManager
 */
export async function list_resumes(_params, sessionManager) {
  const resumes = await sessionManager.getResumeList();
  return {
    success: true,
    resumes,
  };
}

/**
 * @param {ResumeCrudParams} params
 * @param {ResumeCrudApi} sessionManager
 */
export async function get_resume(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for get_resume',
    };
  }

  const data = await sessionManager.getResumeDetail(params.resume_id);
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

/**
 * @param {ResumeCrudParams} params
 * @param {ResumeCrudApi} sessionManager
 */
export async function save_resume(params, sessionManager) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for save_resume',
    };
  }

  await sessionManager.saveResume(params.resume_id);
  return {
    success: true,
    message: 'Resume saved and PDF regenerated',
  };
}
