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

const usedSeeds = new Map();

function trackSeed(seed, context) {
  if (usedSeeds.has(seed)) {
    const prev = usedSeeds.get(seed);
    throw new Error(
      'Duplicate content key detected: "' +
        seed +
        '" used by both ' +
        prev +
        ' and ' +
        context +
        '. Each item must have a unique content key to avoid ID collisions.'
    );
  }
  usedSeeds.set(seed, context);
  return deterministicUuid(seed);
}

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

function buildDeleteOrphans(table, whereClause, ids) {
  const idList = ids.map((id) => escapeSql(id)).join(', ');
  if (ids.length === 0) {
    return 'DELETE FROM ' + table + ' WHERE ' + whereClause + ';';
  }
  return 'DELETE FROM ' + table + ' WHERE ' + whereClause + ' AND id NOT IN (' + idList + ');';
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
  const results = ensureArray(careers).map((career, index) => {
    const id = trackSeed('career-' + career.company, 'career: ' + career.company);
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
      escapeSql(id),
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
    return {
      statement: buildUpsert('resume_careers', columns, values, '(id)', updateAssignments),
      id,
    };
  });
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function buildProjectStatements(projects) {
  const results = ensureArray(projects).map((project, index) => {
    const id = trackSeed(
      'project-' + (project.name || String(index)),
      'project: ' + (project.name || String(index))
    );
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
      escapeSql(id),
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
    return {
      statement: buildUpsert('resume_projects', columns, values, '(id)', updateAssignments),
      id,
    };
  });
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function buildCertificationStatements(certifications) {
  const results = ensureArray(certifications).map((certification, index) => {
    const id = trackSeed(
      'cert-' + (certification.name || String(index)),
      'certification: ' + (certification.name || String(index))
    );
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
      escapeSql(id),
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
    return {
      statement: buildUpsert('resume_certifications', columns, values, '(id)', updateAssignments),
      id,
    };
  });
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function buildSkillCategoryRows(skills) {
  return Object.entries(skills || {}).map(([key, value], index) => ({
    id: trackSeed('skill-cat-' + key, 'skill-category: ' + key),
    key,
    title: value?.title ?? null,
    icon: value?.icon ?? null,
    items: ensureArray(value?.items),
    displayOrder: index,
  }));
}

function buildSkillCategoryStatements(rows) {
  const results = rows.map((row) => {
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
    return {
      statement: buildUpsert('resume_skill_categories', columns, values, '(id)', updateAssignments),
      id: row.id,
    };
  });
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function buildSkillStatements(categoryRows) {
  const results = [];
  for (const categoryRow of categoryRows) {
    categoryRow.items.forEach((item, itemIndex) => {
      const id = trackSeed(
        'skill-' + categoryRow.key + '-' + (item.name || String(itemIndex)),
        'skill: ' + categoryRow.key + '/' + (item.name || String(itemIndex))
      );
      const columns = ['id', 'category_id', 'name', 'level', 'proficiency', 'display_order'];
      const values = [
        escapeSql(id),
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
      results.push({
        statement: buildUpsert('resume_skills', columns, values, '(id)', updateAssignments),
        id,
      });
    });
  }
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function buildPersonalProjectStatements(projects) {
  const results = ensureArray(projects).map((project, index) => {
    const id = trackSeed(
      'personal-project-' + (project.name || String(index)),
      'personal-project: ' + (project.name || String(index))
    );
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
      escapeSql(id),
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
    return {
      statement: buildUpsert(
        'resume_personal_projects',
        columns,
        values,
        '(id)',
        updateAssignments
      ),
      id,
    };
  });
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function buildLanguageStatements(languages) {
  const results = ensureArray(languages).map((language, index) => {
    const id = trackSeed(
      'language-' + (language.name || String(index)),
      'language: ' + (language.name || String(index))
    );
    const columns = ['id', 'resume_id', 'name', 'level', 'display_order'];
    const values = [
      escapeSql(id),
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
    return {
      statement: buildUpsert('resume_languages', columns, values, '(id)', updateAssignments),
      id,
    };
  });
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function buildInfrastructureStatements(items) {
  const results = ensureArray(items).map((item, index) => {
    const id = trackSeed(
      'infra-' + (item.title || String(index)),
      'infrastructure: ' + (item.title || String(index))
    );
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
      escapeSql(id),
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
    return {
      statement: buildUpsert('resume_infrastructure', columns, values, '(id)', updateAssignments),
      id,
    };
  });
  return { statements: results.map((r) => r.statement), ids: results.map((r) => r.id) };
}

function generateSql(data) {
  const categoryRows = buildSkillCategoryRows(data.skills);

  const careers = buildCareerStatements(data.careers);
  const projects = buildProjectStatements(data.projects);
  const certifications = buildCertificationStatements(data.certifications);
  const skillCategories = buildSkillCategoryStatements(categoryRows);
  const skills = buildSkillStatements(categoryRows);
  const personalProjects = buildPersonalProjectStatements(data.personalProjects);
  const languages = buildLanguageStatements(data.languages);
  const infrastructure = buildInfrastructureStatements(data.infrastructure);

  const profileWhere = 'resume_id = ' + escapeSql(PROFILE_ID);
  const skillsWhere =
    'category_id IN (SELECT id FROM resume_skill_categories WHERE resume_id = ' +
    escapeSql(PROFILE_ID) +
    ')';

  const sections = [
    {
      comment: '-- resume_profiles',
      statements: [buildResumeProfileStatement(data)],
    },
    {
      comment: '-- resume_careers',
      statements: [
        ...careers.statements,
        buildDeleteOrphans('resume_careers', profileWhere, careers.ids),
      ],
    },
    {
      comment: '-- resume_projects',
      statements: [
        ...projects.statements,
        buildDeleteOrphans('resume_projects', profileWhere, projects.ids),
      ],
    },
    {
      comment: '-- resume_certifications',
      statements: [
        ...certifications.statements,
        buildDeleteOrphans('resume_certifications', profileWhere, certifications.ids),
      ],
    },
    {
      comment: '-- resume_skill_categories',
      statements: skillCategories.statements,
    },
    {
      comment: '-- resume_skills',
      statements: [
        ...skills.statements,
        buildDeleteOrphans('resume_skills', skillsWhere, skills.ids),
      ],
    },
    {
      comment: '-- resume_skill_categories (orphan cleanup)',
      statements: [
        buildDeleteOrphans('resume_skill_categories', profileWhere, skillCategories.ids),
      ],
    },
    {
      comment: '-- resume_personal_projects',
      statements: [
        ...personalProjects.statements,
        buildDeleteOrphans('resume_personal_projects', profileWhere, personalProjects.ids),
      ],
    },
    {
      comment: '-- resume_languages',
      statements: [
        ...languages.statements,
        buildDeleteOrphans('resume_languages', profileWhere, languages.ids),
      ],
    },
    {
      comment: '-- resume_infrastructure',
      statements: [
        ...infrastructure.statements,
        buildDeleteOrphans('resume_infrastructure', profileWhere, infrastructure.ids),
      ],
    },
    {
      comment: '-- resume_oss_contributions',
      statements: [buildDeleteOrphans('resume_oss_contributions', profileWhere, [])],
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
