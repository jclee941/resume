/**
 * Lightweight input validation for Cloudflare Workers
 * No external dependencies - used instead of Zod for bundle size
 */

/**
 * Validate and sanitize application create payload
 * @param {Object} body - Raw request body
 * @returns {{ valid: boolean, data?: Object, errors?: string[] }}
 */
export function validateApplicationCreate(body) {
  const errors = [];
  const job = body?.job || body || {};
  const options = body?.options || {};

  // Extract and validate required fields
  const position = job.position || job.title;
  if (!position || typeof position !== 'string') {
    errors.push('position/title is required and must be a string');
  } else if (position.length > 500) {
    errors.push('position/title must be 500 characters or less');
  }

  const company = job.company;
  if (!company || typeof company !== 'string') {
    errors.push('company is required and must be a string');
  } else if (company.length > 200) {
    errors.push('company must be 200 characters or less');
  }

  // Validate optional string fields
  const stringFields = ['location', 'notes', 'source', 'platform'];
  for (const field of stringFields) {
    const value = job[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      } else if (value.length > 1000) {
        errors.push(`${field} must be 1000 characters or less`);
      }
    }
  }

  // Validate URL fields
  const urlFields = ['sourceUrl', 'source_url', 'jobUrl', 'job_url'];
  for (const field of urlFields) {
    const value = job[field] || body[field];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      } else if (!isValidUrl(value)) {
        errors.push(`${field} must be a valid URL`);
      } else if (value.length > 2000) {
        errors.push(`${field} must be 2000 characters or less`);
      }
    }
  }

  // Validate status if provided
  const VALID_STATUSES = [
    'pending',
    'saved',
    'applied',
    'viewed',
    'in_progress',
    'interview',
    'offer',
    'rejected',
    'withdrawn',
    'expired',
  ];
  const status = body.status || job.status || options.status;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // Validate priority if provided
  const VALID_PRIORITIES = ['low', 'medium', 'high'];
  const priority = job.priority || options.priority;
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  // Validate match score
  const matchScoreRaw =
    job.matchScore ??
    job.match_score ??
    job.matchPercentage ??
    job.match_percentage;
  if (matchScoreRaw !== undefined && matchScoreRaw !== null) {
    const score = Number(matchScoreRaw);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push('matchScore must be a number between 0 and 100');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: body };
}

/**
 * Validate application update payload
 * @param {Object} body - Raw request body
 * @returns {{ valid: boolean, data?: Object, errors?: string[] }}
 */
export function validateApplicationUpdate(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  // Validate notes if provided
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      errors.push('notes must be a string');
    } else if (body.notes.length > 5000) {
      errors.push('notes must be 5000 characters or less');
    }
  }

  // Validate priority if provided
  const VALID_PRIORITIES = ['low', 'medium', 'high'];
  if (
    body.priority !== undefined &&
    !VALID_PRIORITIES.includes(body.priority)
  ) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  // Validate resumeId if provided
  if (body.resumeId !== undefined && body.resumeId !== null) {
    if (typeof body.resumeId !== 'string') {
      errors.push('resumeId must be a string');
    } else if (body.resumeId.length > 100) {
      errors.push('resumeId must be 100 characters or less');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: body };
}

/**
 * Validate status update payload
 * @param {Object} body - Raw request body
 * @returns {{ valid: boolean, data?: Object, errors?: string[] }}
 */
export function validateStatusUpdate(body) {
  const errors = [];
  const VALID_STATUSES = [
    'pending',
    'saved',
    'applied',
    'viewed',
    'in_progress',
    'interview',
    'offer',
    'rejected',
    'withdrawn',
    'expired',
  ];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  if (!body.status) {
    errors.push('status is required');
  } else if (!VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.note !== undefined && typeof body.note !== 'string') {
    errors.push('note must be a string');
  } else if (body.note && body.note.length > 1000) {
    errors.push('note must be 1000 characters or less');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: body };
}

/**
 * Simple URL validation
 * @param {string} str
 * @returns {boolean}
 */
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
