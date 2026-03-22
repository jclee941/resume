function createGracefulShutdown({ closeTarget, onInfo, onError, onExit }) {
  let isShuttingDown = false;

  return async function gracefulShutdown(signal) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    onInfo({ signal }, 'Received shutdown signal, closing server...');

    try {
      await closeTarget();
      onInfo('Server closed gracefully');
      onExit(0);
    } catch (err) {
      onError({ err }, 'Error during graceful shutdown');
      onExit(1);
    }
  };
}

describe('graceful shutdown handlers', () => {
  let exitSpy;
  let processOnSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn());
    processOnSpy = jest.spyOn(process, 'on').mockImplementation(jest.fn(() => process));
  });

  afterEach(() => {
    exitSpy.mockRestore();
    processOnSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('prevents double-fire with isShuttingDown guard', async () => {
    const closeMock = jest.fn(async () => undefined);
    const infoMock = jest.fn();
    const errorMock = jest.fn();

    const gracefulShutdown = createGracefulShutdown({
      closeTarget: closeMock,
      onInfo: infoMock,
      onError: errorMock,
      onExit: process.exit,
    });

    await gracefulShutdown('SIGTERM');
    await gracefulShutdown('SIGINT');

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  test('calls server.close on SIGTERM handler', async () => {
    const closeMock = jest.fn(async () => undefined);
    const infoMock = jest.fn();
    const errorMock = jest.fn();

    const gracefulShutdown = createGracefulShutdown({
      closeTarget: closeMock,
      onInfo: infoMock,
      onError: errorMock,
      onExit: process.exit,
    });

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    const sigtermRegistration = process.on.mock.calls.find((call) => call[0] === 'SIGTERM');
    expect(sigtermRegistration).toBeDefined();

    const sigtermHandler = sigtermRegistration[1];
    await sigtermHandler();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  test('exits with code 1 when shutdown close fails', async () => {
    const closeError = new Error('close failed');
    const closeMock = jest.fn(async () => {
      throw closeError;
    });
    const infoMock = jest.fn();
    const errorMock = jest.fn();

    const gracefulShutdown = createGracefulShutdown({
      closeTarget: closeMock,
      onInfo: infoMock,
      onError: errorMock,
      onExit: process.exit,
    });

    await gracefulShutdown('SIGTERM');

    expect(errorMock).toHaveBeenCalledWith({ err: closeError }, 'Error during graceful shutdown');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
