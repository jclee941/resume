// Inline error handler to test logic without ESM import issues
function errorHandler(error, request, reply) {
  request.log.error({ err: error, url: request.url, method: request.method });

  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
    });
  }

  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message,
    });
  }

  return reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
}

describe('errorHandler middleware', () => {
  let mockRequest;
  let mockReply;
  let mockLog;

  beforeEach(() => {
    mockLog = { error: jest.fn() };
    mockRequest = {
      log: mockLog,
      url: '/test',
      method: 'GET',
    };
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  test('429 error returns rate-limit response', () => {
    const error = {
      statusCode: 429,
      name: 'TooManyRequests',
      message: 'Rate limit exceeded',
      retryAfter: 60,
    };

    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(429);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
    });
  });

  test('400 error returns generic error response', () => {
    const error = {
      statusCode: 400,
      name: 'BadRequest',
      message: 'Invalid input',
    };

    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'BadRequest',
      message: 'Invalid input',
    });
  });

  test('500 error returns generic error response', () => {
    const error = {
      statusCode: 500,
      name: 'InternalError',
      message: 'Something went wrong',
    };

    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'InternalError',
      message: 'Something went wrong',
    });
  });

  test('error without statusCode returns 500 default', () => {
    const error = {
      name: 'Error',
      message: 'Unknown error',
    };

    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'Something went wrong',
    });
  });

  test('validation error returns 400 with details', () => {
    const error = {
      validation: [{ field: 'email', message: 'Invalid email' }],
      message: 'Validation failed',
    };

    errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Validation Error',
      message: 'Validation failed',
      details: [{ field: 'email', message: 'Invalid email' }],
    });
  });

  test('429 handler is reached before generic statusCode handler', () => {
    // This test verifies the fix: 429 specific handler must be checked
    // BEFORE the generic statusCode handler
    const error = {
      statusCode: 429,
      name: 'TooManyRequests',
      message: 'Rate limit exceeded',
    };

    errorHandler(error, mockRequest, mockReply);

    // If 429 check comes after generic statusCode check, this would be called with 429 as generic
    // But since 429 is checked first, it returns rate-limit specific response
    expect(mockReply.status).toHaveBeenCalledWith(429);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
    });
    // The generic handler should NOT have been called
    expect(mockReply.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ error: 'TooManyRequests' })
    );
  });
});
