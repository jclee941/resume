/**
 * @param {Record<string, string>} current
 * @param {Record<string, string>} target
 * @returns {Array<{field: string, from: string, to: string}>}
 */
export function computeDiff(current, target) {
  const changes = [];
  for (const [key, targetValue] of Object.entries(target)) {
    const currentValue = current[key];
    if (currentValue !== targetValue) {
      changes.push({
        field: key,
        from: currentValue || '(empty)',
        to: targetValue,
      });
    }
  }
  return changes;
}
