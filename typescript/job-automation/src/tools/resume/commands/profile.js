import { SessionManager } from '../../auth.js';

export async function view(api, params) {
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

export async function update_headline(api, params) {
  if (!params.text) {
    return { success: false, error: 'text is required for update_headline' };
  }
  await api.updateProfile({ headline: params.text });
  return { success: true, message: 'Headline updated', headline: params.text };
}

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
