import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const createMockHttpClient = () => ({
  request: mock.fn(),
  snsRequest: mock.fn(),
  chaosRequest: mock.fn(),
  setCookies: mock.fn(),
  getCookies: mock.fn(() => 'test-cookie'),
});

const assertChaosCall = (mockClient, expectedPath, expectedMethod, expectedBody) => {
  assert.strictEqual(mockClient.chaosRequest.mock.calls.length, 1);

  const args = mockClient.chaosRequest.mock.calls[0].arguments;
  const path = args[0];
  const options = args[1];

  assert.strictEqual(path, expectedPath);
  assert.ok(path.includes('/v1') || path.includes('/v2'));

  if (expectedMethod) {
    assert.strictEqual(options.method, expectedMethod);
  } else {
    assert.strictEqual(options, undefined);
  }

  if (expectedBody !== undefined) {
    assert.deepStrictEqual(options.body, expectedBody);
  }
};

describe('ResumeEndpoint', async () => {
  const { ResumeEndpoint } = await import('../endpoints/resume.js');
  let mockClient;
  let endpoint;

  const resumeId = 'test-resume-123';

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new ResumeEndpoint(mockClient);
  });

  it('list() calls /resumes/v1 with GET semantics and returns data', async () => {
    const response = { data: [{ id: 1 }] };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.list();

    assertChaosCall(mockClient, '/resumes/v1');
    assert.strictEqual(result, response.data);
  });

  it('getDetail() calls /resumes/v1/:id with GET semantics and returns data', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.getDetail(resumeId);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}`);
    assert.strictEqual(result, response.data);
  });

  it('save() calls /resumes/v1/:id with PUT and body, returning response passthrough', async () => {
    const payload = { title: 'Resume Title' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.save(resumeId, payload);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}`, 'PUT', payload);
    assert.strictEqual(result, response);
  });

  it('updateStatus() calls /resumes/v1/:id/status with PUT and mapped body, returning response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.updateStatus(resumeId, true);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/status`, 'PUT', { is_public: true });
    assert.strictEqual(result, response);
  });

  it('regeneratePdf() calls /resumes/v1/:id/pdf with POST and returns response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.regeneratePdf(resumeId);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/pdf`, 'POST');
    assert.strictEqual(result, response);
  });
});

describe('ResumeCareerEndpoint', async () => {
  const { ResumeCareerEndpoint } = await import('../endpoints/resume.js');
  let mockClient;
  let endpoint;

  const resumeId = 'test-resume-123';
  const careerId = 456;
  const projectId = 789;

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new ResumeCareerEndpoint(mockClient);
  });

  it('update() uses PUT on /resumes/v2/:resumeId/careers/:careerId with body and returns response passthrough', async () => {
    const payload = { company: 'Wanted' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.update(resumeId, careerId, payload);

    assertChaosCall(mockClient, `/resumes/v2/${resumeId}/careers/${careerId}`, 'PUT', payload);
    assert.strictEqual(result, response);
  });

  it('add() uses POST on /resumes/v2/:resumeId/careers with body and returns response passthrough', async () => {
    const payload = { company: 'Toss' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.add(resumeId, payload);

    assertChaosCall(mockClient, `/resumes/v2/${resumeId}/careers`, 'POST', payload);
    assert.strictEqual(result, response);
  });

  it('delete() uses DELETE on /resumes/v2/:resumeId/careers/:careerId and returns response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.delete(resumeId, careerId);

    assertChaosCall(mockClient, `/resumes/v2/${resumeId}/careers/${careerId}`, 'DELETE');
    assert.strictEqual(result, response);
  });

  it('addProject() uses POST on /resumes/v2/:resumeId/careers/:careerId/projects with body and returns response passthrough', async () => {
    const payload = { name: 'Migration Project' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.addProject(resumeId, careerId, payload);

    assertChaosCall(
      mockClient,
      `/resumes/v2/${resumeId}/careers/${careerId}/projects`,
      'POST',
      payload
    );
    assert.strictEqual(result, response);
  });

  it('deleteProject() uses DELETE on /resumes/v2/:resumeId/careers/:careerId/projects/:projectId and returns response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.deleteProject(resumeId, careerId, projectId);

    assertChaosCall(
      mockClient,
      `/resumes/v2/${resumeId}/careers/${careerId}/projects/${projectId}`,
      'DELETE'
    );
    assert.strictEqual(result, response);
  });
});

