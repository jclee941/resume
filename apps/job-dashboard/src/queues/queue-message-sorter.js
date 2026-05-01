import { PRIORITY } from './queue-message-constants.js';

export function sortMessagesByPriority(messages) {
  return [...messages].sort((a, b) => {
    const priorityA = a.body?.priority === PRIORITY.URGENT ? 0 : 1;
    const priorityB = b.body?.priority === PRIORITY.URGENT ? 0 : 1;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.body?.createdAt || 0) - (b.body?.createdAt || 0);
  });
}
