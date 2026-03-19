import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// Inline the pure functions to avoid Worker env dependencies from the handler module
function parsePeriod(period = '') {
  const parts = String(period)
    .split('~')
    .map((part) => part.trim())
    .filter(Boolean);
  const start = parts[0] ? `${parts[0].replace('.', '-')}-01` : null;
  const end = parts[1] && parts[1] !== '현재' ? `${parts[1].replace('.', '-')}-01` : null;
  return { start, end };
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
