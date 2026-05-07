function isValidSkillItem(item) {
  return typeof item === 'string' || (typeof item === 'object' && item !== null && typeof item.name === 'string');
}

function validateSkillCategory(errors, category, value) {
  if (Array.isArray(value)) {
    if (value.length > 0 && !value.every(isValidSkillItem)) {
      errors.push(`skills.${category} array items must be strings or {name, level} objects`);
    }
    return;
  }
  if (typeof value === 'object' && value !== null) {
    if (!Array.isArray(value.items)) {
      errors.push(`skills.${category}.items must be an array`);
    } else if (value.items.length > 0 && !value.items.every(isValidSkillItem)) {
      errors.push(`skills.${category}.items must contain strings or {name, level} objects`);
    }
    return;
  }
  errors.push(`skills.${category} must be an array or object with items`);
}

export function validatePortfolioData(data, options = {}) {
  const errors = [];

  if (!data.resumeDownload) {
    errors.push('Missing resumeDownload object');
  } else {
    if (!data.resumeDownload.pdfUrl) errors.push('Missing resumeDownload.pdfUrl');
    if (!data.resumeDownload.docxUrl) errors.push('Missing resumeDownload.docxUrl');
    if (!data.resumeDownload.mdUrl) errors.push('Missing resumeDownload.mdUrl');
  }

  if (!Array.isArray(data.resume)) {
    errors.push('resume must be an array');
  } else {
    data.resume.forEach((item, idx) => {
      if (!item.title) errors.push(`resume[${idx}]: missing title`);
      if (!item.description) errors.push(`resume[${idx}]: missing description`);
      if (!Array.isArray(item.stats)) errors.push(`resume[${idx}]: stats must be an array`);
      if (item.highlight && !item.completePdfUrl) errors.push(`resume[${idx}]: highlighted card missing completePdfUrl`);
    });
  }

  if (!Array.isArray(data.projects)) {
    errors.push('projects must be an array');
  } else {
    data.projects.forEach((item, idx) => {
      if (!item.title) errors.push(`projects[${idx}]: missing title`);
      if (!item.tech) errors.push(`projects[${idx}]: missing tech`);
      if (!item.description) errors.push(`projects[${idx}]: missing description`);
    });
  }

  if (!Array.isArray(data.certifications)) {
    errors.push('certifications must be an array');
  } else {
    data.certifications.forEach((item, idx) => {
      if (!item.name) errors.push(`certifications[${idx}]: missing name`);
      if (!item.issuer) errors.push(`certifications[${idx}]: missing issuer`);
      if (!item.date && !item.status) errors.push(`certifications[${idx}]: missing date`);
    });
  }

  if (!data.skills || typeof data.skills !== 'object') {
    errors.push('skills must be an object');
  } else {
    Object.entries(data.skills).forEach(([category, value]) => validateSkillCategory(errors, category, value));
  }

  if (errors.length > 0) throw new Error(`Data validation failed:\n  - ${errors.join('\n  - ')}`);
  options.logger?.log?.('✓ Data validation passed\n');
}
