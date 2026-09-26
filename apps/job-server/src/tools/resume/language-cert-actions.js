/**
 * @typedef {Object} LanguageCertApi
 * @property {(resumeId: string | number, certId: string | number, cert: Record<string, unknown>) => Promise<Record<string, unknown>>} updateResumeLanguageCert
 * @property {(resumeId: string | number, cert: Record<string, unknown>) => Promise<Record<string, unknown>>} addResumeLanguageCert
 * @property {(resumeId: string | number, certId: string | number) => Promise<unknown>} deleteResumeLanguageCert
 */

/**
 * @typedef {Object} LanguageCertParams
 * @property {string | number} [resume_id]
 * @property {string | number} [cert_id]
 * @property {Record<string, unknown>} [language_cert]
 */

/**
 * @param {LanguageCertParams} params
 * @param {LanguageCertApi} sessionManager
 */
export async function update_language_cert(params, sessionManager) {
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

  const result = await sessionManager.updateResumeLanguageCert(
    params.resume_id,
    params.cert_id,
    params.language_cert
  );
  return {
    success: true,
    message: 'Language certificate updated successfully',
    language_cert: result,
  };
}

/**
 * @param {LanguageCertParams} params
 * @param {LanguageCertApi} sessionManager
 */
export async function add_language_cert(params, sessionManager) {
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

  const result = await sessionManager.addResumeLanguageCert(params.resume_id, params.language_cert);
  return {
    success: true,
    message: 'Language certificate added successfully',
    language_cert: result,
  };
}

/**
 * @param {LanguageCertParams} params
 * @param {LanguageCertApi} sessionManager
 */
export async function delete_language_cert(params, sessionManager) {
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

  await sessionManager.deleteResumeLanguageCert(params.resume_id, params.cert_id);
  return {
    success: true,
    message: `Language certificate ${params.cert_id} deleted successfully`,
  };
}
