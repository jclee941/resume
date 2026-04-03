import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register(new URL('./auto-apply-test-loader.mjs', import.meta.url), import.meta.url);

const [
  { AutoApplier },
  { AutoApplyScheduler },
  { JobFilter },
  { CoverLetterService },
  { ApprovalWorkflowManager },
  { RetryService, CircuitState },
  { ApplicationTrackerService },
  { ApplicationRepository },
  { TelegramNotificationAdapter },
] = await Promise.all([
  import('../auto-applier.js'),
  import('../scheduler.js'),
  import('../../shared/services/apply/job-filter.js'),
  import('../../shared/services/apply/cover-letter-service.js'),
  import('../../shared/services/apply/approval-manager.js'),
  import('../../shared/services/apply/retry-service.js'),
  import('../../shared/services/apply/application-tracker.js'),
  import('../../shared/repositories/application-repository.js'),
  import('../../shared/services/notifications/telegram-adapter.js'),
]);

const mockJobs = [
  { id: '1', company: 'Toss', position: 'DevOps Engineer', matchScore: 85, source: 'wanted' },
  { id: '2', company: 'Kakao', position: 'SRE', matchScore: 65, source: 'wanted' },
  { id: '3', company: 'Naver', position: 'Junior Dev', matchScore: 45, source: 'wanted' },
];

function createLogger() {
  return {
    info: mock.fn(() => {}),
    warn: mock.fn(() => {}),
    error: mock.fn(() => {}),
    debug: mock.fn(() => {}),
    log: mock.fn(() => {}),
  };
}

