#!/usr/bin/env node
/**
 * Persistent Auth Script - Real automation using saved browser state
 *
 * Backward-compatible barrel for apps/job-server/scripts/auth-persistent/.
 */

export * from './auth-persistent/index.js';

import { runCli } from './auth-persistent/cli.js';
import { pathToFileURL } from 'url';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli()
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
