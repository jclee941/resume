const DEFAULT_ORIGINS = ['https://resume.jclee.me', 'http://localhost:3456'];

function getAllowedOrigins(env) {
  if (env?.CORS_ALLOWED_ORIGINS) {
    try {
      return JSON.parse(env.CORS_ALLOWED_ORIGINS);
    } catch {
      return env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    }
  }
  return DEFAULT_ORIGINS;
}

export function corsHeaders(request, env) {
  const origin = request instanceof Request ? request.headers.get('Origin') : request;
  const allowedOrigins = getAllowedOrigins(env);

  // Deny by default - only return CORS headers for allowed origins
  if (!origin || !allowedOrigins.includes(origin)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function addCorsHeaders(response, request, env) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request, env)).forEach(([key, value]) => {
    headers.set(key, value);
  });
  // Security headers
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  // Cache control for API responses
  headers.set('Cache-Control', 'private, no-store');
  return new Response(response.body, { status: response.status, headers });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