describe('ResumeEducationEndpoint', async () => {
  const { ResumeEducationEndpoint } = await import('../endpoints/resume.js');
  let mockClient;
  let endpoint;

  const resumeId = 'test-resume-123';
  const educationId = 321;

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new ResumeEducationEndpoint(mockClient);
  });

  it('update() uses PUT on /resumes/v1/:resumeId/educations/:educationId with body and returns response passthrough', async () => {
    const payload = { school: 'Test University' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.update(resumeId, educationId, payload);

    assertChaosCall(
      mockClient,
      `/resumes/v1/${resumeId}/educations/${educationId}`,
      'PUT',
      payload
    );
    assert.strictEqual(result, response);
  });

  it('add() uses POST on /resumes/v1/:resumeId/educations with body and returns response passthrough', async () => {
    const payload = { school: 'Another University' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.add(resumeId, payload);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/educations`, 'POST', payload);
    assert.strictEqual(result, response);
  });

  it('delete() uses DELETE on /resumes/v1/:resumeId/educations/:educationId and returns response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.delete(resumeId, educationId);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/educations/${educationId}`, 'DELETE');
    assert.strictEqual(result, response);
  });
});

describe('ResumeSkillsEndpoint', async () => {
  const { ResumeSkillsEndpoint } = await import('../endpoints/resume.js');
  let mockClient;
  let endpoint;

  const resumeId = 'test-resume-123';
  const skillId = 654;

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new ResumeSkillsEndpoint(mockClient);
  });

  it('add() uses POST on /resumes/v1/:resumeId/skills with body and returns response passthrough', async () => {
    const payload = { name: 'Node.js' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.add(resumeId, payload);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/skills`, 'POST', payload);
    assert.strictEqual(result, response);
  });

  it('delete() uses DELETE on /resumes/v1/:resumeId/skills/:skillId and returns response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.delete(resumeId, skillId);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/skills/${skillId}`, 'DELETE');
    assert.strictEqual(result, response);
  });
});

describe('ResumeActivityEndpoint', async () => {
  const { ResumeActivityEndpoint } = await import('../endpoints/resume.js');
  let mockClient;
  let endpoint;

  const resumeId = 'test-resume-123';
  const activityId = 777;

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new ResumeActivityEndpoint(mockClient);
  });

  it('update() uses PUT on /resumes/v1/:resumeId/activities/:activityId with body and returns response passthrough', async () => {
    const payload = { name: 'Open Source' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.update(resumeId, activityId, payload);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/activities/${activityId}`, 'PUT', payload);
    assert.strictEqual(result, response);
  });

  it('add() uses POST on /resumes/v1/:resumeId/activities with body and returns response passthrough', async () => {
    const payload = { name: 'Conference Speaker' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.add(resumeId, payload);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/activities`, 'POST', payload);
    assert.strictEqual(result, response);
  });

  it('delete() uses DELETE on /resumes/v1/:resumeId/activities/:activityId and returns response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.delete(resumeId, activityId);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/activities/${activityId}`, 'DELETE');
    assert.strictEqual(result, response);
  });
});

describe('ResumeLanguageCertEndpoint', async () => {
  const { ResumeLanguageCertEndpoint } = await import('../endpoints/resume.js');
  let mockClient;
  let endpoint;

  const resumeId = 'test-resume-123';
  const certId = 888;

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new ResumeLanguageCertEndpoint(mockClient);
  });

  it('update() uses PUT on /resumes/v1/:resumeId/language_certs/:certId with body and returns response passthrough', async () => {
    const payload = { name: 'TOEIC' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.update(resumeId, certId, payload);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/language_certs/${certId}`, 'PUT', payload);
    assert.strictEqual(result, response);
  });

  it('add() uses POST on /resumes/v1/:resumeId/language_certs with body and returns response passthrough', async () => {
    const payload = { name: 'OPIc' };
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.add(resumeId, payload);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/language_certs`, 'POST', payload);
    assert.strictEqual(result, response);
  });

  it('delete() uses DELETE on /resumes/v1/:resumeId/language_certs/:certId and returns response passthrough', async () => {
    const response = { data: { id: 1 } };
    mockClient.chaosRequest = mock.fn(async () => response);

    const result = await endpoint.delete(resumeId, certId);

    assertChaosCall(mockClient, `/resumes/v1/${resumeId}/language_certs/${certId}`, 'DELETE');
    assert.strictEqual(result, response);
  });
});
