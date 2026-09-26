import { logToElasticsearch } from './transport.js';

export function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function logRequest(env, request, url, options = {}) {
  const requestId = options.requestId || generateRequestId();
  const startTime = options.startTime || Date.now();

  return logToElasticsearch(
    env,
    `${request.method} ${url.pathname}`,
    'INFO',
    {
      http: {
        request: {
          method: request.method,
          id: requestId,
        },
      },
      url: {
        path: url.pathname,
        query: url.search || undefined,
      },
      user_agent: { original: request.headers.get('user-agent') },
      client: request.cf
        ? {
            geo: {
              country_iso_code: request.cf.country,
              city_name: request.cf.city,
            },
            as: { number: request.cf.asn },
          }
        : undefined,
      event: {
        start: new Date(startTime).toISOString(),
        kind: 'event',
        category: ['web'],
        type: ['access'],
      },
    },
    options
  );
}

export async function logResponse(env, request, response, options = {}) {
  const requestId = options.requestId || generateRequestId();
  const startTime = options.startTime || Date.now();
  const duration = Date.now() - startTime;

  return logToElasticsearch(
    env,
    `${request.method} ${response.status} ${duration}ms`,
    response.status >= 400 ? 'ERROR' : 'INFO',
    {
      http: {
        request: { method: request.method, id: requestId },
        response: { status_code: response.status },
      },
      event: {
        duration: duration * 1_000_000, // nanoseconds per ECS
        outcome: response.status < 400 ? 'success' : 'failure',
      },
    },
    { ...options, immediate: true }
  );
}

export async function logError(env, error, context = {}, options = {}) {
  return logToElasticsearch(
    env,
    error.message,
    'ERROR',
    {
      error: {
        type: error.name,
        message: error.message,
        stack_trace: error.stack?.substring(0, 2000),
      },
      event: { kind: 'event', category: ['web'], type: ['error'] },
      ...context,
    },
    { ...options, immediate: true }
  );
}

export async function logEvent(env, event, data = {}, options = {}) {
  return logToElasticsearch(
    env,
    event,
    'INFO',
    {
      event: { action: event, kind: 'event' },
      ...data,
    },
    options
  ).catch((err) => {
    console.warn({ err }, 'logEvent failed to write to Elasticsearch');
  });
}
