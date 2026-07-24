/**
 * Configuration for the resume variants generator.
 *
 * Defines the master resume input, output/archive directories, the
 * per-variant build settings, and the Korean-to-English section name map.
 */

const path = require('path');

// Configuration
const CONFIG = {
  masterFile: path.join(__dirname, '../../../packages/data/resumes/master/resume_master.md'),
  outputDir: path.join(__dirname, '../../../packages/data/resumes/generated'),
  archiveDir: path.join(__dirname, '../../../packages/data/resumes/archive/pre-consolidation'),

  variants: {
    general: {
      filename: 'resume_general.md',
      description: 'General purpose resume for all industries',
      sections: ['all'],
      maxLength: null,
    },
    short: {
      filename: 'resume_short.md',
      description: 'Short form resume (1-2 pages)',
      sections: ['contact', 'summary', 'experience-recent', 'skills'],
      maxLength: 2000, // Approximate words
    },
    technical: {
      filename: 'resume_technical.md',
      description: 'Technical infrastructure focus',
      sections: [
        'contact',
        'summary',
        'experience',
        'skills-technical',
        'projects',
      ],
      emphasis: ['automation', 'infrastructure', 'devops', 'monitoring'],
    },
    security: {
      filename: 'resume_security.md',
      description: 'Security and compliance focus',
      sections: [
        'contact',
        'summary',
        'experience',
        'skills-security',
        'certifications',
      ],
      emphasis: ['security', 'compliance', 'incident', 'soc', 'audit'],
    },
  },
};

const SECTION_NAME_MAP = {
  '연락처': 'contact',
  '학력': 'education',
  '경력_요약': 'summary',
  '경력사항': 'experience',
  '주요_프로젝트': 'projects',
  '기술_스택': 'skills',
  '자격증': 'certifications',
};

module.exports = {CONFIG, SECTION_NAME_MAP};
