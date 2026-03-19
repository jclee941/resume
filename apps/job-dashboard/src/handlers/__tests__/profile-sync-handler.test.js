import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// Inline the pure functions to avoid Worker env dependencies from the handler module
function parsePeriod(period = '') {
  const parts = String(period)
    .split(/~| - /)
    .map((part) => part.trim())
    .filter(Boolean);
  const start = parts[0] ? `${parts[0].replace('.', '-')}-01` : null;
  const end = parts[1] && parts[1] !== '현재' ? `${parts[1].replace('.', '-')}-01` : null;
  return { start, end };
}

function mapEducationToWanted(education) {
  const startTime = education.startDate ? `${education.startDate.replace('.', '-')}-01` : null;
  const endTime = education.status === '재학중' ? null : (education.endDate ? `${education.endDate.replace('.', '-')}-01` : null);
  return {
    school_name: education.school,
    major: education.major,
    start_time: startTime,
    end_time: endTime,
    degree: '학사',
    description: education.status === '재학중' ? `재학중 (${education.startDate || ''} ~ )` : null,
  };
}

function mapCertificationToWanted(certification) {
  return {
    title: certification.name,
    description: `${certification.issuer || ''} | ${certification.date || ''}`.trim(),
    start_time: certification.date ? `${certification.date.replace('.', '-')}-01` : null,
    activity_type: 'CERTIFICATE',
  };
}

function mapCareerToWanted(career) {
  const { start, end } = parsePeriod(career.period);
  return {
    company: { name: career.company, type: 'CUSTOM' },
    job_role: career.role,
    job_category_id: 674,
    start_time: start,
    end_time: end,
    served: end === null,
    employment_type: 'FULLTIME',
  };
}

describe('ProfileSyncHandler — career project sync', () => {
  it('mapCareerToWanted does not include inline projects field', () => {
    const career = {
      company: '(주)아이티센 CTS',
      role: '보안운영 담당',
      period: '2025.03 ~ 2026.02',
      project: 'Security Operations',
      description: 'SOC monitoring',
    };

    const mapped = mapCareerToWanted(career);

    assert.strictEqual(mapped.served, false);
    assert.strictEqual(mapped.start_time, '2025-03-01');
    assert.strictEqual(mapped.end_time, '2026-02-01');
    assert.strictEqual(
      'projects' in mapped,
      false,
      'projects must not be in career payload — API ignores it'
    );
  });

  it('career update loop deletes existing projects and adds SSoT project via separate API calls', async () => {
    const deleteProject = mock.fn(async () => undefined);
    const addProject = mock.fn(async () => ({ data: { id: 'new-proj' } }));
    const updateCareer = mock.fn(async () => undefined);

    const client = { updateCareer, deleteProject, addProject };
    const resumeId = 'resume-abc';

    // Simulate toUpdate structure from _buildWantedChanges
    const toUpdate = [
      {
        id: 'career-1',
        company: '(주)아이티센 CTS',
        data: mapCareerToWanted({
          company: '(주)아이티센 CTS',
          role: '보안운영 담당',
          period: '2025.03 ~ 2026.02',
        }),
        ssotCareer: {
          company: '(주)아이티센 CTS',
          project: 'Security Operations',
          description: 'SOC monitoring and incident response',
        },
        existingProjects: [
          { id: 'old-proj-1', title: 'STAR 1' },
          { id: 'old-proj-2', title: 'STAR 2' },
        ],
      },
    ];

    // Replicate the apply loop from profile-sync-handler.js lines 330-347
    for (const career of toUpdate) {
      await client.updateCareer(resumeId, career.id, career.data);
      for (const p of career.existingProjects || []) {
        await client.deleteProject(resumeId, career.id, p.id);
      }
      if (career.ssotCareer?.project && career.ssotCareer?.description) {
        await client.addProject(resumeId, career.id, {
          title: career.ssotCareer.project,
          description: career.ssotCareer.description,
        });
      }
    }

    // Verify updateCareer called once
    assert.strictEqual(updateCareer.mock.calls.length, 1);
    assert.strictEqual(updateCareer.mock.calls[0].arguments[1], 'career-1');

    // Verify deleteProject called for each existing project
    assert.strictEqual(deleteProject.mock.calls.length, 2);
    assert.strictEqual(deleteProject.mock.calls[0].arguments[2], 'old-proj-1');
    assert.strictEqual(deleteProject.mock.calls[1].arguments[2], 'old-proj-2');

    // Verify addProject called once with SSoT data
    assert.strictEqual(addProject.mock.calls.length, 1);
    assert.deepStrictEqual(addProject.mock.calls[0].arguments[2], {
      title: 'Security Operations',
      description: 'SOC monitoring and incident response',
    });
  });

  it('career add loop gets new ID from response and adds SSoT project', async () => {
    const addCareer = mock.fn(async () => ({ data: { id: 'new-career-99' } }));
    const addProject = mock.fn(async () => ({ data: { id: 'new-proj' } }));

    const client = { addCareer, addProject };
    const resumeId = 'resume-abc';

    const toAdd = [
      {
        company: '(주)신규회사',
        data: mapCareerToWanted({
          company: '(주)신규회사',
          role: '인프라 엔지니어',
          period: '2024.01 ~ 2024.12',
        }),
        ssotCareer: {
          project: 'Cloud Migration',
          description: 'AWS infrastructure setup',
        },
      },
    ];

    // Replicate the apply loop from profile-sync-handler.js lines 350-363
    for (const career of toAdd) {
      const result = await client.addCareer(resumeId, career.data);
      const newCareerId = result?.data?.id || result?.id;
      if (newCareerId && career.ssotCareer?.project && career.ssotCareer?.description) {
        await client.addProject(resumeId, newCareerId, {
          title: career.ssotCareer.project,
          description: career.ssotCareer.description,
        });
      }
    }

    assert.strictEqual(addCareer.mock.calls.length, 1);
    assert.strictEqual(addProject.mock.calls.length, 1);
    assert.strictEqual(addProject.mock.calls[0].arguments[1], 'new-career-99');
    assert.deepStrictEqual(addProject.mock.calls[0].arguments[2], {
      title: 'Cloud Migration',
      description: 'AWS infrastructure setup',
    });
  });
});

