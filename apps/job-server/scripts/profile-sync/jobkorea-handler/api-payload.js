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
  const hasCompleteSaveFlag = fields.some((field) => field?.name === 'hdnIsCompleteSave');

  if (!hasCompleteSaveFlag) {
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
