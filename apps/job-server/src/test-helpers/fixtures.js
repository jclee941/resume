/**
 * Test fixtures - Mock data for auto-apply tests
 * @file apps/job-server/src/test-helpers/fixtures.js
 */

/**
 * @typedef {Object} MockJob
 * @property {string} id
 * @property {string} company
 * @property {string} position
 * @property {number} matchScore
 * @property {string} source
 * @property {string} [location]
 * @property {string} [url]
 * @property {string} [postedAt]
 */

/**
 * @typedef {Object} MockResumeData
 * @property {Object} personal
 * @property {Array} careers
 * @property {Array} educations
 * @property {Array} skills
 */

/**
 * @typedef {Object} MockApplication
 * @property {string} id
 * @property {string} job_id
 * @property {string} source
 * @property {string} [source_url]
 * @property {string} position
 * @property {string} company
 * @property {string} [location]
 * @property {number} match_score
 * @property {string} status
 * @property {string} priority
 * @property {string} [resume_id]
 * @property {string} [cover_letter]
 * @property {string} [notes]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} MockCoverLetter
 * @property {string} [ko]
 * @property {string} [en]
 */

// ========================
// Mock Jobs
// ========================

/** @type {MockJob[]} */
export const mockJobs = [
  {
    id: 'wanted-325174',
    company: 'Toss',
    position: 'DevOps Engineer',
    matchScore: 85,
    source: 'wanted',
    location: '서울',
    url: 'https://www.wanted.co.kr/wd/325174',
    postedAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'wanted-310002',
    company: 'Kakao',
    position: 'SRE',
    matchScore: 72,
    source: 'wanted',
    location: '서울',
    url: 'https://www.wanted.co.kr/wd/310002',
    postedAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 'wanted-298451',
    company: 'Naver',
    position: 'Infrastructure Engineer',
    matchScore: 65,
    source: 'wanted',
    location: '경기도',
    url: 'https://www.wanted.co.kr/wd/298451',
    postedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'wanted-280123',
    company: 'Line',
    position: 'Junior DevOps',
    matchScore: 45,
    source: 'wanted',
    location: '서울',
    url: 'https://www.wanted.co.kr/wd/280123',
    postedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'jobkorea-987654',
    company: 'Samsung SDS',
    position: 'Cloud Engineer',
    matchScore: 78,
    source: 'jobkorea',
    location: '서울',
    url: 'https://www.jobkorea.co.kr/Recruit/Read/987654',
    postedAt: '2026-03-18T10:00:00Z',
  },
  {
    id: 'saramin-456789',
    company: 'Lotte',
    position: 'DevOps',
    matchScore: 55,
    source: 'saramin',
    location: '서울',
    url: 'https://www.saramin.co.kr/zf_user/jobs/relay/456789',
    postedAt: '2026-03-12T10:00:00Z',
  },
];

/** Jobs filtered by score range */
export const mockJobsHighScore = mockJobs.filter((j) => j.matchScore >= 75);
export const mockJobsMediumScore = mockJobs.filter((j) => j.matchScore >= 60 && j.matchScore < 75);
export const mockJobsLowScore = mockJobs.filter((j) => j.matchScore < 60);

/** Jobs by source */
export const mockJobsWanted = mockJobs.filter((j) => j.source === 'wanted');
export const mockJobsJobKorea = mockJobs.filter((j) => j.source === 'jobkorea');
export const mockJobsSaramin = mockJobs.filter((j) => j.source === 'saramin');

// ========================
// Mock Resume Data
// ========================

