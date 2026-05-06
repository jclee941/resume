export function getStatusEmoji(status) {
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
