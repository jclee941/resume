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

function isRepeatableIndexField(name) {
  return /^[A-Za-z]+\.[Ii]ndex$/.test(name);
}

function repeatableSectionName(indexFieldName) {
  const match = indexFieldName.match(/^([A-Za-z]+)\.[Ii]ndex$/);
  return match ? match[1] : '';
}

function indexedSectionName(groupKey) {
  const match = groupKey.match(/^([A-Za-z]+)\[[^\]]+\]$/);
  return match ? match[1] : '';
}

function canReplaceRepeatableSection(sectionName) {
  return sectionName === 'Career' || sectionName === 'License';
}

function repeatableIndexKey(name) {
  const sectionName = repeatableSectionName(name);
  return sectionName ? `${sectionName}.index` : name;
}

/**
 * Smart merge: overlay target fields onto base fields, skipping sections
 * where the target override is incomplete compared to the base.
 * This prevents server validation errors on partially-mapped sections.
 */
export function smartMergeFields(baseFields, targetFields, tokens = {}) {
  const baseGroups = groupFieldsByIndex(baseFields);
  const targetGroups = groupFieldsByIndex(targetFields);
  const baseRepeatableNames = new Set(
    baseFields
      .filter((field) => isRepeatableIndexField(field.name))
      .map((field) => repeatableIndexKey(field.name))
  );
  const targetRepeatableNames = new Set(
    targetFields
      .filter((field) => isRepeatableIndexField(field.name))
      .map((field) => repeatableIndexKey(field.name))
  );
  const replacedRepeatableNames = new Set(
    Array.from(targetRepeatableNames).filter((name) =>
      canReplaceRepeatableSection(repeatableSectionName(name))
    )
  );
  const replacedRepeatableSections = new Set(
    Array.from(replacedRepeatableNames)
      .map((name) => repeatableSectionName(name))
      .filter(Boolean)
  );
  const maxBaseCountBySection = new Map();
  for (const [key, baseCount] of Object.entries(baseGroups)) {
    const sectionName = indexedSectionName(key);
    if (!sectionName) continue;
    maxBaseCountBySection.set(
      sectionName,
      Math.max(maxBaseCountBySection.get(sectionName) ?? 0, baseCount)
    );
  }

  // Detect sections where our mapping is incomplete
  const skipPrefixes = new Set();
  for (const [key, targetCount] of Object.entries(targetGroups)) {
    const baseCount = baseGroups[key] || 0;
    const sectionName = indexedSectionName(key);
    const maxBaseCount = maxBaseCountBySection.get(sectionName) ?? 0;
    if (
      targetCount < baseCount ||
      (!canReplaceRepeatableSection(sectionName) && baseCount === 0 && targetCount < maxBaseCount)
    ) {
      skipPrefixes.add(`${key}.`);
    }
  }
  // Fields that must always overlay even inside an "incomplete" section, because
  // JobKorea server-side validation rejects a stale/mis-formatted base value
  // (e.g. UnivSchool date fields stored dotted as "2024.03" instead of "202403").
  const FORCE_OVERLAY = /\.(Entc_YM|Grad_YM|CSYM|CEYM|Lc_YYMM)$/;

  const merged = new Map();
  const repeatableFields = [];
  for (const field of baseFields) {
    const baseIndexedMatch = field.name.match(/^([A-Za-z]+)\[[^\]]+\]\./);
    if (baseIndexedMatch && replacedRepeatableSections.has(baseIndexedMatch[1])) {
      continue;
    }

    if (isRepeatableIndexField(field.name)) {
      if (!replacedRepeatableNames.has(repeatableIndexKey(field.name))) {
        repeatableFields.push({ name: field.name, value: field.value ?? '' });
      }
      continue;
    }

    merged.set(field.name, field.value ?? '');
  }

  // Apply target overrides, skipping incomplete sections (except forced fields)
  for (const f of targetFields) {
    let skip = false;
    for (const prefix of skipPrefixes) {
      if (f.name.startsWith(prefix)) {
        skip = true;
        break;
      }
    }
    if (!skip || FORCE_OVERLAY.test(f.name)) {
      if (isRepeatableIndexField(f.name)) {
        const fieldKey = repeatableIndexKey(f.name);
        if (replacedRepeatableNames.has(fieldKey) || !baseRepeatableNames.has(fieldKey)) {
          repeatableFields.push({ name: f.name, value: f.value ?? '' });
        }
        continue;
      }

      merged.set(f.name, f.value ?? '');
    }
  }

  // Overlay tokens (IsEditPage, LastEditDateTicks, etc.)
  for (const [name, value] of Object.entries(tokens)) {
    merged.set(name, value ?? '');
  }

  return [
    ...Array.from(merged.entries()).map(([name, value]) => ({ name, value })),
    ...repeatableFields,
  ];
}
