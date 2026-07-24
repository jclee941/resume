function normalizePublicValue(value) {
  return String(value)
    .normalize('NFC')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\u00a0', ' ')
    .split('\n')
    .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trim())
    .filter((line, index, lines) => line || (index > 0 && index < lines.length - 1))
    .join('\n')
    .trim();
}

function occurrenceAddress(item) {
  return JSON.stringify([
    item.locale,
    item.route,
    item.state,
    item.viewport.key,
    item.kind,
    item.selector,
    item.attribute,
    item.accessiblePath,
    item.occurrenceIndex,
  ]);
}

function pointerEscape(value) {
  return String(value).replaceAll('~', '~0').replaceAll('/', '~1');
}

function walkAccessible(value, pointer = '', output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkAccessible(item, `${pointer}/${index}`, output));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const next = `${pointer}/${pointerEscape(key)}`;
      if (normalizePublicValue(key)) output.push({ path: next, value: normalizePublicValue(key) });
      walkAccessible(child, next, output);
    }
  } else if (typeof value === 'string' && normalizePublicValue(value)) {
    output.push({ path: pointer || '/', value: normalizePublicValue(value) });
  }
  return output;
}

function normalizeVolatile(item) {
  if (item.kind === 'jsonld' && item.selector.endsWith('/dateModified')) {
    if (Number.isNaN(Date.parse(item.value))) throw new Error(`Invalid dateModified: ${item.value}`);
    return { ...item, value: '<DEPLOYED_AT>' };
  }
  if (item.volatile === 'footer-deployed') {
    const match = item.value.match(/^(deployed)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})Z$/);
    if (!match || Number.isNaN(Date.parse(`${match[2]}T${match[3]}:00Z`))) {
      throw new Error(`Invalid baseline footer deployment: ${item.value}`);
    }
    return { ...item, value: `${match[1]} <DEPLOYED_AT_MINUTE>` };
  }
  return item;
}

module.exports = { normalizePublicValue, normalizeVolatile, occurrenceAddress, walkAccessible };
