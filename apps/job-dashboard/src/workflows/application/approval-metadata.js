const FOREIGN_ATS_PLATFORMS = new Set(['greenhouse', 'lever', 'ashby']);
const SERVER_ATS_CAPABILITY = Symbol('serverAtsCapability');
const FOREIGN_COMPANY_PACKET_PATH =
  'packages/data/resumes/applications/foreign-company/foreign_company_security_sre_packet.json';

/**
 * @typedef {{
 *   platform: string;
 *   mode: string;
 *   canSubmit: boolean;
 *   dryRunFirst?: boolean;
 * }} ServerAtsCapability
 *
 * @typedef {{
 *   score: number | null;
 *   source: string;
 *   adapterCapability: ServerAtsCapability | null;
 *   packetPath: string | null;
 *   humanApproval?: {
 *     status: string;
 *     destination: string;
 *   };
 * }} ApprovalMetadata
 *
 * @typedef {{
 *   id?: string | number;
 *   source?: string;
 *   matchScore: number;
 *   platform?: string;
 *   dryRun?: boolean;
 *   atsStub?: boolean;
 *   packetPath?: string;
 *   applicationPacketPath?: string;
 *   packet?: { source?: { path?: string } };
 *   [key: string]: unknown;
 *   [key: symbol]: unknown;
 * }} ScoredJob
 */

/**
 * @param {Record<string, unknown>} job
 * @param {unknown} capability
 * @returns {Record<string, unknown>}
 */
export function attachServerAtsCapability(job, capability) {
  return { ...job, [SERVER_ATS_CAPABILITY]: capability };
}

/**
 * @param {ApprovalMetadata} metadata
 * @param {ScoredJob} job
 * @returns {ApprovalMetadata}
 */
export function withHumanApproval(metadata, job) {
  return {
    ...metadata,
    humanApproval: {
      status: 'approved',
      destination: toOptionalString(job?.source ?? job?.platform) ?? 'unknown',
    },
  };
}

/**
 * @param {ScoredJob} job
 * @returns {ApprovalMetadata}
 */
export function buildApprovalMetadata(job) {
  const source = toOptionalString(job?.source ?? job?.platform) ?? 'unknown';
  return {
    score: toFiniteNumber(job?.matchScore),
    source,
    adapterCapability: createServerAdapterCapability(job, source),
    packetPath: normalizePacketPath(job, source),
  };
}

/**
 * @param {ScoredJob} job
 * @param {string} source
 * @returns {ServerAtsCapability | null}
 */
function createServerAdapterCapability(job, source) {
  if (!FOREIGN_ATS_PLATFORMS.has(source)) return null;
  const capability = /** @type {Record<string, unknown> | null | undefined} */ (
    job?.[SERVER_ATS_CAPABILITY]
  );
  if (capability && typeof capability === 'object' && !Array.isArray(capability)) {
    return {
      platform: source,
      mode: toOptionalString(capability.mode) ?? 'manual-review',
      canSubmit: capability.canSubmit === true,
      dryRunFirst: capability.dryRunFirst !== false,
    };
  }
  return {
    platform: source,
    mode: job?.dryRun === true || job?.atsStub === true ? 'dry-run' : 'manual-review',
    canSubmit: false,
  };
}

/**
 * @param {ScoredJob} job
 * @param {string} source
 * @returns {string | null}
 */
function normalizePacketPath(job, source) {
  const packetPath = toOptionalString(
    job?.packetPath ?? job?.applicationPacketPath ?? job?.packet?.source?.path
  );
  if (packetPath) return packetPath;
  return FOREIGN_ATS_PLATFORMS.has(source) ? FOREIGN_COMPANY_PACKET_PATH : null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function toOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}
