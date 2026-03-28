describe('@resume/shared/gitlab-api', () => {
  let fetchSpy;
  let GitLabAPI;

  const mockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: {
      get: jest.fn((header) => {
        if (header.toLowerCase() === 'content-type') {
          return 'application/json';
        }
        return null;
      }),
    },
  });

  beforeAll(async () => {
    const mod = await import('@resume/shared/clients/gitlab/gitlab-api');
    GitLabAPI = mod.GitLabAPI;
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GITLAB_URL;
    delete process.env.GITLAB_OAUTH_APP_ID;
    delete process.env.GITLAB_OAUTH_CLIENT_SECRET;
  });

  describe('constructor', () => {
    test('initializes with provided config', () => {
      const api = new GitLabAPI({
        baseUrl: 'https://gitlab.example.com',
        appId: 'test-app',
        clientSecret: 'test-secret',
      });
      expect(api.getHttpClient()).toBeDefined();
    });

    test('creates client with default config if not provided', () => {
      const api = new GitLabAPI({});
      expect(api.getHttpClient()).toBeDefined();
    });
  });

  describe('Projects', () => {
    describe('listProjects', () => {
      test('returns list of projects', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const projects = [
          { id: 1, name: 'Project 1', path_with_namespace: 'group/project1' },
          { id: 2, name: 'Project 2', path_with_namespace: 'group/project2' },
        ];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(projects));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.listProjects();

        expect(result).toEqual(projects);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects'),
          expect.anything()
        );
      });

      test('filters projects by search', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const projects = [{ id: 1, name: 'Test Project' }];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(projects));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await api.listProjects({ search: 'test' });

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('search=test'),
          expect.anything()
        );
      });
    });

    describe('getProject', () => {
      test('returns project by ID', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const project = { id: 1, name: 'Test Project' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(project));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.getProject(1);

        expect(result).toEqual(project);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1'),
          expect.anything()
        );
      });
    });

    describe('getProjectVariables', () => {
      test('returns CI/CD variables', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const variables = [
          { key: 'VAR1', value: 'value1', protected: false },
          { key: 'VAR2', value: 'value2', protected: true },
        ];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(variables));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.getProjectVariables(1);

        expect(result).toEqual(variables);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/variables'),
          expect.anything()
        );
      });
    });

    describe('createProjectVariable', () => {
      test('creates new variable', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const newVar = { key: 'NEW_VAR', value: 'new_value', protected: true, masked: false };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(newVar));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.createProjectVariable(1, {
          key: 'NEW_VAR',
          value: 'new_value',
          protected: true,
        });

        expect(result).toEqual(newVar);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/variables'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('updateProjectVariable', () => {
      test('updates existing variable', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const updatedVar = { key: 'EXISTING_VAR', value: 'updated_value' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(updatedVar));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.updateProjectVariable(1, 'EXISTING_VAR', {
          value: 'updated_value',
        });

        expect(result).toEqual(updatedVar);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/variables/EXISTING_VAR'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    describe('deleteProjectVariable', () => {
      test('deletes variable', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse({}));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await api.deleteProjectVariable(1, 'VAR_TO_DELETE');

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/variables/VAR_TO_DELETE'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Pipelines', () => {
    describe('listPipelines', () => {
      test('returns list of pipelines', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const pipelines = [
          { id: 1, status: 'success', ref: 'main' },
          { id: 2, status: 'failed', ref: 'feature' },
        ];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(pipelines));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.listPipelines(1);

        expect(result).toEqual(pipelines);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/pipelines'),
          expect.anything()
        );
      });

      test('filters by status', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const pipelines = [{ id: 1, status: 'success' }];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(pipelines));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await api.listPipelines(1, { status: 'success' });

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('status=success'),
          expect.anything()
        );
      });
    });

    describe('getPipeline', () => {
      test('returns pipeline details', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const pipeline = { id: 1, status: 'success', stages: ['build', 'test'] };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(pipeline));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.getPipeline(1, 1);

        expect(result).toEqual(pipeline);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/pipelines/1'),
          expect.anything()
        );
      });
    });

    describe('createPipeline', () => {
      test('creates pipeline with ref', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const pipeline = { id: 3, status: 'pending' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(pipeline));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.createPipeline(1, 'main');

        expect(result).toEqual(pipeline);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/pipeline'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      test('creates pipeline with variables', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const pipeline = { id: 3, status: 'pending' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(pipeline));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const variables = [{ key: 'VAR1', value: 'value1' }];
        await api.createPipeline(1, 'main', variables);

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('VAR1'),
          })
        );
      });
    });

    describe('retryPipeline', () => {
      test('retries failed pipeline', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const newPipeline = { id: 2, status: 'pending' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(newPipeline));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.retryPipeline(1, 1);

        expect(result).toEqual(newPipeline);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/pipelines/1/retry'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('cancelPipeline', () => {
      test('cancels running pipeline', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const canceled = { id: 1, status: 'canceled' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(canceled));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.cancelPipeline(1, 1);

        expect(result).toEqual(canceled);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/pipelines/1/cancel'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('Jobs', () => {
    describe('listPipelineJobs', () => {
      test('returns jobs for pipeline', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const jobs = [
          { id: 1, name: 'build', status: 'success' },
          { id: 2, name: 'test', status: 'success' },
        ];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(jobs));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.listPipelineJobs(1, 1);

        expect(result).toEqual(jobs);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/pipelines/1/jobs'),
          expect.anything()
        );
      });
    });

    describe('listJobs', () => {
      test('returns all jobs for project', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const jobs = [{ id: 1, name: 'build', status: 'success' }];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(jobs));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.listJobs(1);

        expect(result).toEqual(jobs);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/jobs'),
          expect.anything()
        );
      });
    });

    describe('getJob', () => {
      test('returns job details', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const job = { id: 1, name: 'build', status: 'success' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(job));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.getJob(1, 1);

        expect(result).toEqual(job);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/jobs/1'),
          expect.anything()
        );
      });
    });

    describe('getJobTrace', () => {
      test('returns job logs', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const logs = 'Build output...';
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(logs));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await api.getJobTrace(1, 1);

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/jobs/1/trace'),
          expect.anything()
        );
      });
    });

    describe('retryJob', () => {
      test('retries job', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const job = { id: 1, name: 'build', status: 'pending' };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(job));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.retryJob(1, 1);

        expect(result).toEqual(job);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/jobs/1/retry'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('Runners', () => {
    describe('listProjectRunners', () => {
      test('returns list of runners', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const runners = [{ id: 1, description: 'Runner 1' }];
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(runners));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await api.listProjectRunners(1);

        expect(result).toEqual(runners);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/runners'),
          expect.anything()
        );
      });
    });

    describe('enableRunner', () => {
      test('enables runner for project', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        const result = { id: 1, runner_id: 5 };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(result));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const response = await api.enableRunner(1, 5, { locked: true });

        expect(response).toEqual(result);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/runners'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('disableRunner', () => {
      test('disables runner from project', async () => {
        const tokenData = { access_token: 'test-token', token_type: 'Bearer', expires_in: 7200 };
        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse({}));

        const api = new GitLabAPI({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await api.disableRunner(1, 5);

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('/projects/1/runners/5'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });
});