function createMockRepository() {
  const apps = new Map();
  const timeline = [];

  return {
    d1Client: { query: mock.fn(async () => []) },
    create: mock.fn(async (data) => {
      const id = data.id || `app-${data.job_id || apps.size + 1}`;
      const row = {
        id,
        job_id: data.job_id,
        source: data.source,
        source_url: data.source_url || null,
        position: data.position,
        company: data.company,
        location: data.location || null,
        match_score: data.match_score || 0,
        status: data.status || 'discovered',
        priority: data.priority || 'medium',
        cover_letter: data.cover_letter || null,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      apps.set(id, row);
      timeline.push({
        application_id: id,
        status: row.status,
        previous_status: null,
        note: 'created',
      });
      return { ...row };
    }),
    findById: mock.fn(async (id) => {
      const row = apps.get(id);
      return row ? { ...row } : null;
    }),
    findByJobId: mock.fn(async (jobId) =>
      [...apps.values()]
        .filter((row) => String(row.job_id) === String(jobId))
        .map((row) => ({ ...row }))
    ),
    update: mock.fn(async (id, patch) => {
      const row = apps.get(id);
      if (!row) return null;
      Object.assign(row, patch, { updated_at: new Date().toISOString() });
      return { ...row };
    }),
    updateStatus: mock.fn(async (id, status, note = '') => {
      const row = apps.get(id);
      if (!row) return null;
      const previous = row.status;
      row.status = status;
      row.updated_at = new Date().toISOString();
      if (note) row.notes = note;
      timeline.push({ application_id: id, status, previous_status: previous, note });
      return { ...row };
    }),
    findTodayApplications: mock.fn(async () => [...apps.values()].map((row) => ({ ...row }))),
    getStats: mock.fn(async () => {
      const rows = [...apps.values()];
      return {
        total: rows.length,
        today: rows.length,
        pendingApprovals: rows.filter(
          (r) => r.status === 'pending' && r.match_score >= 60 && r.match_score <= 74
        ).length,
        averageMatchScore: rows.length
          ? rows.reduce((acc, row) => acc + Number(row.match_score || 0), 0) / rows.length
          : 0,
        byStatus: rows.reduce((acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        }, {}),
        bySource: rows.reduce((acc, row) => {
          acc[row.source] = (acc[row.source] || 0) + 1;
          return acc;
        }, {}),
      };
    }),
    __apps: apps,
    __timeline: timeline,
  };
}

class InMemoryD1Client {
  constructor() {
    this.applications = [];
    this.timeline = [];
    this.approvalRequests = [];
  }

  async query(sql, params = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    if (normalized.startsWith('insert into applications')) {
      const row = {
        id: params[0],
        job_id: params[1],
        source: params[2],
        source_url: params[3],
        position: params[4],
        company: params[5],
        location: params[6],
        match_score: params[7],
        status: params[8],
        priority: params[9],
        resume_id: params[10],
        cover_letter: params[11],
        notes: params[12],
        created_at: params[13],
        updated_at: params[14],
        applied_at: params[15],
        workflow_id: params[16],
        approved_at: params[17],
        rejected_at: params[18],
      };
      this.applications.push(row);
      return [];
    }

    if (normalized.startsWith('insert into application_timeline')) {
      this.timeline.push({
        id: this.timeline.length + 1,
        application_id: params[0],
        status: params[1],
        previous_status: params[2],
        note: params[3],
        timestamp: params[4],
      });
      return [];
    }

    if (normalized.includes('select * from applications where id = ? limit 1')) {
      const row = this.applications.find((a) => a.id === params[0]);
      return row ? [{ ...row }] : [];
    }

    if (
      normalized.includes('select * from applications where job_id = ? order by created_at desc')
    ) {
      return this.applications
        .filter((a) => String(a.job_id) === String(params[0]))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map((row) => ({ ...row }));
    }

    if (normalized.startsWith('update applications set status = ?, updated_at = ?')) {
      const id = params[params.length - 1];
      const row = this.applications.find((a) => a.id === id);
      if (!row) return [];
      row.status = params[0];
      row.updated_at = params[1];
      if (normalized.includes('approved_at = ?')) row.approved_at = params[2];
      if (normalized.includes('rejected_at = ?')) row.rejected_at = params[2];
      if (normalized.includes('applied_at = ?') && !row.applied_at) row.applied_at = params[2];
      return [];
    }

    if (normalized.startsWith('update applications set') && normalized.includes('where id = ?')) {
      const id = params[params.length - 1];
      const row = this.applications.find((a) => a.id === id);
      if (!row) return [];
      const setPart = sql.split('SET')[1].split('WHERE')[0];
      const fields = setPart
        .split(',')
        .map((f) => f.trim().split('=')[0].trim())
        .filter(Boolean);
      for (let i = 0; i < fields.length; i += 1) {
        row[fields[i]] = params[i];
      }
      return [];
    }

    if (normalized.includes("select * from applications where date(created_at) = date('now')")) {
      return this.applications.map((row) => ({ ...row }));
    }

    if (
      normalized.includes('select count(*) as total') &&
      normalized.includes('from applications')
    ) {
      const total = this.applications.length;
      const today = this.applications.length;
      const pendingApprovals = this.applications.filter(
        (a) => a.status === 'pending' && Number(a.match_score) >= 60 && Number(a.match_score) <= 74
      ).length;
      const averageMatchScore =
        total === 0
          ? 0
          : this.applications.reduce((acc, row) => acc + Number(row.match_score || 0), 0) / total;
      return [{ total, today, pendingApprovals, averageMatchScore }];
    }

    if (normalized.includes('select status, count(*) as count from applications group by status')) {
      const grouped = this.applications.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(grouped).map(([status, count]) => ({ status, count }));
    }

    if (normalized.includes('select source, count(*) as count from applications group by source')) {
      const grouped = this.applications.reduce((acc, row) => {
        acc[row.source] = (acc[row.source] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(grouped).map(([source, count]) => ({ source, count }));
    }

    if (
      normalized.includes('from application_timeline') &&
      normalized.includes('where application_id = ?')
    ) {
      return this.timeline
        .filter((row) => row.application_id === params[0])
        .map((row) => ({ ...row }))
        .sort((a, b) => a.id - b.id);
    }

    if (normalized.includes('select cover_letter') && normalized.includes('from applications')) {
      const row = this.applications.find(
        (a) => String(a.job_id) === String(params[0]) && String(a.cover_letter || '').trim() !== ''
      );
      return row ? [{ cover_letter: row.cover_letter }] : [];
    }

    if (normalized.includes('set cover_letter = ?') && normalized.includes('where job_id = ?')) {
      for (const row of this.applications) {
        if (String(row.job_id) === String(params[1])) {
          row.cover_letter = params[0];
          row.updated_at = new Date().toISOString();
        }
      }
      return [];
    }

    if (normalized.startsWith('insert into approval_requests')) {
      const existing = this.approvalRequests.find((r) => r.id === params[0]);
      const next = {
        id: params[0],
        workflow_id: params[1],
        job_id: params[2],
        job_title: params[3],
        company: params[4],
        platform: params[5],
        match_score: params[6],
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        notes: params[7],
        created_at: params[8],
        updated_at: params[9],
      };

      if (existing) {
        Object.assign(existing, next);
      } else {
        this.approvalRequests.push(next);
      }
      return [];
    }

    if (normalized.includes('select * from approval_requests where id = ? limit 1')) {
      const row = this.approvalRequests.find((r) => r.id === params[0]);
      return row ? [{ ...row }] : [];
    }

    if (normalized.startsWith('update approval_requests set')) {
      const id = params[params.length - 1];
      const row = this.approvalRequests.find((r) => r.id === id);
      if (!row) return [];
      const setPart = sql.split('SET')[1].split('WHERE')[0];
      const fields = setPart
        .split(',')
        .map((f) => f.trim().split('=')[0].trim())
        .filter(Boolean);
      for (let i = 0; i < fields.length; i += 1) {
        row[fields[i]] = params[i];
      }
      return [];
    }

    if (normalized.includes('from approval_requests ar')) {
      return this.approvalRequests
        .filter((r) => r.status === 'pending')
        .map((r) => {
          const app = this.applications.find((a) => a.id === r.id);
          return {
            ...r,
            application_status: app?.status || null,
            position: app?.position || null,
            application_company: app?.company || null,
            application_source: app?.source || null,
          };
        });
    }

    throw new Error(`Unhandled query in InMemoryD1Client: ${normalized}`);
  }
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mock.restoreAll();
  globalThis.__jobFilterMatchJobsWithAI = mock.fn(async () => ({ jobs: [], fallback: false }));
});

describe('1) Full Workflow E2E', () => {
  it('executes search → filter → score → cover-letter → approval/submit → tracking', async () => {
    const logger = createLogger();
    const repository = createMockRepository();

    const tracker = {
      recordSearch: mock.fn(async () => ({ tracked: 3, duplicates: 0 })),
      startTracking: mock.fn(async (job, score) => ({
        id: `app-${job.id}`,
        job_id: job.id,
        company: job.company,
        position: job.position,
        match_score: score,
      })),
      recordScoring: mock.fn(async () => {}),
      recordCoverLetter: mock.fn(async () => {}),
      recordApprovalRequest: mock.fn(async () => {}),
      recordApproval: mock.fn(async () => {}),
      recordSubmission: mock.fn(async () => {}),
      recordCompletion: mock.fn(async () => {}),
    };

    const coverLetterService = {
      generateForJob: mock.fn(async (job) => ({
        coverLetter: `Cover for ${job.company}/${job.position}`,
        cached: false,
      })),
    };

    const approvalManager = {
      requestApproval: mock.fn(async () => ({ status: 'pending' })),
      checkApprovalStatus: mock.fn(async (applicationId) =>
        applicationId === 'app-2'
          ? { status: 'approved', reviewedBy: 'reviewer' }
          : { status: 'approved' }
      ),
    };

    const notificationAdapter = {
      sendApplicationSuccess: mock.fn(async () => ({ sent: true })),
      sendApplicationFailed: mock.fn(async () => ({ sent: true })),
    };

    const autoApplier = new AutoApplier({
      logger,
      repository,
      tracker,
      coverLetterService,
      approvalManager,
      notificationAdapter,
      autoApply: true,
      dryRun: false,
      delayBetweenApps: 0,
      maxDailyApplications: 10,
    });

    autoApplier.crawler = {
      searchWithMatching: mock.fn(async () => ({
        success: true,
        totalJobs: mockJobs.length,
        jobs: mockJobs,
        sourceStats: { wanted: { success: true, count: 3 } },
      })),
    };
    autoApplier.jobFilter = {
      filter: mock.fn(async () => ({
        jobs: mockJobs.map((job) => ({ ...job, matchType: 'hybrid' })),
        stats: { input: 3, afterDedup: 3, afterFilter: 3, output: 3, matchType: 'hybrid' },
      })),
    };
    autoApplier.appManager = { isDuplicate: () => false };
    autoApplier.initBrowser = mock.fn(async () => {});
    autoApplier.closeBrowser = mock.fn(async () => {});
    autoApplier.applyToJob = mock.fn(async () => ({
      success: true,
      applicationId: `wanted-${Date.now()}`,
    }));

    const runResult = await autoApplier.run({ keywords: ['DevOps'], maxApplications: 3 });

    assert.equal(runResult.success, true);
    assert.equal(runResult.results.searched, 3);
    assert.equal(runResult.results.applied, 2);
    assert.equal(runResult.results.skipped, 1);
    assert.equal(runResult.results.failed, 0);
    assert.equal(runResult.results.stages.search, 3);
    assert.equal(runResult.results.stages.filterScore, 3);
    assert.equal(runResult.results.stages.generateCoverLetter, 2);
    assert.equal(runResult.results.stages.checkApproval, 3);
    assert.equal(runResult.results.stages.submit, 2);
    assert.equal(runResult.results.stages.track, 3);
    assert.equal(tracker.startTracking.mock.calls.length, 3);
    assert.equal(notificationAdapter.sendApplicationSuccess.mock.calls.length, 2);
  });
});

describe('2) Job Filtering & Scoring', () => {
  it('routes jobs by score tier (<60 skip, 60-74 approval, >=75 auto-apply)', async () => {
    const autoApplier = new AutoApplier({
      repository: createMockRepository(),
      tracker: {},
      coverLetterService: {},
      approvalManager: {},
      notificationAdapter: {},
      retryService: new RetryService({ retry: { maxRetries: 0, jitter: false } }),
      dryRun: true,
      autoApply: false,
    });

    autoApplier.appManager = { isDuplicate: () => false };
    autoApplier.repository.findByJobId = async () => [];
    autoApplier.handleApproval = mock.fn(async () => ({
      approved: false,
      status: 'rejected',
      reason: 'manual reject',
    }));

    const low = await autoApplier.shouldApply({ id: 'low', matchScore: 45, source: 'wanted' });
    const mid = await autoApplier.shouldApply({ id: 'mid', matchScore: 65, source: 'wanted' });
    const high = await autoApplier.shouldApply({ id: 'high', matchScore: 85, source: 'wanted' });

    assert.equal(low.apply, false);
    assert.equal(low.status, 'skip');
    assert.equal(mid.apply, false);
    assert.equal(mid.status, 'rejected');
    assert.equal(high.apply, true);
    assert.equal(high.status, 'can_apply');
  });

  it('integrates AI scoring with cache reuse', async () => {
    const aiMatcher = mock.fn(async (_resumePath, jobs) => ({
      jobs: jobs.map((job, idx) => ({ ...job, matchScore: 90 - idx * 10, confidence: 0.95 })),
      fallback: false,
    }));
    globalThis.__jobFilterMatchJobsWithAI = aiMatcher;

    const filter = new JobFilter({ reviewThreshold: 0, autoApplyThreshold: 0, aiCacheTtl: 24 });

    const first = await filter.filter(mockJobs, new Set(), {
      useAI: true,
      resumePath: '/tmp/resume.json',
    });
    const second = await filter.filter(mockJobs, new Set(), {
      useAI: true,
      resumePath: '/tmp/resume.json',
    });

    assert.equal(first.jobs.length, 3);
    assert.equal(second.jobs.length, 3);
    assert.equal(aiMatcher.mock.calls.length, 1);
    assert.ok(second.jobs.every((job) => ['hybrid', 'heuristic'].includes(job.matchType)));
    assert.ok(filter.getScoringStats().cacheHits > 0);
  });

  it('applies keyword and company filtering', async () => {
    const filter = new JobFilter({
      excludeCompanies: ['Naver'],
      excludeKeywords: ['Junior'],
      reviewThreshold: 0,
      autoApplyThreshold: 0,
    });

    const result = await filter.filter(mockJobs, new Set(), { useAI: false });
    assert.equal(result.jobs.length, 2);
    assert.deepEqual(result.jobs.map((job) => job.company).sort(), ['Kakao', 'Toss']);
  });
});

describe('3) Cover Letter', () => {
  it('generates Korean/English cover letters and caches by job ID', async () => {
    const generator = mock.fn(async (_resume, job, options) => ({
      coverLetter: `${options.language.toUpperCase()}:${job.position}`,
      fallback: false,
    }));

    const service = new CoverLetterService({
      generator,
      resumeData: { profile: { name: 'test' } },
    });

    const ko = await service.generateForJob({
      id: 'ko-1',
      company: '토스',
      position: '데브옵스 엔지니어',
    });
    const en = await service.generateForJob({
      id: 'en-1',
      company: 'Kakao',
      position: 'Site Reliability Engineer',
    });
    const koCached = await service.generateForJob({
      id: 'ko-1',
      company: '토스',
      position: '데브옵스 엔지니어',
    });

    assert.equal(ko.language, 'ko');
    assert.equal(en.language, 'en');
    assert.equal(koCached.cached, true);
    assert.equal(generator.mock.calls.length, 2);
  });

  it('returns template fallback payload when AI path degrades', async () => {
    const service = new CoverLetterService({
      generator: mock.fn(async () => ({
        coverLetter: '[TEMPLATE] fallback letter',
        fallback: true,
      })),
      resumeData: { profile: { name: 'test' } },
    });

    const result = await service.generateForJob(
      { id: 'fb-1', company: 'Acme', position: 'DevOps Engineer' },
      { useAI: false }
    );

    assert.equal(result.fallback, true);
    assert.match(result.coverLetter, /TEMPLATE/);
  });
});

describe('4) Approval Workflow', () => {
  it('creates approval request and sends Telegram buttons for 60-74 scores', async () => {
    const d1 = new InMemoryD1Client();
    const repository = new ApplicationRepository(d1);
    await repository.create({
      id: 'app-approval',
      job_id: '2',
      source: 'wanted',
      source_url: null,
      position: 'SRE',
      company: 'Kakao',
      location: 'Seoul',
      match_score: 65,
      status: 'discovered',
      priority: 'medium',
    });

    const fetchCalls = [];
    globalThis.fetch = mock.fn(async (_url, options) => {
      fetchCalls.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    });

    const adapter = new TelegramNotificationAdapter({
      logger: createLogger(),
      telegramToken: 'token',
      telegramChatId: 'chat-id',
      d1Client: d1,
    });

    const manager = new ApprovalWorkflowManager({
      applicationRepository: repository,
      notificationAdapter: adapter,
      logger: createLogger(),
      config: { approvalTimeoutHours: 24 },
    });

    const request = await manager.requestApproval(
      {
        applicationId: 'app-approval',
        id: '2',
        company: 'Kakao',
        position: 'SRE',
        source: 'wanted',
      },
      65
    );

    assert.equal(request.status, 'pending');
    assert.ok(
      fetchCalls[0].reply_markup.inline_keyboard[0][0].callback_data.startsWith('approve:')
    );
    assert.ok(fetchCalls[0].reply_markup.inline_keyboard[0][1].callback_data.startsWith('reject:'));
  });

  it('handles approve/reject actions and timeout auto-reject', async () => {
    const d1 = new InMemoryD1Client();
    const repository = new ApplicationRepository(d1);
    await repository.create({
      id: 'app-timeout',
      job_id: '22',
      source: 'wanted',
      position: 'SRE',
      company: 'Kakao',
      match_score: 65,
      status: 'pending',
      priority: 'medium',
    });

    const adapter = { sendApprovalRequest: mock.fn(async () => ({ sent: true })) };
    const manager = new ApprovalWorkflowManager({
      applicationRepository: repository,
      notificationAdapter: adapter,
      logger: createLogger(),
      config: { approvalTimeoutHours: 0, reminderIntervalHours: 1, maxReminders: 1 },
    });

    await manager.requestApproval({ applicationId: 'app-timeout', id: '22' }, 65);
    await manager.approve('app-timeout', 'alice');
    let status = await manager.checkApprovalStatus('app-timeout');
    assert.equal(status.status, 'approved');

    await repository.updateStatus('app-timeout', 'pending', 'reset for reject path');
    await manager.requestApproval({ applicationId: 'app-timeout', id: '22' }, 65);
    await manager.reject('app-timeout', 'bob', 'not aligned');
    status = await manager.checkApprovalStatus('app-timeout');
    assert.equal(status.status, 'rejected');

    await repository.updateStatus('app-timeout', 'pending', 'reset for timeout path');
    await manager.requestApproval({ applicationId: 'app-timeout', id: '22' }, 65);
    const summary = await manager.processTimeouts();
    status = await manager.checkApprovalStatus('app-timeout');

    assert.ok(summary.timedOut >= 1);
    assert.equal(status.status, 'timeout');
  });
});

describe('5) Application Submission', () => {
  it('submits via wanted path with retry success', async () => {
    const retryService = new RetryService({
      retry: { maxRetries: 1, baseDelay: 1, maxDelay: 1, jitter: false, retryableErrors: [503] },
      circuit: { failureThreshold: 5, resetTimeout: 1000, halfOpenMaxCalls: 1 },
    });

    const autoApplier = new AutoApplier({
      repository: createMockRepository(),
      retryService,
      tracker: {},
      coverLetterService: {},
      approvalManager: {},
      notificationAdapter: {},
    });

    let attempts = 0;
    autoApplier.applyToJob = mock.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error('wanted api unavailable');
        error.status = 503;
        throw error;
      }
      return { success: true, applicationId: 'wanted-123' };
    });

    const result = await autoApplier.submitApplication({ source: 'wanted' });
    assert.equal(result.success, true);
    assert.equal(attempts, 2);
  });

  it('enforces run-level delay between applications (rate-limiting compliance)', async () => {
    const autoApplier = new AutoApplier({
      repository: createMockRepository(),
      tracker: {},
      coverLetterService: {},
      approvalManager: {},
      notificationAdapter: {},
      autoApply: true,
      dryRun: false,
      delayBetweenApps: 123,
    });

    autoApplier.crawler = {
      searchWithMatching: mock.fn(async () => ({
        success: true,
        totalJobs: 2,
        jobs: mockJobs.slice(0, 2),
        sourceStats: {},
      })),
    };
    autoApplier.jobFilter = {
      filter: mock.fn(async () => ({ jobs: mockJobs.slice(0, 2), stats: { input: 2, output: 2 } })),
    };
    autoApplier.tracker = { recordSearch: mock.fn(async () => {}) };
    autoApplier.processJob = mock.fn(async () => ({
      success: true,
      applied: true,
      status: 'submitted',
      stages: { generateCoverLetter: true, checkApproval: true, submit: true, track: true },
    }));
    autoApplier.sleep = mock.fn(async () => {});

    const result = await autoApplier.run({ maxApplications: 2 });

    assert.equal(result.success, true);
    assert.equal(autoApplier.sleep.mock.calls.length, 2);
    assert.equal(autoApplier.sleep.mock.calls[0].arguments[0], 123);
  });

  it('persists failure status when submission fails', async () => {
    const repository = createMockRepository();
    const tracker = {
      startTracking: mock.fn(async (job, score) => {
        await repository.create({
          id: `app-${job.id}`,
          job_id: job.id,
          source: job.source,
          position: job.position,
          company: job.company,
          match_score: score,
          status: 'discovered',
          priority: 'medium',
        });
        return { id: `app-${job.id}`, job_id: job.id };
      }),
      recordScoring: mock.fn(async () => {}),
      recordCoverLetter: mock.fn(async () => {}),
      recordCompletion: mock.fn(async () => {}),
      recordApprovalRequest: mock.fn(async () => {}),
      recordApproval: mock.fn(async () => {}),
      recordSubmission: mock.fn(async () => {}),
    };

    const autoApplier = new AutoApplier({
      repository,
      tracker,
      coverLetterService: {
        generateForJob: mock.fn(async () => ({ coverLetter: 'x', cached: false })),
      },
      approvalManager: {
        requestApproval: mock.fn(async () => ({})),
        checkApprovalStatus: mock.fn(async () => ({ status: 'approved' })),
      },
      notificationAdapter: { sendApplicationFailed: mock.fn(async () => ({ sent: true })) },
      autoApply: true,
      dryRun: false,
    });

    autoApplier.appManager = { isDuplicate: () => false };
    autoApplier.submitApplication = mock.fn(async () => ({
      success: false,
      error: 'wanted api down',
    }));

    const result = await autoApplier.processJob(mockJobs[0], { ensureBrowser: async () => {} });

    assert.equal(result.success, false);
    assert.equal(result.status, 'failed');
    const app = await repository.findById('app-1');
    assert.equal(app.status, 'failed');
  });
});

