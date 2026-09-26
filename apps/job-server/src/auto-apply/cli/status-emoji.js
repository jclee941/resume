/**
 * @param {string} status
 * @returns {string}
 */
export function getStatusEmoji(status) {
  /** @type {Record<string, string>} */
  const emojis = {
    pending: '⏳',
    applied: '📝',
    viewed: '👀',
    in_progress: '🔄',
    interview: '🎤',
    offer: '🎉',
    rejected: '❌',
    withdrawn: '🚫',
    expired: '⌛',
  };
  return emojis[status] || '❓';
}
