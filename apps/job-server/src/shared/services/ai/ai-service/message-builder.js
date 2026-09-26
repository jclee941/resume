/**
 * Build chat messages from a completion prompt.
 * @param {string} prompt
 * @param {string} [systemPrompt]
 * @returns {Array<{ role: string, content: string }>}
 */
export function buildCompletionMessages(prompt, systemPrompt) {
  /** @type {Array<{ role: string, content: string }>} */
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  return messages;
}
