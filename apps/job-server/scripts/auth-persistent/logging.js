export function log(msg, type = 'info', platform = null) {
  const prefix = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[type] || '📝';
  const tag = platform ? `[${platform.toUpperCase()}]` : '';
  console.log(`${new Date().toISOString()} ${prefix} ${tag} ${msg}`);
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
