'use strict';

/**
 * Transform SSoT skills (apps/portfolio/data.json `skills`) into the shape the
 * client-side skill-radar widget expects, so the radar reflects real resume
 * data instead of a stale hardcoded copy.
 *
 * SSoT shape:
 *   skills: {
 *     <category>: { title: string, icon: <lucide name>, items: [{ name, level }] }
 *   }
 * level is a string: 'expert' | 'advanced' | 'intermediate' | 'beginner'.
 *
 * Radar shape:
 *   {
 *     <category>: { title, icon: <inline SVG>, skills: [{ name, level: <0-100>, evidence }] }
 *   }
 *
 * @module skill-radar-data
 */

/** Map SSoT proficiency strings to the radar's 0-100 scale. */
const LEVEL_MAP = {
  expert: 95,
  advanced: 80,
  intermediate: 60,
  beginner: 35,
};

/**
 * Inline SVG icons keyed by the lucide icon name used in the SSoT.
 * Falls back to a generic glyph for unknown names.
 */
const ICON_SVG = {
  Activity:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  Cloud:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
  GitBranch:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
  Zap: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  Database:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>',
  Shield:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>',
  Code: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
};

const FALLBACK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>';

/**
 * Build the radar data object from SSoT skills.
 * @param {Object} skills - The `skills` object from data.json.
 * @returns {Object} Radar-shaped skill data. Empty object if input invalid.
 */
function buildSkillRadarData(skills) {
  if (!skills || typeof skills !== 'object') return {};

  const out = {};
  for (const [category, data] of Object.entries(skills)) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) continue;
    out[category] = {
      title: String(data.title || category),
      icon: ICON_SVG[data.icon] || FALLBACK_ICON,
      skills: data.items.map((item) => {
        const levelKey = String(item.level || 'intermediate').toLowerCase();
        return {
          name: String(item.name || 'Unknown'),
          level: LEVEL_MAP[levelKey] != null ? LEVEL_MAP[levelKey] : 60,
          // SSoT has no per-skill evidence; surface the proficiency tier instead.
          evidence: `${levelKey.charAt(0).toUpperCase()}${levelKey.slice(1)} proficiency`,
        };
      }),
    };
  }
  return out;
}

module.exports = { buildSkillRadarData, LEVEL_MAP, ICON_SVG };
