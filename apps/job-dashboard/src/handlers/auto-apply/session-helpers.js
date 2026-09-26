export async function getWantedSession(env) {
  const sessions = env?.SESSIONS;
  if (!sessions) return null;

  let session = await sessions.get('auth:wanted', { type: 'text' });
  if (session) return session;

  session = await sessions.get('session:wanted', { type: 'text' });
  if (!session) {
    session = await sessions.get('wanted:session', { type: 'json' });
    if (session?.cookies) {
      return session.cookies;
    }
    return null;
  }

  return session;
}
