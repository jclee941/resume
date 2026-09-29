export function isStrictSyncEnabled() {
  return process.env.SYNC_STRICT === 'true';
}
