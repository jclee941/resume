'use strict';

const fs = require('fs');
const path = require('path');

const MASTER_DIR = path.resolve(__dirname, '../../../packages/data/resumes/master');

/**
 * Identity of the portfolio owner as it appears in the resume data.
 * @typedef {Object} OwnerIdentity
 * @property {string} nameKo - Korean name
 * @property {string} nameEn - English name (given name first)
 * @property {string} nameJa - Japanese name
 * @property {string} email - Public contact email
 */

/**
 * @param {string} nameEn
 * @returns {string} English name with the family name first
 */
function familyNameFirst(nameEn) {
  return nameEn.split(' ').reverse().join(' ');
}

/**
 * @param {string} value
 * @returns {string} value escaped for use inside a RegExp source
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Read the identity from the generated portfolio data files the build loads.
 * @param {{ ko: string, en?: string, ja?: string }} raw - data.json, data_en.json, data_ja.json contents
 * @returns {OwnerIdentity}
 */
function ownerIdentityFromPortfolioData(raw) {
  const fallback = defaultOwnerIdentity();
  /** @param {string | undefined} json */
  const parse = (json) => (json ? JSON.parse(json) : {});
  const ko = parse(raw.ko);
  const en = parse(raw.en);
  const ja = parse(raw.ja);
  return {
    nameKo: ko.hero?.title ?? fallback.nameKo,
    nameEn: en.hero?.titleEn ?? fallback.nameEn,
    nameJa: ja.hero?.title ?? fallback.nameJa,
    email: ko.contact?.email ?? fallback.email,
  };
}

/** @type {OwnerIdentity | undefined} */
let cachedDefaultIdentity;

/**
 * Identity read from the master resume data, for callers outside the build
 * orchestrator that were not handed an identity.
 * @returns {OwnerIdentity}
 */
function defaultOwnerIdentity() {
  if (!cachedDefaultIdentity) {
    /** @param {string} file */
    const personal = (file) =>
      JSON.parse(fs.readFileSync(path.join(MASTER_DIR, file), 'utf8')).personal;
    const ko = personal('resume_data.json');
    cachedDefaultIdentity = {
      nameKo: ko.name,
      nameEn: personal('resume_data_en.json').name,
      nameJa: personal('resume_data_ja.json').name,
      email: ko.email,
    };
  }
  return cachedDefaultIdentity;
}

module.exports = {
  defaultOwnerIdentity,
  escapeRegExp,
  familyNameFirst,
  ownerIdentityFromPortfolioData,
};
