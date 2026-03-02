/**
 * Data validation utilities for resume worker generation
 * @module validators
 */

const logger = require('../logger');

/**
 * Validate data.json structure and required fields
 * @param {Object} data - Data object to validate
 * @throws {Error} If validation fails with detailed error messages
 */
function validateData(data) {
  const errors = [];

  // Validate resumeDownload
  if (!data.resumeDownload) {
    errors.push('Missing resumeDownload object');
  } else {
    if (!data.resumeDownload.pdfUrl) errors.push('Missing resumeDownload.pdfUrl');
    if (!data.resumeDownload.docxUrl) errors.push('Missing resumeDownload.docxUrl');
    if (!data.resumeDownload.mdUrl) errors.push('Missing resumeDownload.mdUrl');
  }

  // Validate resume array
  if (!Array.isArray(data.resume)) {
    errors.push('resume must be an array');
  } else {
    data.resume.forEach((item, idx) => {
      // Icon check removed for minimal design
      // if (!item.icon) errors.push(`resume[${idx}]: missing icon`);
      if (!item.title) errors.push(`resume[${idx}]: missing title`);
      if (!item.description) errors.push(`resume[${idx}]: missing description`);
      if (!Array.isArray(item.stats)) errors.push(`resume[${idx}]: stats must be an array`);

      // Check for required URLs based on highlight status
      if (item.highlight && !item.completePdfUrl) {
        errors.push(`resume[${idx}]: highlighted card missing completePdfUrl`);
      }
      // Non-highlighted cards: pdfUrl/docxUrl are optional (short-term contracts may not have docs)
    });
  }

  // Validate projects array
  if (!Array.isArray(data.projects)) {
    errors.push('projects must be an array');
  } else {
    data.projects.forEach((item, idx) => {
      // Icon check removed for minimal design
      // if (!item.icon) errors.push(`projects[${idx}]: missing icon`);
      if (!item.title) errors.push(`projects[${idx}]: missing title`);
      if (!item.tech) errors.push(`projects[${idx}]: missing tech`);
      if (!item.description) errors.push(`projects[${idx}]: missing description`);

      // Link check removed: Internal projects may not have public links
      /*
      // Check for at least one link
      const hasLink =
        item.liveUrl ||
        item.repoUrl ||
        item.documentationUrl ||
        item.dashboards;
      if (!hasLink) {
        errors.push(
          `projects[${idx}]: no links provided (liveUrl, repoUrl, documentationUrl, or dashboards)`
        );
      }
      */
    });
  }

  // Validate certifications
  if (!Array.isArray(data.certifications)) {
    errors.push('certifications must be an array');
  } else {
    data.certifications.forEach((item, idx) => {
      if (!item.name) errors.push(`certifications[${idx}]: missing name`);
      if (!item.issuer) errors.push(`certifications[${idx}]: missing issuer`);
      if (!item.date && !item.status) errors.push(`certifications[${idx}]: missing date`);
    });
  }

  // Validate skills
  if (!data.skills || typeof data.skills !== 'object') {
    errors.push('skills must be an object');
  } else {
    // Dynamically validate all skill categories in the data
    // Supports two formats:
    // 1. Simple array: skills.category = ["skill1", "skill2", ...]
    // 2. Object format: skills.category = { title: "...", icon: "...", items: [...] }
    Object.entries(data.skills).forEach(([cat, value]) => {
      if (Array.isArray(value)) {
        // Simple array format - all items must be strings or {name, level} objects
        if (
          value.length > 0 &&
          !value.every(
            (item) =>
              typeof item === 'string' ||
              (typeof item === 'object' && item !== null && typeof item.name === 'string')
          )
        ) {
          errors.push(`skills.${cat} array items must be strings or {name, level} objects`);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Object format - must have items array
        if (!Array.isArray(value.items)) {
          errors.push(`skills.${cat}.items must be an array`);
        } else if (
          value.items.length > 0 &&
          !value.items.every(
            (item) =>
              typeof item === 'string' ||
              (typeof item === 'object' && item !== null && typeof item.name === 'string')
          )
        ) {
          errors.push(`skills.${cat}.items must contain strings or {name, level} objects`);
        }
      } else {
        errors.push(`skills.${cat} must be an array or object with items`);
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`Data validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  logger.log('✓ Data validation passed\n');
}

module.exports = {
  validateData,
};