describe('6) Error Handling', () => {
  it('opens circuit breaker after failure threshold', async () => {
    const retry = new RetryService({
      retry: { maxRetries: 0, jitter: false },
      circuit: { failureThreshold: 2, resetTimeout: 100000, halfOpenMaxCalls: 1 },
    });

    const op = async () => {
      const error = new Error('service down');
      error.status = 503;
      throw error;
    };

    await assert.rejects(retry.execute(op, { serviceName: 'wanted-api' }));
    await assert.rejects(retry.execute(op, { serviceName: 'wanted-api' }));
    await assert.rejects(retry.execute(op, { serviceName: 'wanted-api' }), /circuit is open/i);

    const state = retry.getCircuitState('wanted-api');
    assert.equal(state.state, CircuitState.OPEN);
  });

  it('exhausts retries and degrades AI scoring to heuristic', async () => {
    const retry = new RetryService({
      retry: { maxRetries: 2, baseDelay: 1, maxDelay: 1, jitter: false, retryableErrors: [503] },
      circuit: { failureThreshold: 10, resetTimeout: 1000, halfOpenMaxCalls: 1 },
    });

    let calls = 0;
    await assert.rejects(
      retry.execute(
        async () => {
          calls += 1;
          const error = new Error('still failing');
          error.status = 503;
          throw error;
        },
        { serviceName: 'flaky' }
      )
    );
    assert.equal(calls, 3);

    globalThis.__jobFilterMatchJobsWithAI = mock.fn(async () => {
      throw new Error('ai service degraded');
    });
    const filter = new JobFilter({ reviewThreshold: 0, autoApplyThreshold: 0 });
    const scored = await filter.filter(mockJobs.slice(0, 2), new Set(), {
      useAI: true,
      resumePath: '/tmp/resume.json',
    });
    assert.ok(scored.jobs.every((job) => job.matchType === 'heuristic'));
  });
});