/** @type {MockResumeData} */
export const mockResumeData = {
  personal: {
    name: '홍길동',
    email: 'hong.gildong@example.com',
    phone: '010-1234-5678',
    headline: 'DevSecOps Engineer | 8년차 | 보안/인프라',
    intro:
      '클라우드 보안과 인프라 자동화에 전문화된 DevSecOps 엔지니어입니다.\nKubernetes 보안, CI/CD 파이프라인 보안 자동화, IaC 보안에 경험이 있습니다.',
    github: 'https://github.com/honggildong',
    blog: 'https://honggildong.tistory.com',
    website: 'https://honggildong.dev',
  },
  careers: [
    {
      id: 1,
      company: { name: '엔드럴株式会社' },
      job_role: 'DevSecOps Engineer',
      employment_type: 'FULL_TIME',
      start_time: '2021-03-01',
      end_time: null,
      served: true,
      is_current: true,
      projects: [
        {
          title: 'Kubernetes 클러스터 보안 강화',
          description:
            '- Falco 기반 런타임 보안 모니터링 구축\n- OPA Gatekeeper 정책 적용\n- Vault를 통한 시크릿 관리 자동화',
        },
        {
          title: 'CI/CD 보안 자동화',
          description:
            '- GitHub Actions 워크플로우 보안 스캔 통합\n- Trivy 기반 컨테이너 이미지 스캐닝\n- SAST/DAST 파이프라인 구축',
        },
      ],
    },
    {
      id: 2,
      company: { name: '(주)클라우드베이스' },
      job_role: 'Infrastructure Engineer',
      employment_type: 'FULL_TIME',
      start_time: '2018-06-01',
      end_time: '2021-02-28',
      served: true,
      is_current: false,
      projects: [
        {
          title: 'AWS 인프라 IaC화',
          description: '- Terraform을 통한 인프라 자동화\n- Ansible 기반 구성관리',
        },
      ],
    },
  ],
  educations: [
    {
      id: 1,
      school: { name: '한국대학교' },
      major: '컴퓨터공학',
      degree: '학사',
      start_time: '2014-03-01',
      end_time: '2018-02-28',
    },
  ],
  skills: [
    { id: 1, name: 'Kubernetes', level: 'expert' },
    { id: 2, name: 'Docker', level: 'expert' },
    { id: 3, name: 'Terraform', level: 'expert' },
    { id: 4, name: 'AWS', level: 'advanced' },
    { id: 5, name: 'GCP', level: 'advanced' },
    { id: 6, name: 'Python', level: 'advanced' },
    { id: 7, name: 'Go', level: 'intermediate' },
    { id: 8, name: 'GitHub Actions', level: 'expert' },
    { id: 9, name: 'Vault', level: 'advanced' },
    { id: 10, name: 'Falco', level: 'advanced' },
  ],
};

// ========================
// Mock Application
// ========================

/**
 * @param {Partial<MockApplication>} [overrides]
 * @returns {MockApplication}
 */
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

/** @type {MockApplication[]} */
export const mockApplications = [
  createMockApplication({ id: 'app-001', status: 'applied', match_score: 85 }),
  createMockApplication({ id: 'app-002', status: 'pending', match_score: 68 }),
  createMockApplication({ id: 'app-003', status: 'approved', match_score: 78 }),
  createMockApplication({ id: 'app-004', status: 'rejected', match_score: 72 }),
  createMockApplication({ id: 'app-005', status: 'viewed', match_score: 82 }),
];

// ========================
// Mock Cover Letters
// ========================

/** @type {MockCoverLetter} */
export const mockCoverLetter = {
  ko: `안녕하세요.

클라우드 보안과 인프라 자동화에 전문화된 DevSecOps 엔지니어 홍길동입니다.

8년간 인프라 및 보안 분야에서 쌓은 경험과 지식을 바탕으로 고객님의 팀에 기여하고 싶습니다.

[주요 역량]
- Kubernetes 클러스터 보안 구축 (Falco, OPA Gatekeeper)
- CI/CD 파이프라인 보안 자동화 (GitHub Actions, Trivy)
- Terraform/ Ansible 기반 IaC 및 구성 관리
- AWS/GCP 클라우드 인프라 설계 및 운영

항상 안전한 시스템을 구축하는 것이 최고의 보안 전략이라 믿습니다.

감사합니다.
홍길동 드림`,
  en: `Dear Hiring Manager,

I am writing to express my strong interest in the DevOps Engineer position at your company.

With 8 years of experience in infrastructure and cloud security, I bring expertise in:

[Key Skills]
- Kubernetes cluster security (Falco, OPA Gatekeeper)
- CI/CD pipeline security automation (GitHub Actions, Trivy)
- Infrastructure as Code (Terraform, Ansible)
- AWS/GCP cloud infrastructure design and operations

I believe that building secure systems from the ground up is the best security strategy.

Thank you for your consideration.

Best regards,
Gildong Hong`,
};

