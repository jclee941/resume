#!/usr/bin/env node

import { validateArchitectureDocs } from './architecture-docs-validator.mjs';

const mode = process.argv.includes('--governance-only') ? 'governance-only' : 'full';
const result = validateArchitectureDocs(process.cwd(), mode);
const stream = result.status === 'ok' ? process.stdout : process.stderr;
stream.write(`${JSON.stringify(result)}\n`);
process.exitCode = result.status === 'ok' ? 0 : 1;