describe('7) Notification Integration', () => {
  it('sends approval/success/failure/daily summary Telegram notifications', async () => {
    const fetchBodies = [];
    globalThis.fetch = mock.fn(async (_url, options) => {
      fetchBodies.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    });

    const adapter = new TelegramNotificationAdapter({
      logger: createLogger(),
      telegramToken: 'token',
      telegramChatId: 'chat',
    });

    await adapter.sendApprovalRequest(mockJobs[1], 65, 'app-2');
    await adapter.sendApplicationSuccess(mockJobs[0], 'app-1', 'wanted');
    await adapter.sendApplicationFailed(
      mockJobs[0],
      'app-1',
      new Error('submission error'),
      'wanted'
    );
    await adapter.sendDailySummary({
      date: '2026-03-31',
      total: 3,
      applied: 2,
      pending: 1,
      failed: 0,
    });

    assert.equal(fetchBodies.length, 4);
    assert.ok(fetchBodies[0].reply_markup.inline_keyboard.length > 0);
    assert.match(fetchBodies[1].text, /Application Submitted Successfully/);
    assert.match(fetchBodies[2].text, /Application Failed/);
    assert.match(fetchBodies[3].text, /Daily Application Summary/);
  });
});

describe('8) D1 Persistence Integrity', () => {
  it('creates application records, tracks transitions, timeline, and stats integrity', async () => {
    const d1 = new InMemoryD1Client();
    const repository = new ApplicationRepository(d1);
    const coverLetterService = new CoverLetterService({
      resumeData: { profile: { name: 'tester' } },
      generator: mock.fn(async () => ({ coverLetter: 'Persisted cover letter', fallback: false })),
      d1Client: d1,
    });
    const tracker = new ApplicationTrackerService({
      applicationRepository: repository,
      coverLetterService,
      logger: createLogger(),
    });

    const app = await tracker.startTracking(mockJobs[0], 85);
    await tracker.recordScoring(app.id, 88, 'hybrid');
    await tracker.recordCoverLetter(app.id, { coverLetter: 'Persisted cover letter' });
    await tracker.recordCompletion(app.id, 'completed', 'All done');

    const loaded = await tracker.getApplication(app.id);
    const stats = await repository.getStats();

    assert.equal(loaded.status, 'completed');
    assert.equal(loaded.timeline.length >= 4, true);
    assert.equal(loaded.timeline[0].status, 'discovered');
    assert.equal(stats.total, 1);
    assert.equal(stats.byStatus.completed, 1);
    assert.equal(stats.bySource.wanted, 1);
    assert.equal(Number(stats.averageMatchScore) >= 80, true);
  });
});

