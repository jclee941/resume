export function createMockApplication(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: 'app-001',
    job_id: 'wanted-325174',
    source: 'wanted',
    source_url: 'https://www.wanted.co.kr/wd/325174',
    position: 'DevOps Engineer',
    company: 'Toss',
    location: '서울',
    match_score: 85,
    status: 'discovered',
    priority: 'high',
    resume_id: 'AwcICwcLBAFIAgcDCwUAB01F',
    cover_letter: null,
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export const mockApplications = [
  createMockApplication({ id: 'app-001', status: 'applied', match_score: 85 }),
  createMockApplication({ id: 'app-002', status: 'pending', match_score: 68 }),
  createMockApplication({ id: 'app-003', status: 'approved', match_score: 78 }),
  createMockApplication({ id: 'app-004', status: 'rejected', match_score: 72 }),
  createMockApplication({ id: 'app-005', status: 'viewed', match_score: 82 }),
];
