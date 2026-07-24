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

export const mockJobsHighScore = mockJobs.filter((job) => job.matchScore >= 75);
export const mockJobsMediumScore = mockJobs.filter(
  (job) => job.matchScore >= 60 && job.matchScore < 75
);
export const mockJobsLowScore = mockJobs.filter((job) => job.matchScore < 60);
export const mockJobsWanted = mockJobs.filter((job) => job.source === 'wanted');
export const mockJobsJobKorea = mockJobs.filter((job) => job.source === 'jobkorea');
export const mockJobsSaramin = mockJobs.filter((job) => job.source === 'saramin');