describe('9) Scheduler E2E', () => {
  it('supports daily/manual trigger, status polling, and run history', async () => {
    const notificationService = {
      notifyJobStarted: mock.fn(async () => {}),
      notifyJobCompleted: mock.fn(async () => {}),
    };
    const d1Client = {
      createAutomationRun: mock.fn(async () => ({ id: 'run-1' })),
      completeAutomationRun: mock.fn(async () => ({ success: true })),
    };

    const scheduler = new AutoApplyScheduler({
      logger: createLogger(),
      notificationService,
      d1Client,
      autoApplierFactory: () => ({
        run: async () => ({
          success: true,
          results: { searched: 3, matched: 2, applied: 1, failed: 0 },
        }),
      }),
      config: { cron: '* * * * *', enabled: true, preventOverlapping: true, timeout: 1000 },
    });

    scheduler.start();
    const statusAfterStart = scheduler.getStatus();
    assert.equal(statusAfterStart.started, true);
    assert.ok(statusAfterStart.nextRun);

    await scheduler.trigger({ source: 'manual', options: { dryRun: true } });
    await scheduler.trigger({ source: 'scheduled', options: { dryRun: false } });
    const status = scheduler.getStatus();

    assert.equal(status.stats.totalRuns, 2);
    assert.equal(status.stats.manualTriggers, 1);
    assert.equal(status.running, false);
    assert.equal(status.history.length, 2);
    scheduler.stop();
  });

  it('prevents overlapping runs when one run is already in progress', async () => {
    const deferred = createDeferred();
    const scheduler = new AutoApplyScheduler({
      logger: createLogger(),
      notificationService: {
        notifyJobStarted: mock.fn(async () => {}),
        notifyJobCompleted: mock.fn(async () => {}),
      },
      autoApplierFactory: () => ({ run: () => deferred.promise }),
      config: { preventOverlapping: true, timeout: 10000, enabled: false },
    });

    const first = scheduler.trigger({ source: 'manual', options: {} });
    const second = await scheduler.trigger({ source: 'manual', options: {} });

    assert.equal(second.skipped, true);
    assert.equal(second.reason, 'already_running');

    deferred.resolve({
      success: true,
      results: { searched: 0, matched: 0, applied: 0, failed: 0 },
    });
    await first;
  });
});