/** Cover letter samples by job type */
export const mockCoverLetters = {
  devops: mockCoverLetter,
  frontend: {
    ko: '프론트엔드 개발자 지원 서한입니다...',
    en: 'Cover letter for frontend developer position...',
  },
  backend: {
    ko: '백엔드 개발자 지원 서한입니다...',
    en: 'Cover letter for backend developer position...',
  },
  data: {
    ko: '데이터 엔지니어 지원 서한입니다...',
    en: 'Cover letter for data engineer position...',
  },
};

// ========================
// Mock Telegram Response
// ========================

/** @type {Object} */
export const mockTelegramResponse = {
  ok: true,
  result: {
    message_id: 123,
    from: {
      id: 123456789,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
    },
    chat: {
      id: -1001234567890,
      title: 'Job Alerts',
      type: 'group',
    },
    date: 1709312400,
    text: '테스트 메시지',
  },
};

/** @type {Object} */
export const mockTelegramErrorResponse = {
  ok: false,
  error_code: 400,
  description: 'Bad Request: chat not found',
};

/** @type {Object} */
export const mockTelegramSendMessageResponse = {
  ok: true,
  result: {
    message_id: 456,
    date: 1709312500,
    text: '📨 지원 완료: DevOps Engineer @ Toss',
  },
};

// ========================
// Mock Wanted API Response
// ========================

/** @type {Object} */
export const mockWantedResponse = {
  success: true,
  data: {
    job: {
      id: 325174,
      title: 'DevOps Engineer',
      company: {
        id: 1234,
        name: 'Toss',
        logo_url: 'https://example.com/toss-logo.png',
      },
      location: '서울',
      job_type: 'Full-time',
      salary: '8,000만원 ~ 12,000만원',
      deadline: '2026-04-15',
      content: '<p>직무 내용...</p>',
      requirements: '<p>요구 사항...</p>',
      benefits: '<p>복리후생...</p>',
    },
  },
};

/** @type {Object} */
export const mockWantedSearchResponse = {
  success: true,
  data: {
    items: [
      {
        id: 325174,
        title: 'DevOps Engineer',
        company_name: 'Toss',
        location: '서울',
        salary: '8,000만원 ~ 12,000만원',
        updated_at: '2026-03-15T10:00:00Z',
      },
      {
        id: 310002,
        title: 'SRE',
        company_name: 'Kakao',
        location: '서울',
        salary: '면접 후 결정',
        updated_at: '2026-03-20T10:00:00Z',
      },
    ],
    total_count: 2,
    next_page: null,
  },
};

/** @type {Object} */
export const mockWantedAuthResponse = {
  success: true,
  data: {
    user: {
      id: 12345,
      name: '홍길동',
      email: 'hong@example.com',
    },
    expires_at: '2026-04-01T00:00:00Z',
  },
};

/** @type {Object} */
export const mockWantedErrorResponse = {
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Invalid or expired session',
  },
};

// ========================
// Mock Timeline Events
// ========================

/** @type {Array} */
export const mockTimelineEvents = [
  {
    id: 'tl-001',
    application_id: 'app-001',
    status: 'discovered',
    previous_status: null,
    note: 'Application created',
    timestamp: '2026-03-15T10:00:00Z',
  },
  {
    id: 'tl-002',
    application_id: 'app-001',
    status: 'pending',
    previous_status: 'discovered',
    note: 'Awaiting approval',
    timestamp: '2026-03-15T11:00:00Z',
  },
  {
    id: 'tl-003',
    application_id: 'app-001',
    status: 'approved',
    previous_status: 'pending',
    note: 'Auto-approved (score >= 75)',
    timestamp: '2026-03-15T11:05:00Z',
  },
  {
    id: 'tl-004',
    application_id: 'app-001',
    status: 'applied',
    previous_status: 'approved',
    note: 'Application submitted',
    timestamp: '2026-03-15T12:00:00Z',
  },
];

// ========================
// Default export
// ========================

export default {
  mockJobs,
  mockResumeData,
  mockApplications,
  mockCoverLetter,
  mockTelegramResponse,
  mockWantedResponse,
  createMockApplication,
};
