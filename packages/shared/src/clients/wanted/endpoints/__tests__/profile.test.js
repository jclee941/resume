import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  ProfileEndpoint,
  ExperienceEndpoint,
  EducationEndpoint,
  SkillsEndpoint,
} from '../profile.js';

const createMockHttpClient = () => ({
  request: mock.fn(),
  snsRequest: mock.fn(),
  snsProfileRequest: mock.fn(),
});

describe('ProfileEndpoint', () => {
  let client;
  let endpoint;

  beforeEach(() => {
    client = createMockHttpClient();
    endpoint = new ProfileEndpoint(client);
  });

  it('get() calls request on /user', async () => {
    const response = { name: 'Jane' };
    client.request.mock.mockImplementation(async () => response);

    const result = await endpoint.get();

    assert.strictEqual(client.request.mock.calls.length, 1);
    assert.strictEqual(client.request.mock.calls[0].arguments[0], '/user');
    assert.strictEqual(result, response);
  });

  it('getSnsProfile() calls snsProfileRequest on /profile', async () => {
    const response = { user: { description: 'Engineer' } };
    client.snsProfileRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.getSnsProfile();

    assert.strictEqual(client.snsProfileRequest.mock.calls.length, 1);
    assert.strictEqual(client.snsProfileRequest.mock.calls[0].arguments[0], '/profile');
    assert.strictEqual(result, response);
  });

  it('update() sends PATCH payload to snsProfileRequest', async () => {
    const payload = { description: 'Updated' };
    const response = { ok: true };
    client.snsProfileRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.update(payload);

    assert.strictEqual(client.snsProfileRequest.mock.calls.length, 1);
    assert.deepStrictEqual(client.snsProfileRequest.mock.calls[0].arguments, [
      '/profile',
      { method: 'PATCH', body: payload },
    ]);
    assert.strictEqual(result, response);
  });

  it('getApplications() uses default options and returns response.data', async () => {
    const response = { data: [{ id: 1 }] };
    client.request.mock.mockImplementation(async () => response);

    const result = await endpoint.getApplications();

    const url = client.request.mock.calls[0].arguments[0];
    assert.strictEqual(url, '/applications?limit=20&offset=0');
    assert.deepStrictEqual(result, response.data);
  });

  it('getApplications() supports custom options and response fallback', async () => {
    const response = [{ id: 2 }];
    client.request.mock.mockImplementation(async () => response);

    const result = await endpoint.getApplications({ limit: 5, offset: 10, status: 'accepted' });

    const url = client.request.mock.calls[0].arguments[0];
    assert.strictEqual(url, '/applications?limit=5&offset=10&status=accepted');
    assert.strictEqual(result, response);
  });

  it('getBookmarks() supports default and custom options', async () => {
    const responses = [{ data: [{ id: 'b1' }] }, { data: [{ id: 'b2' }] }];
    client.request = mock.fn(async () => responses.shift());

    const defaultResult = await endpoint.getBookmarks();
    const customResult = await endpoint.getBookmarks({ limit: 3, offset: 7 });

    assert.strictEqual(client.request.mock.calls[0].arguments[0], '/bookmarks?limit=20&offset=0');
    assert.strictEqual(client.request.mock.calls[1].arguments[0], '/bookmarks?limit=3&offset=7');
    assert.deepStrictEqual(defaultResult, [{ id: 'b1' }]);
    assert.deepStrictEqual(customResult, [{ id: 'b2' }]);
  });

  it('getBookmarks() returns raw response when response.data is missing', async () => {
    const response = { bookmarks: [{ id: 'raw' }] };
    client.request = mock.fn(async () => response);

    const result = await endpoint.getBookmarks({ limit: 1, offset: 1 });

    assert.strictEqual(client.request.mock.calls[0].arguments[0], '/bookmarks?limit=1&offset=1');
    assert.strictEqual(result, response);
  });

  it('getResumes() returns response.data or response', async () => {
    const responses = [{ data: [{ id: 'r1' }] }, { plain: true }];
    client.request = mock.fn(async () => responses.shift());

    const dataResult = await endpoint.getResumes();
    const fallbackResult = await endpoint.getResumes();

    assert.strictEqual(client.request.mock.calls[0].arguments[0], '/resumes');
    assert.strictEqual(client.request.mock.calls[1].arguments[0], '/resumes');
    assert.deepStrictEqual(dataResult, [{ id: 'r1' }]);
    assert.deepStrictEqual(fallbackResult, { plain: true });
  });
});

describe('ExperienceEndpoint', () => {
  let client;
  let endpoint;

  beforeEach(() => {
    client = createMockHttpClient();
    endpoint = new ExperienceEndpoint(client);
  });

  it('add() calls snsRequest POST', async () => {
    const payload = { company: 'Wanted' };
    const response = { id: 10 };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.add(payload);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/experiences',
      { method: 'POST', body: payload },
    ]);
    assert.strictEqual(result, response);
  });

  it('update() calls snsRequest PUT', async () => {
    const payload = { title: 'Senior' };
    const response = { ok: true };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.update(99, payload);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/experiences/99',
      { method: 'PUT', body: payload },
    ]);
    assert.strictEqual(result, response);
  });

  it('delete() calls snsRequest DELETE', async () => {
    const response = { ok: true };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.delete(77);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/experiences/77',
      { method: 'DELETE' },
    ]);
    assert.strictEqual(result, response);
  });
});

describe('EducationEndpoint', () => {
  let client;
  let endpoint;

  beforeEach(() => {
    client = createMockHttpClient();
    endpoint = new EducationEndpoint(client);
  });

  it('add() calls snsRequest POST', async () => {
    const payload = { school: 'Korea Univ.' };
    const response = { id: 11 };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.add(payload);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/educations',
      { method: 'POST', body: payload },
    ]);
    assert.strictEqual(result, response);
  });

  it('update() calls snsRequest PUT', async () => {
    const payload = { degree: 'BS' };
    const response = { ok: true };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.update(55, payload);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/educations/55',
      { method: 'PUT', body: payload },
    ]);
    assert.strictEqual(result, response);
  });

  it('delete() calls snsRequest DELETE', async () => {
    const response = { ok: true };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.delete(44);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/educations/44',
      { method: 'DELETE' },
    ]);
    assert.strictEqual(result, response);
  });
});

describe('SkillsEndpoint', () => {
  let client;
  let endpoint;

  beforeEach(() => {
    client = createMockHttpClient();
    endpoint = new SkillsEndpoint(client);
  });

  it('add() calls snsRequest POST', async () => {
    const payload = { name: 'Node.js' };
    const response = { id: 12 };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.add(payload);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/skills',
      { method: 'POST', body: payload },
    ]);
    assert.strictEqual(result, response);
  });

  it('remove() calls snsRequest DELETE', async () => {
    const response = { ok: true };
    client.snsRequest.mock.mockImplementation(async () => response);

    const result = await endpoint.remove(33);

    assert.deepStrictEqual(client.snsRequest.mock.calls[0].arguments, [
      '/user/skills/33',
      { method: 'DELETE' },
    ]);
    assert.strictEqual(result, response);
  });
});
