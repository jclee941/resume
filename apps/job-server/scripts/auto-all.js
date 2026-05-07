#!/usr/bin/env node
/**
 * Unified Automation Runner
 * Runs all automation tasks: cookie extraction, platform sync, verification
 *
 * Usage: node scripts/auto-all.js [--extract] [--sync] [--verify] [--all]
 */
import { main } from './auto-all/orchestration.js';

export * from './auto-all/index.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
