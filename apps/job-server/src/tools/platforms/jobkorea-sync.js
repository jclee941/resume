export function mapToJobKoreaFormat(source) {
  return {
    name: source.personal.name,
    email: source.personal.email,
    phone: source.personal.phone,
    careers: source.careers.map((c) => ({
      company: c.company,
      position: c.role,
      period: c.period,
      description: c.description,
    })),
    education: {
      school: source.education.school,
      major: source.education.major,
      status: source.education.status,
    },
    certifications: source.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })),
  };
}

export async function syncToJobKorea(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to jobkorea.co.kr/User/Resume',
        '2. Fill personal info form',
        '3. Add/update career entries',
        '4. Add certifications',
        '5. Save resume',
      ],
    };
  }

  return {
    error: 'JobKorea sync requires browser automation',
    hint: 'Run with --browser flag or use dashboard UI',
    data_prepared: data,
  };
}
