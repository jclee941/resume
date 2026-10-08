import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapToRememberProfile, REMEMBER_SKILL_LIMIT } from '../index.js';

const ssot = {
  platformVariants: {
    wanted: {
      headline: 'DevOps 엔지니어',
      about: '인프라 자동화와 보안 운영을 맡아 온 엔지니어입니다.',
    },
  },
  careers: [
    {
      company: '(주)에이',
      period: '2025.03 ~ 2026.02',
      role: 'DevOps',
      description: '쿠버네티스 운영',
      wantedSummary: '운영 자동화',
      projects: [
        { name: 'P1', description: '배포 파이프라인', achievements: ['배포 단계 자동화'] },
      ],
    },
    { company: '비', period: '2024.03 ~ 2025.02', role: 'SRE', description: '모니터링' },
  ],
  education: {
    school: '예시사이버대학교',
    major: '컴퓨터공학',
    startDate: '2024.03',
    endDate: '2027.02',
    status: '졸업 예정',
  },
  skills: {
    cloud: {
      items: [
        { name: 'AWS', level: 'advanced' },
        { name: 'GCP', level: 'intermediate' },
      ],
    },
    devops: { items: [{ name: 'Kubernetes', level: 'advanced' }] },
  },
  awards: [{ name: '2026 공모전 장려상', organization: '대학교' }],
  certifications: [
    { name: 'CKA', issuer: 'CNCF', status: 'active' },
    { name: 'CISSP', issuer: 'ISC2', status: '준비중' },
  ],
  contact: { github: 'https://github.com/x', velog: 'https://velog.io/@x', email: 'x@y.z' },
  languages: [
    { name: 'Korean', level: 'Native' },
    { name: 'English', level: 'Working proficiency (technical reading & writing)' },
  ],
};

const current = () => ({
  id: 7,
  introduction: null,
  headline: null,
  careers_attributes: [
    { id: 1, company: '씨', joined_date: '2026-06-01', left_date: null, present: true, main: true },
  ],
  academic_histories_attributes: [
    {
      id: 2,
      school: '예시사이버대학교',
      degree: '학사',
      major: '컴퓨터공학',
      joined_date: '2024-01-01',
      left_date: '2026-01-01',
      present: true,
    },
  ],
  skills_attributes: [{ id: 3, skill: 'aws' }],
  appended_info_attributes: [
    { id: 4, category: 'role', value: '옛 수상' },
    { id: 5, category: 'url', value: 'https://keep.me' },
  ],
  languages_attributes: [],
});

describe('mapToRememberProfile', () => {
  it('adds SSoT careers, removes the one the SSoT does not list and moves main to the newest', () => {
    const { careers_attributes: careers } = mapToRememberProfile(ssot, current());

    assert.deepEqual(
      careers?.map((career) => [career.id, career.company, career.main, career._destroy]),
      [
        [undefined, '(주)에이', true, undefined],
        [undefined, '비', false, undefined],
        [1, undefined, undefined, true],
      ]
    );
    assert.equal(careers?.[0].joined_date, '2025-03-01');
    assert.equal(careers?.[0].left_date, '2026-02-01');
    assert.equal(careers?.[0].open_description, '운영 자동화');
    assert.match(String(careers?.[0].description), /\[P1\]\n배포 파이프라인\n- 배포 단계 자동화/);
  });

  it('leaves the main flag on an SSoT career the owner chose', () => {
    const owned = current();
    owned.careers_attributes = [
      { id: 1, company: '비', joined_date: '2024-03-01', left_date: '2025-02-01', main: true },
    ];

    const careers = mapToRememberProfile(ssot, owned).careers_attributes ?? [];

    assert.equal(
      careers.some((career) => career._destroy),
      false
    );
    assert.deepEqual(
      careers.filter((career) => career.main),
      []
    );
  });

  it('keeps two stints at one company as separate careers', () => {
    const twice = {
      ...ssot,
      careers: [
        { company: '(주)에이', period: '2024.03 ~ 2025.02', role: 'SRE' },
        { company: '(주)에이', period: '2017.01 ~ 2018.08', role: 'SI' },
      ],
    };
    const synced = current();
    synced.careers_attributes = [
      {
        id: 1,
        company: '(주)에이',
        position: 'SRE',
        joined_date: '2024-03-01',
        left_date: '2025-02-01',
        present: false,
        main: true,
      },
    ];

    const careers = mapToRememberProfile(twice, synced).careers_attributes ?? [];

    assert.deepEqual(
      careers.map((career) => [career.id, career.joined_date, career.main]),
      [[undefined, '2017-01-01', false]]
    );
  });

  it('updates the matched school in place with the expected graduation', () => {
    const { academic_histories_attributes: academic } = mapToRememberProfile(ssot, current());

    assert.deepEqual(academic, [
      {
        id: 2,
        school: '예시사이버대학교',
        major: '컴퓨터공학',
        joined_date: '2024-03-01',
        left_date: '2027-02-01',
        present: true,
      },
    ]);
  });

  it('adds skills only into free slots, advanced ones first', () => {
    assert.deepEqual(mapToRememberProfile(ssot, current()).skills_attributes, [
      { skill: 'Kubernetes' },
      { skill: 'GCP' },
    ]);

    const nearlyFull = current();
    nearlyFull.skills_attributes = Array.from({ length: REMEMBER_SKILL_LIMIT - 1 }, (_, i) => ({
      id: i,
      skill: `own-${i}`,
    }));
    assert.deepEqual(mapToRememberProfile(ssot, nearlyFull).skills_attributes, [{ skill: 'AWS' }]);
  });

  it('owns awards and active certificates but only adds links', () => {
    const entries = mapToRememberProfile(ssot, current()).appended_info_attributes;

    assert.deepEqual(entries, [
      { category: 'role', value: '2026 공모전 장려상 (대학교)' },
      { category: 'certificate', value: 'CKA (CNCF)' },
      { category: 'url', value: 'https://github.com/x' },
      { category: 'website_blog', value: 'https://velog.io/@x' },
      { id: 4, category: 'role', value: '옛 수상', _destroy: true },
    ]);
  });

  it('adds foreign languages without claiming business English', () => {
    assert.deepEqual(mapToRememberProfile(ssot, current()).languages_attributes, [
      { language_code: 'en', level: 'daily' },
    ]);
  });

  it('maps an already-synced profile to an empty update', () => {
    const update = mapToRememberProfile(ssot, current());
    const synced = {
      ...current(),
      introduction: update.introduction,
      headline: update.headline,
      careers_attributes: (update.careers_attributes ?? [])
        .filter((career) => !career._destroy)
        .map((career, i) => ({ ...career, id: 10 + i })),
      academic_histories_attributes: [
        {
          ...current().academic_histories_attributes[0],
          ...update.academic_histories_attributes?.[0],
        },
      ],
      skills_attributes: [...current().skills_attributes, ...(update.skills_attributes ?? [])],
      appended_info_attributes: [
        ...(update.appended_info_attributes ?? []).filter((entry) => !entry._destroy),
        { id: 5, category: 'url', value: 'https://keep.me' },
      ],
      languages_attributes: update.languages_attributes ?? [],
    };

    assert.deepEqual(mapToRememberProfile(ssot, synced), {});
  });
});
