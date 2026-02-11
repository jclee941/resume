export async function update_language_cert(api, params) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for update_language_cert',
    };
  }
  if (!params.cert_id) {
    return {
      success: false,
      error: 'cert_id is required for update_language_cert',
    };
  }
  if (!params.language_cert) {
    return {
      success: false,
      error: 'language_cert object is required for update_language_cert',
    };
  }

  const result = await api.updateResumeLanguageCert(
    params.resume_id,
    params.cert_id,
    params.language_cert,
  );
  return {
    success: true,
    message: 'Language certificate updated successfully',
    language_cert: result,
  };
}

export async function add_language_cert(api, params) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for add_language_cert',
    };
  }
  if (!params.language_cert) {
    return {
      success: false,
      error: 'language_cert object is required for add_language_cert',
    };
  }

  const result = await api.addResumeLanguageCert(
    params.resume_id,
    params.language_cert,
  );
  return {
    success: true,
    message: 'Language certificate added successfully',
    language_cert: result,
  };
}

export async function delete_language_cert(api, params) {
  if (!params.resume_id) {
    return {
      success: false,
      error: 'resume_id is required for delete_language_cert',
    };
  }
  if (!params.cert_id) {
    return {
      success: false,
      error: 'cert_id is required for delete_language_cert',
    };
  }

  await api.deleteResumeLanguageCert(params.resume_id, params.cert_id);
  return {
    success: true,
    message: `Language certificate ${params.cert_id} deleted successfully`,
  };
}
