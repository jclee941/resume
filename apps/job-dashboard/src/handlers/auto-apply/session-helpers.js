export async function getWantedSession(env) {
  const sessions = env?.SESSIONS;
  if (!sessions) return null;

  let session = await sessions.get('session:wanted', { type: 'text' });
  if (!session) {
    session = await sessions.get('wanted:session', { type: 'json' });
    if (session?.cookies) {
      return session.cookies;
    }
    return null;
  }

  return session;
}

export async function saveWantedSession(env, sessionData) {
  const sessions = env?.SESSIONS;
  if (!sessions) return false;

  const cookies = sessionData?.cookies || null;
  const email = sessionData?.email ?? null;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await sessions.put(
    'wanted:session',
    JSON.stringify({
      cookies,
      email,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
  );
  return true;
}
