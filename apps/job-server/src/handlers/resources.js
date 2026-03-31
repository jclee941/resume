/**
 * Resource handlers for MCP server.
 */
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');
const SESSION_FILE = join(PROJECT_ROOT, '.data', 'sessions.json');

/**
 * Resource definitions
 */
export const resources = [
  {
    uri: 'wanted://session/status',
    name: 'Session Status',
    description: 'Current Wanted authentication session status',
    mimeType: 'application/json',
  },
];

/**
 * Handle list resources request.
 * @returns {Promise<{resources: Array}>}
 */
export async function handleListResources() {
  return { resources };
}

/**
 * Handle read resource request.
 * @param {import('@modelcontextprotocol/sdk/types.js').ReadResourceRequestSchema} request
 * @returns {Promise<{contents: Array<{uri: string, mimeType: string, text: string}>}>}
 */
export async function handleReadResource(request) {
  const { uri } = request.params;

  if (uri === 'wanted://session/status') {
    let sessionData = { authenticated: false, email: null, expires: null };

    if (existsSync(SESSION_FILE)) {
      try {
        const allSessions = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
        const data = allSessions.wanted || {};

        const expiresAt = data.timestamp ? new Date(data.timestamp + 24 * 60 * 60 * 1000) : null;
        const isValid = expiresAt && expiresAt > new Date();

        sessionData = {
          authenticated: isValid && !!(data.token || data.cookies),
          email: data.email || null,
          expires: expiresAt ? expiresAt.toISOString() : null,
          hasToken: !!data.token,
          hasCookies: !!data.cookies,
        };
      } catch (e) {
        log('warn', 'Failed to read session file', {
          'error.message': e.message,
          file: SESSION_FILE,
        });
        sessionData.error = e.message;
      }
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(sessionData, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
}

/**
 * Register resource handlers with MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/index.js').Server} server
 */
export function registerResourceHandlers(server) {
  server.setRequestHandler(ListResourcesRequestSchema, handleListResources);
  server.setRequestHandler(ReadResourceRequestSchema, handleReadResource);
}
