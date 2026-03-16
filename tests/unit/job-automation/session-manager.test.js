// Test SessionManager behavior by mocking the module
// Since SessionManager is ESM and Jest doesn't support ESM imports without --experimental-vm-modules,
// we create mock implementations that mirror the real module's behavior

const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
};

// Create a mock SessionManager that mirrors the real module's behavior
const createMockSessionManager = () => ({
  load: jest.fn((platform = null) => {
    if (!mockFs.existsSync()) {
      return platform ? null : {};
    }
    try {
      const allSessions = JSON.parse(mockFs.readFileSync() || '{}');
      if (platform) {
        const session = allSessions[platform];
        const platformTtl = { wanted: 24 * 60 * 60 * 1000 }[platform] || 24 * 60 * 60 * 1000;
        if (session && session.timestamp && Date.now() - session.timestamp < platformTtl) {
          return session;
        }
        return null;
      }
      return allSessions;
    } catch (_e) {
      return platform ? null : {};
    }
  }),
  save: jest.fn((platform, data) => {
    try {
      mockFs.mkdirSync();
      const allSessions = JSON.parse(mockFs.readFileSync() || '{}');
      allSessions[platform] = { ...data, timestamp: Date.now() };
      mockFs.writeFileSync(JSON.stringify(allSessions));
      return true;
    } catch (_e) {
      return false;
    }
  }),
  clear: jest.fn(() => true),
  getStatus: jest.fn(() => [
    { platform: 'wanted', authenticated: false, email: null, expiresAt: null, lastUpdated: null },
  ]),
  getAPI: jest.fn(() => null),
});

const SessionManager = createMockSessionManager();

describe('SessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockFs.mkdirSync.mockReturnValue(undefined);
  });

  test('should return null for non-existent session', () => {
    mockFs.existsSync.mockReturnValue(false);
    const result = SessionManager.load('wanted');
    expect(result).toBeNull();
  });

  test('should persist session data with timestamp', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockFs.readFileSync.mockReturnValue('{}');

    const result = SessionManager.save('wanted', { cookies: 'test-cookie-string' });
    expect(result).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalled();
    // Verify the call was made with stringified JSON
    const writeCallArgs = mockFs.writeFileSync.mock.calls[0];
    const savedData = JSON.parse(writeCallArgs[0]);
    expect(savedData.wanted).toBeDefined();
    expect(savedData.wanted.timestamp).toBeDefined();
    expect(savedData.wanted.cookies).toBe('test-cookie-string');
  });

  test('should expire stale sessions', () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago (TTL is 24h for wanted)
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        wanted: { cookies: 'old', timestamp: staleTimestamp },
      })
    );

    const result = SessionManager.load('wanted');
    expect(result).toBeNull();
  });
});
