/**
 * Content transformation helpers for resume variants.
 *
 * Section filtering, keyword emphasis, and length truncation applied
 * to parsed master resume sections before writing variant files.
 */

/**
 * Filter sections based on variant configuration
 */
function filterSections(sections, variantConfig) {
  if (variantConfig.sections.includes('all')) {
    return sections;
  }

  const filtered = {};

  for (const [key, content] of Object.entries(sections)) {
    // Check if section matches any allowed section pattern
    const isIncluded = variantConfig.sections.some(pattern => {
      if (pattern.endsWith('-recent')) {
        return key.startsWith(pattern.replace('-recent', ''));
      }
      if (pattern.endsWith('-technical') || pattern.endsWith('-security')) {
        return key.includes(pattern.split('-')[0]);
      }
      return key.includes(pattern);
    });

    if (isIncluded) {
      filtered[key] = content;
    }
  }

  return filtered;
}

/**
 * Emphasize specific keywords in content
 */
function emphasizeContent(content, keywords) {
  if (!keywords || keywords.length === 0) {
    return content;
  }

  // Split into lines and filter/sort by keyword relevance
  const lines = content.split('\n');
  const scored = lines.map(line => {
    const score = keywords.reduce((acc, keyword) => {
      return acc + (line.toLowerCase().includes(keyword) ? 1 : 0);
    }, 0);
    return {line, score};
  });

  // Keep high-scoring lines and essential structure
  return scored
    .filter(
      item =>
        item.score > 0 || item.line.startsWith('#') || item.line.startsWith('-')
    )
    .map(item => item.line)
    .join('\n');
}

/**
 * Truncate content to maximum length
 */
function truncateContent(content, maxLength) {
  if (!maxLength) {
    return content;
  }

  const words = content.split(/\s+/);
  if (words.length <= maxLength) {
    return content;
  }

  // Truncate at maxLength words
  const truncated = words.slice(0, maxLength).join(' ');

  // Try to end at a section boundary
  const lastSection = truncated.lastIndexOf('\n## ');
  if (lastSection > maxLength * 0.8) {
    return truncated.substring(0, lastSection);
  }

  return `${truncated  }\n\n---\n\n*(Resume truncated for brevity)*`;
}

module.exports = {filterSections, emphasizeContent, truncateContent};
