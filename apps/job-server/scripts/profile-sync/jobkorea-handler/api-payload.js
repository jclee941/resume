export function encodeFormFields(fields) {
  const params = new URLSearchParams();

  for (const field of fields || []) {
    if (!field || typeof field.name !== 'string') {
      continue;
    }
    params.append(field.name, field.value ?? '');
  }

  return params.toString();
}

export function buildSavePayload(formFields) {
  const fields = Array.isArray(formFields) ? [...formFields] : [];
  if (!fields.some((f) => f && f.name === 'hdnIsCompleteSave')) {
    fields.push({ name: 'hdnIsCompleteSave', value: 'False' });
  }
  return encodeFormFields(fields);
}

export function buildPortfolioPayload(url) {
  return encodeFormFields([
    { name: 'File_Name', value: url },
    { name: 'Display_File_Name', value: url },
    { name: 'File_Type', value: '2' },
    { name: 'File_Up_Stat', value: '2' },
    { name: 'File_Size', value: '0' },
  ]);
}

function groupFieldsByIndex(fields) {
  const groups = {};
  for (const f of fields) {
    const m = f.name.match(/^([A-Za-z]+)\[([^\]]+)\]\./);
    if (m) {
      const key = `${m[1]}[${m[2]}]`;
      groups[key] = (groups[key] || 0) + 1;
    }
  }
  return groups;
}

/**
 * Smart merge: overlay target fields onto base fields, skipping sections
 * where the target override is incomplete compared to the base.
 * This prevents server validation errors on partially-mapped sections.
 */
export function smartMergeFields(baseFields, targetFields, tokens = {}) {
  const baseMap = new Map(baseFields.map((f) => [f.name, f.value ?? '']));
  const baseGroups = groupFieldsByIndex(baseFields);
  const targetGroups = groupFieldsByIndex(targetFields);

  // Detect sections where our mapping is incomplete
  const skipPrefixes = new Set();
  for (const [key, targetCount] of Object.entries(targetGroups)) {
    const baseCount = baseGroups[key] || 0;
    if (targetCount < baseCount) {
      skipPrefixes.add(`${key}.`);
    }
  }

  // Start with base fields
  const merged = new Map(baseMap);

  // Apply target overrides, skipping incomplete sections
  for (const f of targetFields) {
    let skip = false;
    for (const prefix of skipPrefixes) {
      if (f.name.startsWith(prefix)) {
        skip = true;
        break;
      }
    }
    if (!skip) {
      merged.set(f.name, f.value ?? '');
    }
  }

  // Overlay tokens (IsEditPage, LastEditDateTicks, etc.)
  for (const [name, value] of Object.entries(tokens)) {
    merged.set(name, value ?? '');
  }

  return Array.from(merged.entries()).map(([name, value]) => ({ name, value }));
}
