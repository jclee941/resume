#!/usr/bin/env node
/**
 * Fill missing careers[].projects[] data in EN/JA locale files.
 *
 * Source of truth: packages/data/resumes/master/resume_data.json (KO).
 * Strategy: copy techStack as-is (English tech terms); use curated EN/JA
 * translations for name/description/achievements. Idempotent: skip entries
 * that already have techStack and achievements populated.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { TRANSLATIONS } from './fill-locale-subprojects-data.mjs';

const root = resolve(import.meta.dirname, '../../..');
const koPath = resolve(root, 'packages/data/resumes/master/resume_data.json');
const enPath = resolve(root, 'packages/data/resumes/master/resume_data_en.json');
const jaPath = resolve(root, 'packages/data/resumes/master/resume_data_ja.json');

const ko = JSON.parse(readFileSync(koPath, 'utf-8'));
const en = JSON.parse(readFileSync(enPath, 'utf-8'));
const ja = JSON.parse(readFileSync(jaPath, 'utf-8'));

let changes = 0;

function syncLocale(locale, label) {
  ko.careers.forEach((koCareer, i) => {
    const koProject = koCareer.projects?.[0];
    if (!koProject) return;
    const tr = TRANSLATIONS[koProject.name];
    if (!tr) {
      console.warn(`[skip] No translation for KO project name: ${koProject.name}`);
      return;
    }
    const trData = tr[label];
    if (!trData) return;

    const localeCareer = locale.careers[i];
    if (!localeCareer) return;
    if (!Array.isArray(localeCareer.projects)) localeCareer.projects = [];

    let proj = localeCareer.projects[0];
    if (!proj) {
      // Create new project entry
      proj = {
        name: trData.name,
        description: trData.description,
        period: koProject.period,
        techStack: [...koProject.techStack],
        achievements: [...trData.achievements],
      };
      localeCareer.projects[0] = proj;
      changes++;
      console.log(`[${label}] career[${i}] created projects[0]: ${trData.name}`);
      return;
    }

    // Patch existing entry
    if (!proj.techStack || proj.techStack.length === 0) {
      proj.techStack = [...koProject.techStack];
      changes++;
      console.log(`[${label}] career[${i}] added techStack`);
    }
    if (!proj.achievements || proj.achievements.length === 0) {
      proj.achievements = [...trData.achievements];
      changes++;
      console.log(`[${label}] career[${i}] added achievements`);
    }
  });
}

syncLocale(en, 'en');
syncLocale(ja, 'ja');

writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);
writeFileSync(jaPath, `${JSON.stringify(ja, null, 2)}\n`);

console.log(`\n✅ Total changes: ${changes}`);