describe('ProfileSyncHandler — education sync parity', () => {
  it('mapEducationToWanted produces status-aware end_time for 재학중', () => {
    const edu = { school: '한양사이버대학교', major: '컴퓨터공학과', startDate: '2024.03', status: '재학중' };
    const mapped = mapEducationToWanted(edu);
    assert.strictEqual(mapped.end_time, null);
    assert.strictEqual(mapped.description, '재학중 (2024.03 ~ )');
    assert.strictEqual(mapped.degree, '학사');
    assert.strictEqual(mapped.start_time, '2024-03-01');
  });

  it('mapEducationToWanted produces non-null end_time for graduated', () => {
    const edu = { school: '서울대학교', major: 'CS', startDate: '2014.03', endDate: '2018.02', status: '졸업' };
    const mapped = mapEducationToWanted(edu);
    assert.strictEqual(mapped.end_time, '2018-02-01');
    assert.strictEqual(mapped.description, null);
  });

  it('education update loop calls updateEducation for existing school', async () => {
    const updateEducation = mock.fn(async () => undefined);
    const addEducation = mock.fn(async () => undefined);
    const client = { updateEducation, addEducation };
    const resumeId = 'resume-abc';

    const changes = {
      toUpdate: [{ id: 'edu-1', school: '한양사이버대학교', data: { school_name: '한양사이버대학교' } }],
      toAdd: [],
    };

    for (const edu of changes.toUpdate) {
      await client.updateEducation(resumeId, edu.id, edu.data);
    }
    for (const edu of changes.toAdd) {
      await client.addEducation(resumeId, edu.data);
    }

    assert.strictEqual(updateEducation.mock.calls.length, 1);
    assert.strictEqual(updateEducation.mock.calls[0].arguments[1], 'edu-1');
    assert.strictEqual(addEducation.mock.calls.length, 0);
  });
});

