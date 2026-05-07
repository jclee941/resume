import { LinkedInProfileSync } from '../../../platforms/linkedin/linkedin-profile-sync.js';

export function mapToLinkedInFormat(source) {
  return {
    personal: source.personal,
    careers: source.careers,
    education: source.education,
    certifications: source.certifications,
    summary: source.summary,
    current: source.current,
    headline: `${source.current?.position || source.careers?.[0]?.role || ''} | ${source.summary?.totalExperience || ''}`,
  };
}

export async function syncToLinkedIn(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'manual_required',
      would_sync: data,
      steps: [
        '1. Go to https://www.linkedin.com/in/me/edit/contact-info/',
        '2. Update Headline',
        '3. Update Experience section',
        '4. Update Education section',
        '5. Add Licenses & Certifications',
        '6. Update Skills section',
      ],
    };
  }

  const sync = new LinkedInProfileSync({ headless: false, debug: params.debug, ...params });
  try {
    await sync.init();
    return await sync.syncProfile(data, { dry_run: false });
  } finally {
    await sync.close();
  }
}
