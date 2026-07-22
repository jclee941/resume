import { randomUUID } from 'node:crypto';
import { formatErrorResponse } from '../../shared/errors/error-formatter.js';

export default function errorHandler(error, request, reply) {
  const correlationId = randomUUID();
  const {
    error: { code, message, statusCode, details },
  } = formatErrorResponse(error);

  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
    errorCode: code,
    correlationId,
  });

  reply.header('X-Correlation-ID', correlationId);

  return reply.status(statusCode).send({
    code,
    message,
    correlationId,
    ...(details ? { details } : {}),
  });
}
