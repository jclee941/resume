/**
 * Owner-specific expectations for the e2e specs, read from the content that is
 * materialized for the build instead of being pinned as literals:
 * - master resume JSON / generated portfolio data via tests/helpers/owner-data.js
 * - the hero copy module the Worker renders the hero from
 */
const { HERO_CONTENT } = require('../../../apps/portfolio/lib/hero-content-data');
const {
  escapeRegExp,
  loadMaster,
  loadPortfolioData,
  ownerIdentity,
  siteOrigin,
} = require('../../helpers/owner-data');

const LOCALES = ['ko', 'en', 'ja'];

/** Matches the owner's display name in any locale. */
function ownerNamePattern() {
  const names = new Set(LOCALES.map((locale) => ownerIdentity(locale).name));
  return new RegExp([...names].map(escapeRegExp).join('|'));
}

/** Matches the published canonical URL of the root, /en/ or /ja/ page. */
function canonicalUrlPattern() {
  return new RegExp(`^${escapeRegExp(siteOrigin())}/(?:en/|ja/)?$`);
}

/** Canonical URL of a locale path such as "/", "/en/" or "/ja/". */
function canonicalUrl(pathname) {
  return `${siteOrigin()}${pathname}`;
}

/** Hiring mailto link the hero renders for a locale. */
function hiringMailto(locale) {
  const subject = encodeURIComponent(HERO_CONTENT[locale].mailSubject);
  return `mailto:${ownerIdentity('ko').email}?subject=${subject}`;
}

/** Project titles of a locale in the order the page sorts them (displayOrder). */
function projectTitlesInDisplayOrder(locale) {
  return [...loadPortfolioData(locale).projects]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((project) => project.title);
}

module.exports = {
  HERO_CONTENT,
  LOCALES,
  canonicalUrl,
  canonicalUrlPattern,
  hiringMailto,
  loadMaster,
  loadPortfolioData,
  ownerIdentity,
  ownerNamePattern,
  projectTitlesInDisplayOrder,
};
