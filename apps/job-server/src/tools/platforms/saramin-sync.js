import { SaraminProfileSync } from '../../../platforms/saramin/saramin-profile-sync.js';

export function mapToSaraminFormat(source) {
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

export async function syncToSaramin(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to saramin.co.kr/zf_user/resume/write',
        '2. Fill personal info form',
        '3. Add/update career entries',
        '4. Add education',
        '5. Add certifications',
        '6. Save resume',
      ],
    };
  }

  const sync = new SaraminProfileSync({ headless: false, debug: params.debug, ...params });
  try {
    await sync.init();
    return await sync.syncProfile(data, { dry_run: false });
  } finally {
    await sync.close();
  }
}
