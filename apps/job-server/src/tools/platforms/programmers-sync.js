import { ProgrammersProfileSync } from '../../../platforms/programmers/programmers-profile-sync.js';

export function mapToProgrammersFormat(source) {
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

export async function syncToProgrammers(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to career.programmers.co.kr profile',
        '2. Login if needed',
        '3. Update personal info',
        '4. Add/update career entries',
        '5. Add education',
        '6. Add certifications',
        '7. Save profile',
      ],
    };
  }

  const sync = new ProgrammersProfileSync({ headless: false, debug: params.debug, ...params });
  try {
    await sync.init();
    return await sync.syncProfile(data, { dry_run: false });
  } finally {
    await sync.close();
  }
}
