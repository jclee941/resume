#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function deterministicUuid(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

const PROFILE_ID = deterministicUuid('resume-profile-ko-jclee');

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function escapeJsonb(obj) {
  if (obj === null || obj === undefined) return 'NULL';
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

function escapeArray(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  return 'ARRAY[' + arr.map((item) => escapeSql(item)).join(', ') + ']';
}

function escapeInteger(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'NULL';
  return String(Math.trunc(number));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePeriod(period) {
  if (!period) return '';
  return String(period)
    .replace(/\s+-\s+/g, ' ~ ')
    .trim();
}

function parseMonthValue(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '현재') return null;
  const match = trimmed.match(/^(\d{4})\.(\d{2})$/);
  if (!match) return null;
  return match[1] + '-' + match[2] + '-01';
}

function parsePeriod(period) {
  const normalized = normalizePeriod(period);
  if (!normalized) {
    return {
      startDate: null,
      endDate: null,
    };
  }

  const parts = normalized.split('~').map((part) => part.trim());
  if (parts.length !== 2) {
    return {
      startDate: null,
      endDate: null,
    };
  }

  return {
    startDate: parseMonthValue(parts[0]),
    endDate: parseMonthValue(parts[1]),
  };
}

function normalizeCertificationStatus(status) {
  if (status === '준비중') return 'preparing';
  return status || 'active';
}

function buildUpdateAssignments(columns) {
  return columns.map((column) => column + ' = EXCLUDED.' + column).concat(['updated_at = now()']);
}

function buildUpsert(table, columns, values, conflictTarget, updateAssignments) {
  return [
    'INSERT INTO ' + table + ' (' + columns.join(', ') + ')',
    'VALUES (' + values.join(', ') + ')',
    'ON CONFLICT ' + conflictTarget + ' DO UPDATE SET',
    '  ' + updateAssignments.join(',\n  ') + ';',
  ].join('\n');
}

function buildResumeProfileStatement(data) {
  const columns = [
    'id',
    'locale',
    'slug',
    'personal',
    'education',
    'military',
    'summary',
    'current_employment',
    'career_gap',
    'hero',
    'section_descriptions',
    'contact',
    'achievements',
  ];
  const values = [
    escapeSql(PROFILE_ID),
    escapeSql('ko'),
    escapeSql('jclee'),
    escapeJsonb(data.personal),
    escapeJsonb(data.education),
    escapeJsonb(data.military),
    escapeJsonb(data.summary),
    escapeJsonb(data.current),
    escapeJsonb(data.careerGap),
    escapeJsonb(data.hero),
    escapeJsonb(data.sectionDescriptions),
    escapeJsonb(data.contact),
    escapeArray(ensureArray(data.achievements)),
  ];
  const updateAssignments = buildUpdateAssignments([
    'locale',
    'personal',
    'education',
    'military',
    'summary',
    'current_employment',
    'career_gap',
    'hero',
    'section_descriptions',
    'contact',
    'achievements',
  ]);
  return buildUpsert('resume_profiles', columns, values, '(slug)', updateAssignments);
}

function buildCareerStatements(careers) {
  return ensureArray(careers).map((career, index) => {
    const dates = parsePeriod(career.period);
    const columns = [
      'id',
      'resume_id',
      'company',
      'period',
      'start_date',
      'end_date',
      'duration',
      'project',
      'role',
      'client',
      'description',
      'display_order',
    ];
    const values = [
      escapeSql(deterministicUuid('career-' + index)),
      escapeSql(PROFILE_ID),
      escapeSql(career.company),
      escapeSql(career.period),
      escapeSql(dates.startDate),
      escapeSql(dates.endDate),
      escapeSql(career.duration),
      escapeSql(career.project),
      escapeSql(career.role),
      escapeSql(career.client),
      escapeSql(career.description),
      escapeInteger(index),
    ];
    const updateAssignments = buildUpdateAssignments([
      'resume_id',
      'company',
      'period',
      'start_date',
      'end_date',
      'duration',
      'project',
      'role',
      'client',
      'description',
      'display_order',
    ]);
    return buildUpsert('resume_careers', columns, values, '(id)', updateAssignments);
  });
}

function buildProjectStatements(projects) {
  return ensureArray(projects).map((project, index) => {
    const dates = parsePeriod(project.period);
    const columns = [
      'id',
      'resume_id',
      'career_id',
      'period',
      'start_date',
      'end_date',
      'name',
      'client',
      'technologies',
      'os',
      'role',
      'description',
      'metrics',
      'display_order',
    ];
    const values = [
      escapeSql(deterministicUuid('project-' + index)),
      escapeSql(PROFILE_ID),
      'NULL',
      escapeSql(project.period),
      escapeSql(dates.startDate),
      escapeSql(dates.endDate),
      escapeSql(project.name),
      escapeSql(project.client),
      escapeArray(ensureArray(project.technologies)),
      escapeSql(project.os),
      escapeSql(project.role),
      escapeSql(project.description),
      escapeJsonb(project.metrics),
      escapeInteger(index),
    ];
    const updateAssignments = buildUpdateAssignments([
      'resume_id',
      'career_id',
      'period',
      'start_date',
      'end_date',
      'name',
      'client',
      'technologies',
      'os',
      'role',
      'description',
      'metrics',
      'display_order',
    ]);
    return buildUpsert('resume_projects', columns, values, '(id)', updateAssignments);
  });
}

function buildCertificationStatements(certifications) {
  return ensureArray(certifications).map((certification, index) => {
    const columns = [
      'id',
      'resume_id',
      'name',
      'issuer',
      'date',
      'expiration_date',
      'credential_id',
      'credential_url',
      'status',
      'display_order',
    ];
    const values = [
      escapeSql(deterministicUuid('cert-' + index)),
      escapeSql(PROFILE_ID),
      escapeSql(certification.name),
      escapeSql(certification.issuer),
      escapeSql(certification.date),
      escapeSql(certification.expirationDate),
      escapeSql(certification.credentialId),
      escapeSql(certification.credentialUrl),
      escapeSql(normalizeCertificationStatus(certification.status)),
      escapeInteger(index),
    ];
    const updateAssignments = buildUpdateAssignments([
      'resume_id',
      'name',
      'issuer',
      'date',
      'expiration_date',
      'credential_id',
      'credential_url',
      'status',
      'display_order',
    ]);
    return buildUpsert('resume_certifications', columns, values, '(id)', updateAssignments);
  });
}

function buildSkillCategoryRows(skills) {
  return Object.entries(skills || {}).map(([key, value], index) => ({
    id: deterministicUuid('skill-cat-' + key),
    key,
    title: value?.title ?? null,
    icon: value?.icon ?? null,
    items: ensureArray(value?.items),
    displayOrder: index,
  }));
}

function buildSkillCategoryStatements(rows) {
  return rows.map((row) => {
    const columns = ['id', 'resume_id', 'key', 'title', 'icon', 'display_order'];
    const values = [
      escapeSql(row.id),
      escapeSql(PROFILE_ID),
      escapeSql(row.key),
      escapeSql(row.title),
      escapeSql(row.icon),
      escapeInteger(row.displayOrder),
    ];
    const updateAssignments = buildUpdateAssignments([
      'resume_id',
      'key',
      'title',
      'icon',
      'display_order',
    ]);
    return buildUpsert('resume_skill_categories', columns, values, '(id)', updateAssignments);
  });
}

function buildSkillStatements(categoryRows) {
  const statements = [];
  for (const categoryRow of categoryRows) {
    categoryRow.items.forEach((item, itemIndex) => {
      const columns = ['id', 'category_id', 'name', 'level', 'proficiency', 'display_order'];
      const values = [
        escapeSql(deterministicUuid('skill-' + categoryRow.key + '-' + itemIndex)),
        escapeSql(categoryRow.id),
        escapeSql(item.name),
        escapeSql(item.level || 'intermediate'),
        escapeInteger(item.proficiency),
        escapeInteger(itemIndex),
      ];
      const updateAssignments = buildUpdateAssignments([
        'category_id',
        'name',
        'level',
        'proficiency',
        'display_order',
      ]);
      statements.push(buildUpsert('resume_skills', columns, values, '(id)', updateAssignments));
    });
  }
  return statements;
}

function buildPersonalProjectStatements(projects) {
  return ensureArray(projects).map((project, index) => {
    const columns = [
      'id',
      'resume_id',
      'name',
      'period',
      'description',
      'technologies',
      'icon',
      'tagline',
      'stars',
      'language',
      'forks',
      'github_url',
      'demo_url',
      'metrics',
      'display_order',
    ];
    const values = [
      escapeSql(deterministicUuid('personal-project-' + index)),
      escapeSql(PROFILE_ID),
      escapeSql(project.name),
      escapeSql(project.period),
      escapeSql(project.description),
      escapeArray(ensureArray(project.technologies)),
      escapeSql(project.icon),
      escapeSql(project.tagline),
      escapeInteger(project.stars),
      escapeSql(project.language),
      escapeInteger(project.forks),
      escapeSql(project.githubUrl),
      escapeSql(project.demoUrl),
      escapeJsonb(project.metrics),
      escapeInteger(index),
    ];
    const updateAssignments = buildUpdateAssignments([
      'resume_id',
      'name',
      'period',
      'description',
      'technologies',
      'icon',
      'tagline',
      'stars',
      'language',
      'forks',
      'github_url',
      'demo_url',
      'metrics',
      'display_order',
    ]);
    return buildUpsert('resume_personal_projects', columns, values, '(id)', updateAssignments);
  });
}

function buildLanguageStatements(languages) {
  return ensureArray(languages).map((language, index) => {
    const columns = ['id', 'resume_id', 'name', 'level', 'display_order'];
    const values = [
      escapeSql(deterministicUuid('language-' + index)),
      escapeSql(PROFILE_ID),
      escapeSql(language.name),
      escapeSql(language.level),
      escapeInteger(index),
    ];
    const updateAssignments = buildUpdateAssignments([
      'resume_id',
      'name',
      'level',
      'display_order',
    ]);
    return buildUpsert('resume_languages', columns, values, '(id)', updateAssignments);
  });
}

function buildInfrastructureStatements(items) {
  return ensureArray(items).map((item, index) => {
    const columns = [
      'id',
      'resume_id',
      'icon',
      'title',
      'description',
      'status',
      'url',
      'display_order',
    ];
    const values = [
      escapeSql(deterministicUuid('infra-' + index)),
      escapeSql(PROFILE_ID),
      escapeSql(item.icon),
      escapeSql(item.title),
      escapeSql(item.description),
      escapeSql(item.status),
      escapeSql(item.url),
      escapeInteger(index),
    ];
    const updateAssignments = buildUpdateAssignments([
      'resume_id',
      'icon',
      'title',
      'description',
      'status',
      'url',
      'display_order',
    ]);
    return buildUpsert('resume_infrastructure', columns, values, '(id)', updateAssignments);
  });
}

function generateSql(data) {
  const categoryRows = buildSkillCategoryRows(data.skills);
  const sections = [
    {
      comment: '-- resume_profiles',
      statements: [buildResumeProfileStatement(data)],
    },
    {
      comment: '-- resume_careers',
      statements: buildCareerStatements(data.careers),
    },
    {
      comment: '-- resume_projects',
      statements: buildProjectStatements(data.projects),
    },
    {
      comment: '-- resume_certifications',
      statements: buildCertificationStatements(data.certifications),
    },
    {
      comment: '-- resume_skill_categories',
      statements: buildSkillCategoryStatements(categoryRows),
    },
    {
      comment: '-- resume_skills',
      statements: buildSkillStatements(categoryRows),
    },
    {
      comment: '-- resume_personal_projects',
      statements: buildPersonalProjectStatements(data.personalProjects),
    },
    {
      comment: '-- resume_languages',
      statements: buildLanguageStatements(data.languages),
    },
    {
      comment: '-- resume_infrastructure',
      statements: buildInfrastructureStatements(data.infrastructure),
    },
    {
      comment: '-- resume_oss_contributions',
      statements: ['-- resume_oss_contributions: no rows'],
    },
  ];

  const counts = {
    resume_profiles: 1,
    resume_careers: ensureArray(data.careers).length,
    resume_projects: ensureArray(data.projects).length,
    resume_certifications: ensureArray(data.certifications).length,
    resume_skill_categories: categoryRows.length,
    resume_skills: categoryRows.reduce((total, row) => total + row.items.length, 0),
    resume_personal_projects: ensureArray(data.personalProjects).length,
    resume_languages: ensureArray(data.languages).length,
    resume_infrastructure: ensureArray(data.infrastructure).length,
    resume_oss_contributions: ensureArray(data.ossContributions).length,
  };

  const parts = ['-- Generated by seed-resume-data.mjs at ' + new Date().toISOString(), 'BEGIN;'];

  sections.forEach((section) => {
    parts.push(section.comment);
    section.statements.forEach((statement) => {
      parts.push(statement);
    });
  });

  parts.push('COMMIT;');

  return {
    sql: parts.join('\n\n') + '\n',
    counts,
  };
}

function formatSummary(counts) {
  return [
    'Seed SQL generated: seed.sql',
    '  resume_profiles: ' + counts.resume_profiles + ' row',
    '  resume_careers: ' + counts.resume_careers + ' rows',
    '  resume_projects: ' + counts.resume_projects + ' rows',
    '  resume_certifications: ' + counts.resume_certifications + ' rows',
    '  resume_skill_categories: ' + counts.resume_skill_categories + ' rows',
    '  resume_skills: ' + counts.resume_skills + ' rows',
    '  resume_personal_projects: ' + counts.resume_personal_projects + ' rows',
    '  resume_languages: ' + counts.resume_languages + ' rows',
    '  resume_infrastructure: ' + counts.resume_infrastructure + ' rows',
    '  resume_oss_contributions: ' + counts.resume_oss_contributions + ' rows',
  ].join('\n');
}

async function main() {
  const scriptPath = path.resolve(process.argv[1] || 'seed-resume-data.mjs');
  const scriptDir = path.dirname(scriptPath);
  const dataPath = path.resolve(
    scriptDir,
    '../../../../packages/data/resumes/master/resume_data.json'
  );
  const outputPath = path.join(scriptDir, 'seed.sql');
  const dryRun = process.argv.includes('--dry-run');
  const raw = await fs.readFile(dataPath, 'utf8');
  const data = JSON.parse(raw);
  const result = generateSql(data);

  if (dryRun) {
    process.stdout.write(result.sql);
    return;
  }

  await fs.writeFile(outputPath, result.sql, 'utf8');
  console.log(formatSummary(result.counts));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
