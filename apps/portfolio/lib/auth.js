/**
 * Authentication helper code generators for worker embedding
 * @module auth
 */

function verifyGoogleToken() {
  return [
    'async function verifyGoogleToken(token, expectedClientId) {',
    '  try {',
    '    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);',
    '    if (!res.ok) throw new Error("Invalid token");',
    '    const payload = await res.json();',
    '    // RFC 7519 / Google Identity verification:',
    '    //   - aud MUST match our OAuth client ID (prevents replay from other apps)',
    '    //   - iss MUST be a Google-issued issuer',
    '    //   - exp MUST be in the future (epoch seconds)',
    '    if (!expectedClientId || payload.aud !== expectedClientId) {',
    '      throw new Error("Token audience mismatch");',
    '    }',
    '    const trustedIssuers = new Set(["https://accounts.google.com", "accounts.google.com"]);',
    '    if (!trustedIssuers.has(payload.iss)) {',
    '      throw new Error("Token issuer not trusted");',
    '    }',
    '    const expSeconds = Number(payload.exp);',
    '    if (!Number.isFinite(expSeconds) || expSeconds * 1000 <= Date.now()) {',
    '      throw new Error("Token expired");',
    '    }',
    '    return payload;',
    '  } catch (e) {',
    '    throw new Error("Token verification failed");',
    '  }',
    '}',
  ].join('\n');
}

function signMessage() {
  return [
    'async function signMessage(message, secret) {',
    '  const enc = new TextEncoder();',
    '  const key = await crypto.subtle.importKey(',
    '    "raw", enc.encode(secret),',
    '    { name: "HMAC", hash: "SHA-256" },',
    '    false, ["sign"]',
    '  );',
    '  const signature = await crypto.subtle.sign(',
    '    "HMAC", key, enc.encode(message)',
    '  );',
    '  return btoa(String.fromCharCode(...new Uint8Array(signature)));',
    '}',
  ].join('\n');
}

function verifyMessage() {
  return [
    'async function verifyMessage(message, signature, secret) {',
    '  try {',
    '    const enc = new TextEncoder();',
    '    const key = await crypto.subtle.importKey(',
    '      "raw", enc.encode(secret),',
    '      { name: "HMAC", hash: "SHA-256" },',
    '      false, ["verify"]',
    '    );',
    '    const sigBuf = Uint8Array.from(atob(signature), c => c.charCodeAt(0));',
    '    return await crypto.subtle.verify(',
    '      "HMAC", key, enc.encode(message), sigBuf',
    '    );',
    '  } catch (e) {',
    '    return false;',
    '  }',
    '}',
  ].join('\n');
}

function verifySession() {
  return [
    'async function verifySession(request, env) {',
    '  const cookieHeader = request.headers.get("Cookie");',
    '  if (!cookieHeader) return null;',
    '  ',
    "  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => { const t = c.trim(); const i = t.indexOf('='); return i === -1 ? [t, ''] : [t.slice(0, i), t.slice(i + 1)]; }));",
    "  const sessionData = cookies['dashboard_session'];",
    '  ',
    '  if (!sessionData) return null;',
    '  ',
    '  try {',
    "    const [payloadB64, signature] = sessionData.split('.');",
    '    if (!payloadB64 || !signature) return null;',
    '',
    "    const secret = (typeof env !== 'undefined' && env.SIGNING_SECRET);",
    '    if (!secret) return null;',
    '    const isValid = await verifyMessage(payloadB64, signature, secret);',
    '    ',
    '    if (!isValid) return null;',
    '',
    '    const session = JSON.parse(atob(payloadB64));',
    '    if (session.expires < Date.now()) return null;',
    '    return session;',
    '  } catch (e) {',
    '    return null;',
    '  }',
    '}',
  ].join('\n');
}

function getCFZoneId() {
  return [
    'async function getCFZoneId(apiKey, email) {',
    '  try {',
    '    const response = await fetch("https://api.cloudflare.com/client/v4/zones?name=resume.jclee.me", {',
    '      headers: {',
    '        "X-Auth-Email": email,',
    '        "X-Auth-Key": apiKey,',
    '        "Content-Type": "application/json",',
    '      },',
    '    });',
    '    const data = await response.json();',
    '    return (data.success && data.result.length > 0) ? data.result[0].id : null;',
    '  } catch (error) {',
    '    return null;',
    '  }',
    '}',
  ].join('\n');
}

function getCFStats() {
  return [
    'async function getCFStats(zoneId, apiKey, email) {',
    '  const query = `',
    '    query GetZoneAnalytics($zoneTag: string!, $since: string!, $until: string!) {',
    '      viewer {',
    '        zones(filter: { zoneTag: $zoneTag }) {',
    '          httpRequests1dGroups(limit: 7, filter: { date_geq: $since, date_leq: $until }) {',
    '            dimensions { date }',
    '            sum { requests pageViews bytes }',
    '            uniq { uniques }',
    '          }',
    '        }',
    '      }',
    '    }',
    '  `;',
    '',
    '  const now = new Date();',
    '  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);',
    '',
    '  try {',
    '    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {',
    '      method: "POST",',
    '      headers: {',
    '        "X-Auth-Email": email,',
    '        "X-Auth-Key": apiKey,',
    '        "Content-Type": "application/json",',
    '      },',
    '      body: JSON.stringify({',
    '        query,',
    '        variables: {',
    '          zoneTag: zoneId,',
    '          since: weekAgo.toISOString().split("T")[0],',
    '          until: now.toISOString().split("T")[0],',
    '        },',
    '      }),',
    '    });',
    '    const data = await response.json();',
    '    return data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];',
    '  } catch (error) {',
    '    return [];',
    '  }',
    '}',
  ].join('\n');
}

function generateAuthHelpers() {
  return [
    verifyGoogleToken(),
    '',
    signMessage(),
    '',
    verifyMessage(),
    '',
    verifySession(),
    '',
    getCFZoneId(),
    '',
    getCFStats(),
  ].join('\n');
}

module.exports = {
  verifyGoogleToken,
  signMessage,
  verifyMessage,
  verifySession,
  getCFZoneId,
  getCFStats,
  generateAuthHelpers,
};
