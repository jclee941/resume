const path = require('path');
const { pathToFileURL } = require('url');

// Regression: log() passed context as a third argument, which Logger.debug/info/warn
// ignore, so structured context from the MCP server never reached the log labels.
describe('job-server log()', () => {
  let log;
  let logger;

  beforeAll(async () => {
    const loggerPath = path.resolve(__dirname, '../../../apps/job-server/src/logger.js');
    ({ log, logger } = await import(pathToFileURL(loggerPath).href));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each(['debug', 'info', 'warn'])('forwards context to logger.%s', (level) => {
    const spy = jest.spyOn(logger, level).mockResolvedValue(undefined);

    log(level, 'Executing tool', { tool: 'search_jobs' });

    expect(spy).toHaveBeenCalledWith('Executing tool', { tool: 'search_jobs' });
  });

  test('passes context as extra labels for errors', () => {
    const spy = jest.spyOn(logger, 'error').mockResolvedValue(undefined);

    log('error', 'Tool failed', { tool: 'search_jobs' });

    expect(spy).toHaveBeenCalledWith('Tool failed', null, { tool: 'search_jobs' });
  });
});
