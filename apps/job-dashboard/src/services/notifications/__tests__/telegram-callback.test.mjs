import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleTelegramCallback } from '../telegram-commands.js';

// Regression: Telegram's callback_query.data is optional, and a query without it made
// handleTelegramCallback throw a TypeError instead of reporting invalid callback data.
test('reports invalid callback data when the query carries no data', async () => {
  const result = await handleTelegramCallback({}, { id: 'query-1' });

  assert.deepEqual(result, { handled: false, reason: 'invalid_callback_data' });
});
