import { MESSAGE_TYPES, PRIORITY } from './queue-message-constants.js';

export const QUEUE_NAME = 'crawl-tasks';

const TYPES = Object.values(MESSAGE_TYPES);
const PRIORITIES = Object.values(PRIORITY);
const MAX_DELAY_SECONDS = 43200;

export function getQueueCapability(env) {
  const available = typeof env?.CRAWL_TASKS?.send === 'function';
  const capability = {
    status: available ? 'ok' : 'disabled',
    available,
    queue: QUEUE_NAME,
  };

  if (available) {
    return { ...capability, types: TYPES, priorities: PRIORITIES };
  }
  return capability;
}

export async function parseQueueRequest(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: 'Invalid JSON payload' };
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be an object' };
  }
  if (!TYPES.includes(body.type)) {
    return { ok: false, error: `Invalid type. Must be one of: ${TYPES.join(', ')}` };
  }
  if (body.payload === null || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    return { ok: false, error: 'Payload must be a non-null object' };
  }

  const priority = body.priority ?? PRIORITY.BACKGROUND;
  if (!PRIORITIES.includes(priority)) {
    return { ok: false, error: `Invalid priority. Must be one of: ${PRIORITIES.join(', ')}` };
  }

  const delaySeconds = body.delaySeconds ?? 0;
  if (!Number.isInteger(delaySeconds) || delaySeconds < 0 || delaySeconds > MAX_DELAY_SECONDS) {
    return { ok: false, error: 'delaySeconds must be an integer between 0 and 43200' };
  }

  return {
    ok: true,
    value: { type: body.type, payload: body.payload, priority, delaySeconds },
  };
}
