const makeStatement = (handler) => ({ bind: (...params) => handler(...params) });

function createMockDb({ alreadyApplied = false } = {}) {
  const recorded = [];
  const seenApplications = new Set();
  return {
    recorded,
    prepare(query) {
      if (query.includes('SELECT key, value FROM config')) {
        return makeStatement(() => ({
          all: async () => ({
            results: [
              { key: 'auto_apply_enabled', value: 'true' },
              { key: 'max_daily_applications', value: '5' },
              { key: 'min_match_score', value: '1' },
              { key: 'auto_apply_keywords', value: JSON.stringify(['DevOps']) },
            ],
          }),
        }));
      }
      if (query.includes('COUNT(*) as count')) {
        return makeStatement(() => ({ first: async () => ({ count: 0 }) }));
      }
      if (query.includes('SELECT id FROM applications')) {
        return makeStatement((jobId, source) => ({
          first: async () => {
            const id = `${source}_${jobId}`;
            return alreadyApplied || seenApplications.has(id) ? { id } : null;
          },
        }));
      }
      if (query.includes('INSERT INTO applications')) {
        return makeStatement((...params) => ({
          run: async () => {
            recorded.push(params);
            seenApplications.add(params[0]);
          },
        }));
      }
      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

function createClients(job) {
  const applyCalls = [];
  return {
    applyCalls,
    wanted: {
      setCookies: jest.fn(),
      searchJobs: jest.fn(async () => ({ jobs: [job] })),
      apply: jest.fn(async (jobId) => {
        applyCalls.push(jobId);
        return { success: true };
      }),
    },
    linkedin: { searchJobs: jest.fn(async () => ({ jobs: [] })) },
    remember: { searchJobs: jest.fn(async () => ({ jobs: [] })) },
    greenhouse: createAtsClient('greenhouse'),
    lever: createAtsClient('lever'),
    ashby: createAtsClient('ashby'),
  };
}

const createRequest = (body) => ({ json: async () => body });
const parseJson = async (response) => JSON.parse(await response.text());

function makeJob(overrides = {}) {
  return {
    id: 'job-1',
    sourceId: 'job-1',
    source: 'wanted',
    position: 'DevOps Engineer',
    company: 'Trace Co',
    sourceUrl: 'https://wanted.co.kr/wd/job-1',
    ...overrides,
  };
}

function makeApprovedJob(overrides = {}) {
  return makeJob({
    approvalId: 'approval-job-1',
    humanApproval: { status: 'approved', destination: 'wanted' },
    ...overrides,
  });
}

function makeRealSubmitBody(job = makeApprovedJob(), overrides = {}) {
  return {
    dryRun: false,
    approvalId: job.approvalId || 'approval-job-1',
    explicitSubmit: true,
    submitOptIn: true,
    candidates: [job],
    ...overrides,
  };
}

function makeApprovalIdOnlyBody(job = makeJob()) {
  const approvalId = job.approvalId || 'approval-job-1';
  return makeRealSubmitBody({ ...job, approvalId }, { approvalId });
}

function createAtsClient(source) {
  return {
    searchJobs: jest.fn(async (keyword) => ({
      jobs: [
        {
          id: `${source}-ats-stub-${keyword}`,
          sourceId: `${source}-ats-stub-${keyword}`,
          source,
          position: `${keyword} Engineer`,
          company: `${source} ATS Stub`,
          sourceUrl: `https://example.invalid/${source}/jobs/${keyword}`,
          atsStub: true,
          matchScore: 100,
        },
      ],
    })),
  };
}

module.exports = {
  createClients,
  createMockDb,
  createRequest,
  makeApprovalIdOnlyBody,
  makeApprovedJob,
  makeJob,
  makeRealSubmitBody,
  parseJson,
};