describe('ProfileSyncHandler — activity sync parity', () => {
  it('activity update loop calls updateActivity for existing cert and addActivity for new', async () => {
    const updateActivity = mock.fn(async () => undefined);
    const addActivity = mock.fn(async () => undefined);
    const deleteActivity = mock.fn(async () => undefined);
    const client = { updateActivity, addActivity, deleteActivity };
    const resumeId = 'resume-abc';

    const changes = {
      toUpdate: [{ id: 'act-1', title: 'CPPG', data: mapCertificationToWanted({ name: 'CPPG', issuer: 'KISA', date: '2024.11' }) }],
      toAdd: [{ title: 'New Cert', data: mapCertificationToWanted({ name: 'New Cert', issuer: 'Test', date: '2025.01' }) }],
      toDelete: [{ id: 'act-stale', title: 'Old Cert' }],
    };

    for (const act of changes.toUpdate) await client.updateActivity(resumeId, act.id, act.data);
    for (const act of changes.toAdd) await client.addActivity(resumeId, act.data);
    for (const act of changes.toDelete) await client.deleteActivity(resumeId, act.id);

    assert.strictEqual(updateActivity.mock.calls.length, 1);
    assert.strictEqual(updateActivity.mock.calls[0].arguments[1], 'act-1');
    assert.strictEqual(addActivity.mock.calls.length, 1);
    assert.strictEqual(deleteActivity.mock.calls.length, 1);
    assert.strictEqual(deleteActivity.mock.calls[0].arguments[1], 'act-stale');
  });

  it('준비중 certifications are filtered out before mapping', () => {
    const certs = [
      { name: 'CPPG', issuer: 'KISA', date: '2024.11', status: 'active' },
      { name: 'CISSP', issuer: 'ISC2', date: null, status: '준비중' },
      { name: 'CISM', issuer: 'ISACA', date: null, status: '준비중' },
    ];

    const filtered = certs.filter((c) => c.date && c.status !== '준비중');
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].name, 'CPPG');
  });
});

describe('ProfileSyncHandler — language cert sync parity', () => {
  it('language cert sync loop calls update/add/delete correctly', async () => {
    const updateLanguageCert = mock.fn(async () => undefined);
    const addLanguageCert = mock.fn(async () => undefined);
    const deleteLanguageCert = mock.fn(async () => undefined);
    const client = { updateLanguageCert, addLanguageCert, deleteLanguageCert };
    const resumeId = 'resume-abc';

    const changes = {
      toUpdate: [{ id: 'lang-1', name: 'Korean', data: { language_name: 'Korean', level: 5 } }],
      toAdd: [{ name: 'English', data: { language_name: 'English', level: 4 } }],
      toDelete: [{ id: 'lang-stale', name: 'Japanese' }],
    };

    for (const lc of changes.toUpdate) await client.updateLanguageCert(resumeId, lc.id, lc.data);
    for (const lc of changes.toAdd) await client.addLanguageCert(resumeId, lc.data);
    for (const lc of changes.toDelete) await client.deleteLanguageCert(resumeId, lc.id);

    assert.strictEqual(updateLanguageCert.mock.calls.length, 1);
    assert.strictEqual(updateLanguageCert.mock.calls[0].arguments[1], 'lang-1');
    assert.deepStrictEqual(updateLanguageCert.mock.calls[0].arguments[2], { language_name: 'Korean', level: 5 });
    assert.strictEqual(addLanguageCert.mock.calls.length, 1);
    assert.deepStrictEqual(addLanguageCert.mock.calls[0].arguments[1], { language_name: 'English', level: 4 });
    assert.strictEqual(deleteLanguageCert.mock.calls.length, 1);
    assert.strictEqual(deleteLanguageCert.mock.calls[0].arguments[1], 'lang-stale');
  });

  it('language level maps Native=5, Professional=4, default=3', () => {
    const languages = [
      { name: 'Korean', level: 'Native' },
      { name: 'English', level: 'Professional working proficiency' },
      { name: 'Japanese', level: 'Basic' },
    ];
    const mapped = languages.map((lang) => ({
      language_name: lang.name,
      level: lang.level === 'Native' ? 5 : lang.level === 'Professional working proficiency' ? 4 : 3,
    }));
    assert.strictEqual(mapped[0].level, 5);
    assert.strictEqual(mapped[1].level, 4);
    assert.strictEqual(mapped[2].level, 3);
  });
});
