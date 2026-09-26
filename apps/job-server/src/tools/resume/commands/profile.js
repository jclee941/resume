/**
 * @typedef {Object} ProfileExperience
 * @property {string | number} [id]
 * @property {string} [company_name]
 * @property {string} [position]
 * @property {string} [start_date]
 * @property {string} [end_date]
 * @property {boolean} [is_current]
 */

/**
 * @typedef {Object} ProfileEducation
 * @property {string | number} [id]
 * @property {string} [school_name]
 * @property {string} [major]
 * @property {string} [start_date]
 * @property {string} [end_date]
 */

/**
 * @typedef {Object} ProfileSkill
 * @property {string | number} [id]
 * @property {string} [name]
 */

/**
 * @typedef {Object} ProfileData
 * @property {string | number} [id]
 * @property {string} [name]
 * @property {string} [headline]
 * @property {string | number} [annual]
 * @property {ProfileExperience[]} [experiences]
 * @property {ProfileEducation[]} [educations]
 * @property {ProfileSkill[]} [skills]
 */

/**
 * @typedef {Object} ProfileApi
 * @property {() => Promise<ProfileData>} getProfile
 * @property {(profileData: Record<string, unknown>) => Promise<unknown>} updateProfile
 */

/**
 * @typedef {Object} ProfileParams
 * @property {string} [text]
 */

/**
 * @param {ProfileApi} api
 * @param {Record<string, unknown>} [_params]
 */
export async function view(api, _params) {
  const profile = await api.getProfile();
  return {
    success: true,
    profile: {
      id: profile.id,
      name: profile.name,
      headline: profile.headline,
      annual: profile.annual,
      experiences: profile.experiences?.map((exp) => ({
        id: exp.id,
        company: exp.company_name,
        position: exp.position,
        period: `${exp.start_date} ~ ${exp.is_current ? '현재' : exp.end_date}`,
      })),
      educations: profile.educations?.map((edu) => ({
        id: edu.id,
        school: edu.school_name,
        major: edu.major,
        period: `${edu.start_date} ~ ${edu.end_date}`,
      })),
      skills: profile.skills?.map((s) => ({
        id: s.id,
        name: s.name,
      })),
    },
  };
}

/**
 * @param {ProfileApi} api
 * @param {ProfileParams} params
 */
export async function update_headline(api, params) {
  if (!params.text) {
    return { success: false, error: 'text is required for update_headline' };
  }
  await api.updateProfile({ headline: params.text });
  return { success: true, message: 'Headline updated', headline: params.text };
}

/**
 * @param {ProfileApi} api
 * @param {ProfileParams} params
 */
export async function update_intro(api, params) {
  if (!params.text) {
    return { success: false, error: 'text is required for update_intro' };
  }
  await api.updateProfile({ description: params.text });
  return {
    success: true,
    message: 'Introduction updated',
    introduction: params.text,
  };
}
