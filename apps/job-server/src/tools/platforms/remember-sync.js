export function mapToRememberFormat(source) {
  return {
    name: source.personal.name,
    headline: `${source.current?.position || source.careers?.[0]?.role || ''} @ ${source.current?.company || source.careers?.[0]?.company || ''}`,
    experience: source.summary.totalExperience,
    careers: source.careers.map((c) => ({
      company: c.company,
      title: c.role,
      period: c.period,
      project: c.project,
    })),
    skills: source.summary.expertise,
  };
}

export async function syncToRemember(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to career.rememberapp.co.kr',
        '2. Login via mobile app QR',
        '3. Update profile headline',
        '4. Add/update career entries',
        '5. Save changes',
      ],
    };
  }

  return {
    error: 'Remember sync requires browser automation',
    hint: 'Run with --browser flag or use dashboard UI',
    data_prepared: data,
  };
}
