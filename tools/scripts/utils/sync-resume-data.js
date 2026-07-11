#!/usr/bin/env node
/**
 * Single Source of Truth:
 * - resumes/master/resume_data.json
 * - resumes/master/resume_data_en.json
 * - resumes/master/resume_data_ja.json
 *
 * Generates:
 * - apps/portfolio/data.json (Korean portfolio data)
 * - apps/portfolio/data_en.json (English portfolio data)
 * - apps/portfolio/data_ja.json (Japanese portfolio data)
 */

const path = require('path');
const { runSync } = require('./resume-sync-runner.js');
const { SOURCE_PATH, WEB_DATA_PATH } = require('./resume-data-paths.js');

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!['--as-of', '--source-dir', '--output-dir'].includes(flag) || value === undefined) {
      throw new Error(
        'Usage: sync-resume-data.js [--as-of YYYY-MM-DD] [--source-dir DIR] [--output-dir DIR]'
      );
    }
    values[flag] = value;
  }
  return values;
}

function currentUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function main(argv = process.argv.slice(2), env = process.env) {
  const values = parseArguments(argv);
  const options = {
    asOf: values['--as-of'] || env.RESUME_AS_OF || currentUtcDate(),
    sourceDir: values['--source-dir'] || path.dirname(SOURCE_PATH),
    outputDir: values['--output-dir'] || path.dirname(WEB_DATA_PATH),
  };
  console.log(`sync-resume-data start asOf=${options.asOf}`);
  runSync(options);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { currentUtcDate, main, parseArguments };
