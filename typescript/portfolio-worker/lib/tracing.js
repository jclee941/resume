function randomHex(bytes) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  let output = '';
  for (let i = 0; i < bytes; i += 1) {
    output += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return output;
}

function generateTraceId() {
  return randomHex(16);
}

function generateSpanId() {
  return randomHex(8);
}

function parseTraceparent(traceparent) {
  if (typeof traceparent !== 'string') {
    return null;
  }

  const parts = traceparent.trim().split('-');
  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, parentSpanId, flags] = parts;
  if (!/^[\da-f]{2}$/i.test(version)) {
    return null;
  }
  if (!/^[\da-f]{32}$/i.test(traceId) || /^0+$/.test(traceId)) {
    return null;
  }
  if (!/^[\da-f]{16}$/i.test(parentSpanId) || /^0+$/.test(parentSpanId)) {
    return null;
  }
  if (!/^[\da-f]{2}$/i.test(flags)) {
    return null;
  }

  return {
    version: version.toLowerCase(),
    traceId: traceId.toLowerCase(),
    parentSpanId: parentSpanId.toLowerCase(),
    flags: flags.toLowerCase(),
  };
}

function createTraceparent(traceId, spanId, flags = '01', version = '00') {
  return `${version}-${traceId}-${spanId}-${flags}`;
}

function resolveContextFromHeaders(headers) {
  const incomingTraceparent = headers && headers.get ? headers.get('traceparent') : null;
  const incomingTracestate = headers && headers.get ? headers.get('tracestate') : null;
  const parsed = parseTraceparent(incomingTraceparent);

  return {
    traceId: parsed ? parsed.traceId : generateTraceId(),
    parentSpanId: parsed ? parsed.parentSpanId : null,
    tracestate: incomingTracestate || '',
    flags: parsed ? parsed.flags : '01',
    version: parsed ? parsed.version : '00',
  };
}

function propagateTraceContext(request, context = {}) {
  const baseContext = resolveContextFromHeaders(request.headers);
  const traceId = context.traceId || baseContext.traceId;
  const spanId = context.spanId || generateSpanId();
  const flags = context.flags || baseContext.flags;
  const version = context.version || baseContext.version;

  const headers = new Headers(request.headers);
  headers.set('traceparent', createTraceparent(traceId, spanId, flags, version));
  if (baseContext.tracestate) {
    headers.set('tracestate', baseContext.tracestate);
  }

  return {
    headers,
    traceId,
    spanId,
    parentSpanId: baseContext.parentSpanId,
    traceparent: headers.get('traceparent'),
    tracestate: headers.get('tracestate') || '',
  };
}

function startRouteSpan(request, route) {
  const propagated = propagateTraceContext(request);
  return {
    traceId: propagated.traceId,
    spanId: propagated.spanId,
    parentSpanId: propagated.parentSpanId,
    route,
    method: request.method,
    startedAt: Date.now(),
    traceparent: propagated.traceparent,
    tracestate: propagated.tracestate,
    headers: propagated.headers,
  };
}

function finishRouteSpan(span, statusCode, extraFields = {}) {
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    route: span.route,
    method: span.method,
    statusCode,
    durationMs: Date.now() - span.startedAt,
    startedAt: new Date(span.startedAt).toISOString(),
    traceparent: span.traceparent,
    ...extraFields,
  };
}

async function withRouteSpan(request, route, handler, options = {}) {
  const span = startRouteSpan(request, route);
  try {
    const response = await handler(span);
    const spanRecord = finishRouteSpan(span, response.status);
    if (typeof options.onSpanFinish === 'function') {
      await options.onSpanFinish(spanRecord);
    }
    return { response, span: spanRecord };
  } catch (error) {
    const spanRecord = finishRouteSpan(span, 500, { error: error.message });
    if (typeof options.onSpanFinish === 'function') {
      await options.onSpanFinish(spanRecord);
    }
    throw error;
  }
}

module.exports = {
  createTraceparent,
  finishRouteSpan,
  generateSpanId,
  generateTraceId,
  parseTraceparent,
  propagateTraceContext,
  startRouteSpan,
  withRouteSpan,
};
