const ALLOWED_ORIGINS = ['https://resume.jclee.me', 'http://localhost:3456'];

export function corsHeaders(origin) {
  // Deny by default - only return CORS headers for allowed origins
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function addCorsHeaders(response, origin) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
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
