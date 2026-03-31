describe('AutoApplier strategy methods (pre-extraction TDD)', () => {
  let AutoApplier;
  let setTimeoutSpy;
  let logSpy;
  let warnSpy;
  let errorSpy;

  beforeAll(async () => {
    ({ AutoApplier } = await import('../../../apps/job-server/src/auto-apply/auto-applier.js'));
    const { n8n } = await import('../../../apps/job-server/src/shared/services/n8n/index.js');
    n8n.notifyApplySuccess = jest.fn().mockResolvedValue({ success: true });
    n8n.notifyApplyFailed = jest.fn().mockResolvedValue({ success: true });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 0;
    });
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  test('applyToWanted succeeds when apply + submit + success message exist', async () => {
    const applyButton = { click: jest.fn().mockResolvedValue(undefined) };
    const submitButton = { click: jest.fn().mockResolvedValue(undefined) };
    const resumeOption = { click: jest.fn().mockResolvedValue(undefined) };
    const application = { id: 'wanted-1' };

    const ctx = {
      page: {
        goto: jest.fn().mockResolvedValue(undefined),
        $: jest.fn().mockImplementation((selector) => {
          if (selector === '.resume-item') return Promise.resolve(resumeOption);
          return Promise.resolve(null);
        }),
      },
      logger: { error: jest.fn() },
      appManager: {
        addApplication: jest.fn().mockReturnValue(application),
        updateStatus: jest.fn(),
      },
      findByText: jest.fn().mockImplementation((tag, text) => {
        if (text === '지원하기' && (tag === 'button' || tag === 'a'))
          return Promise.resolve(applyButton);
        if (text === '제출' && tag === 'button') return Promise.resolve(submitButton);
        return Promise.resolve(null);
      }),
      findElementWithText: jest.fn().mockImplementation((text) => {
        if (text === '지원이 완료되었습니다') return Promise.resolve({});
        return Promise.resolve(null);
      }),
    };

    const result = await AutoApplier.prototype.applyToWanted.call(ctx, {
      sourceUrl: 'https://www.wanted.co.kr/wd/1',
      company: 'Wanted',
      title: 'Platform Engineer',
    });

    expect(result.success).toBe(true);
    expect(ctx.page.goto).toHaveBeenCalled();
    expect(applyButton.click).toHaveBeenCalled();
    expect(submitButton.click).toHaveBeenCalled();
    expect(ctx.appManager.addApplication).toHaveBeenCalled();
    expect(ctx.appManager.updateStatus).toHaveBeenCalled();
  });

  test('applyToJobKorea succeeds when immediate apply flow confirms success', async () => {
    const applyButton = { click: jest.fn().mockResolvedValue(undefined) };
    const finalSubmit = { click: jest.fn().mockResolvedValue(undefined) };
    const application = { id: 'jk-1' };

    const ctx = {
      page: {
        goto: jest.fn().mockResolvedValue(undefined),
        title: jest.fn().mockResolvedValue('JobKorea Posting'),
        $: jest.fn().mockImplementation((selector) => {
          if (selector === '.btn_apply_confirm') return Promise.resolve(finalSubmit);
          return Promise.resolve(null);
        }),
      },
      logger: { info: jest.fn(), error: jest.fn() },
      appManager: {
        addApplication: jest.fn().mockReturnValue(application),
        updateStatus: jest.fn(),
      },
      findByText: jest.fn().mockImplementation((tag, text) => {
        if (text === '즉시 지원' && (tag === 'button' || tag === 'a'))
          return Promise.resolve(applyButton);
        return Promise.resolve(null);
      }),
      findElementWithText: jest.fn().mockImplementation((text) => {
        if (text === '지원이 완료') return Promise.resolve({});
        return Promise.resolve(null);
      }),
    };

    const result = await AutoApplier.prototype.applyToJobKorea.call(ctx, {
      sourceUrl: 'https://www.jobkorea.co.kr/job/1',
      company: 'JobKorea',
      title: 'DevOps Engineer',
    });

    expect(result.success).toBe(true);
    expect(applyButton.click).toHaveBeenCalled();
    expect(finalSubmit.click).toHaveBeenCalled();
    expect(ctx.appManager.addApplication).toHaveBeenCalled();
    expect(ctx.appManager.updateStatus).toHaveBeenCalled();
  });

  test('applyToSaramin returns already-applied error when duplicate is detected', async () => {
    const applyButton = { click: jest.fn().mockResolvedValue(undefined) };

    const ctx = {
      page: {
        goto: jest.fn().mockResolvedValue(undefined),
        $: jest.fn().mockResolvedValue(null),
      },
      logger: { error: jest.fn() },
      appManager: {
        addApplication: jest.fn(),
        updateStatus: jest.fn(),
      },
      findByText: jest.fn().mockImplementation((tag, text) => {
        if (text === '입사지원' && tag === 'button') return Promise.resolve(applyButton);
        return Promise.resolve(null);
      }),
      findElementWithText: jest.fn().mockImplementation((text) => {
        if (text === '이미 지원한') return Promise.resolve({});
        return Promise.resolve(null);
      }),
    };

    const result = await AutoApplier.prototype.applyToSaramin.call(ctx, {
      sourceUrl: 'https://www.saramin.co.kr/job/1',
      company: 'Saramin',
      title: 'SRE',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Already applied');
    expect(ctx.appManager.addApplication).not.toHaveBeenCalled();
  });

  test('applyToLinkedIn marks external when Easy Apply is not available', async () => {
    const application = { id: 'li-1' };

    const ctx = {
      page: {
        goto: jest.fn().mockResolvedValue(undefined),
      },
      appManager: {
        addApplication: jest.fn().mockReturnValue(application),
        updateStatus: jest.fn(),
      },
      findByText: jest.fn().mockResolvedValue(null),
      findElementWithText: jest.fn().mockResolvedValue(null),
    };

    const result = await AutoApplier.prototype.applyToLinkedIn.call(ctx, {
      sourceUrl: 'https://www.linkedin.com/jobs/view/1',
      company: 'LinkedIn',
      title: 'Cloud Engineer',
    });

    expect(result.success).toBe(true);
    expect(result.external).toBe(true);
    expect(ctx.appManager.addApplication).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ notes: 'External application required' })
    );
  });
});
