/**
 * Configuration constants for resume worker generation
 * @module config
 */

const CONFIG = {
  // URL Prefixes for file downloads
  DOWNLOADS_BASE_URL: 'https://raw.githubusercontent.com/jclee-homelab/resume/master',

  // Link Types
  LINK_TYPES: {
    PRIMARY: 'project-link-primary',
    SECONDARY: 'project-link-secondary',
    PDF_FULL: 'doc-link-pdf-full',
    PDF: 'doc-link-pdf',
    DOCX: 'doc-link-docx',
  },

  // Link Labels
  LINK_LABELS: {
    COMPLETE_PDF: 'Complete PDF',
    PDF: 'PDF',
    DOCX: 'DOCX',
    LIVE_DEMO: 'Live Demo',
    GITHUB: 'GitHub',
    DOCUMENTATION: 'Documentation',
    GRAFANA_HOME: 'Grafana Home',
  },

  // Card Classes
  CARD_CLASSES: {
    DOC_CARD: 'doc-card reveal-on-scroll',
    DOC_CARD_HIGHLIGHT: 'doc-card doc-card-highlight reveal-on-scroll',
    PROJECT_CARD: 'project-card reveal-on-scroll',
  },
};

// Escape patterns for template literal safety
// CRITICAL: Backslash MUST be escaped first, before backtick/dollar
// Otherwise, JS template literals interpret \\ as \ causing CSP hash mismatch
const ESCAPE_PATTERNS = {
  BACKSLASH: /\\/g,
  BACKTICK: /`/g,
  DOLLAR: /\$/g,
};

// Template cache for performance optimization
const TEMPLATE_CACHE = {
  dataHash: null,
  resumeCardsHtml: null,
  projectCardsHtml: null,
  certCardsHtml: null,
  skillsHtml: null,
};

module.exports = {
  CONFIG,
  ESCAPE_PATTERNS,
  TEMPLATE_CACHE,
};
