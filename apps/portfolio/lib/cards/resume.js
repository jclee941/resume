const { TEMPLATE_CACHE } = require('../config');
const { escapeHtml } = require('../template-sanitizer');
const logger = require('../../logger');

function buildMetricsLine(metrics) {
  return metrics && typeof metrics === 'object'
    ? Object.entries(metrics)
        .filter(([key, value]) => key && value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${escapeHtml(String(key))}=${escapeHtml(String(value))}`)
        .join(' | ')
    : '';
}

/**
 * @description Generate resume list items HTML from JSON data
 * @param {Array} resumeData - Array of resume project objects
 * @param {string} dataHash - Hash of the data for cache validation
 * @returns {string} HTML string for resume list items
 */
function generateResumeCards(resumeData, dataHash) {
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.resumeCardsHtml) {
    logger.log('✓ Using cached resume HTML');
    return TEMPLATE_CACHE.resumeCardsHtml;
  }

  const html = resumeData
    .map((item) => {
      const metricsLine = buildMetricsLine(item.metrics);

      // Minimal list item structure
      return `
        <li class="resume-item card">
          <div class="resume-header">
            <h3 class="resume-title">${escapeHtml(item.title)}</h3>
            <span class="resume-period">${escapeHtml(item.period)}</span>
          </div>
          ${item.role ? `<p class="resume-role">${escapeHtml(item.role)}</p>` : ''}
          <p class="resume-description">${escapeHtml(item.description).replace(/\n/g, '<br>')}</p>
          ${
            item.stats && item.stats.length > 0
              ? `<div class="resume-tags">
                  ${item.stats.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
                 </div>`
              : ''
          }
          ${metricsLine ? `<div class="resume-metrics">[METRICS] ${metricsLine}</div>` : ''}
        </li>`;
    })
    .join('\n');

  TEMPLATE_CACHE.resumeCardsHtml = html;
  return html;
}

function generateResumeDescription() {
  return '';
}

module.exports = {
  generateResumeCards,
  generateResumeDescription,
};
