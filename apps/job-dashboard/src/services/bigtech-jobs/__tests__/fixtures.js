export const OPTIONS = { today: '2026-11-11', budget: 10 };

export function json(value) {
  return new Response(JSON.stringify(value));
}

export function amazon(overrides = {}) {
  return {
    id_icims: '10595030',
    title: 'Data Center Operations Engineer, ICN - DCO',
    company_name: 'Amazon Corporate Services Korea LLC',
    country_code: 'KOR',
    location: 'KR, Seoul',
    job_path: '/en/jobs/10595030/data-center-operations-engineer-icn-dco',
    description: '<p>Maintain servers and network infrastructure.</p>',
    basic_qualifications: 'Linux troubleshooting experience',
    preferred_qualifications: '',
    ...overrides,
  };
}

export function kakao(overrides = {}) {
  return {
    realId: 'P-14469',
    jobOfferTitle: '시스템 운영 엔지니어 (경력)',
    companyName: '카카오',
    locationName: '판교',
    closeFlag: false,
    privateFlag: false,
    useFlag: true,
    statusCode: 'PROGRESS',
    resumeSubmissionEndDatetime: null,
    endDate: null,
    introduction: '<p>AI serving infrastructure.</p>',
    workContentDesc: '<p>GPU cluster operations</p>',
    qualification: '시스템 개발 경력 5년 이상',
    ...overrides,
  };
}

export function line(overrides = {}) {
  return {
    strapiId: 3053,
    publish: true,
    is_public: true,
    title: 'Senior Security Operations & Incident Response Engineer (SOC/CSIRT)',
    companies: [{ name: 'LINE Plus' }],
    cities: [{ name: 'Bundang' }],
    start_date: '2026-10-08T09:00:00.000Z',
    end_date: '2999-12-31T14:59:00.000Z',
    until_filled: true,
    ...overrides,
  };
}

export function naver(overrides = {}) {
  return {
    annoId: 30005627,
    annoSubject: '[SNOW] IT 보안 기술 담당',
    sysCompanyCdNm: 'SNOW',
    workAreaCd: '0010',
    entTypeCdNm: '경력',
    endYmdTime: '2026.11.15 23:59:00',
    jobDetailLink: 'https://recruit.navercorp.com/rcrt/view.do?annoId=30005627',
    ...overrides,
  };
}

export function naverDetail(text = '서버 운영', address = '경기도 성남시') {
  return `<script type="application/ld+json">${JSON.stringify({
    '@type': 'JobPosting',
    description: '',
    baseSalary: { currency: '', value: { value: '', unitText: '' } },
    jobLocation: { address: { streetAddress: address } },
  })}</script>
  <aside>급여: 9억원 | 개인정보보호 | 보안 | 네트워크</aside>
  <div class="detail_wrap"><div class="detail_box">
  <h4 class="detail_title">What You'll Do</h4>
  <p class="detail_text">${text}</p></div></div>`;
}

export function daangnDetail(overrides = {}) {
  return `<script type="application/ld+json">${JSON.stringify([
    { '@type': 'Organization', name: '당근 팀' },
    {
      '@type': 'JobPosting',
      url: 'https://careers.daangn.com/jobs/role/5004587003/',
      title: 'Network Engineer - 인프라 (네트워크, Cloud)',
      description: '<p>네트워크 운영</p>',
      hiringOrganization: { name: '당근' },
      jobLocation: { address: { addressCountry: 'KR' } },
      datePosted: '2026-11-09',
      ...overrides,
    },
  ])}</script>`;
}

export function card(id = '5004587003', title = 'Network Engineer - 인프라') {
  return `<li data-job-card><a href="/jobs/role/${id}/"><h3>${title}</h3></a></li>`;
}
