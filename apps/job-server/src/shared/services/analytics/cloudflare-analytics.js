/**
 * @typedef {{
 *   data?: {
 *     viewer?: {
 *       accounts?: Array<{
 *         httpRequestsAdaptiveGroups?: Array<{
 *           sum?: { requests?: number; bytes?: number; cachedRequests?: number; cachedBytes?: number };
 *           dimensions?: { date?: string };
 *         }>;
 *         httpRequestsAdaptive?: Array<{
 *           edgeResponseStatus: number;
 *           clientRequestPath?: string;
 *         }>;
 *       }>;
 *     };
 *   };
 *   errors?: unknown[];
 * }} GraphQLAnalyticsResponse
 */

/**
 * Cloudflare Analytics Service
 *
 * Fetches worker analytics from the Cloudflare GraphQL Analytics API.
 * Uses constructor injection for configuration (accountId, apiKey) and fetch.
 */
export class CloudflareAnalyticsService {
  /**
   * @param {{
   *   accountId?: string;
   *   apiKey?: string;
   *   fetchFn?: typeof fetch;
   * }} options
   */
  constructor({ accountId, apiKey, fetchFn = globalThis.fetch }) {
    this.accountId = accountId;
    this.apiKey = apiKey;
    this.fetchFn = fetchFn;
    this.endpoint = 'https://api.cloudflare.com/client/v4/graphql';
  }

  /**
   * Check if the service is configured with valid credentials.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.accountId && this.apiKey);
  }

  /**
   * Fetch worker analytics for the last N days.
   * @param {number} [days=7] - Number of days to fetch
   * @returns {Promise<Object>} Analytics data or unavailability reason
   */
  async getWorkerAnalytics(days = 7) {
    if (!this.isConfigured()) {
      return {
        available: false,
        reason: 'Cloudflare API key not configured',
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date().toISOString().split('T')[0];

    const query = `
      query GetWorkerAnalytics($accountTag: String!, $since: Date!, $until: Date!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            httpRequestsAdaptiveGroups(
              filter: { date_geq: $since, date_leq: $until }
              limit: 100
              orderBy: [date_ASC]
            ) {
              dimensions {
                date
              }
              sum {
                requests
                bytes
                cachedRequests
                cachedBytes
              }
              avg {
                sampleInterval
              }
            }
            httpRequestsAdaptive(
              filter: { date_geq: $since, date_leq: $until }
              limit: 5000
            ) {
              edgeResponseStatus
              clientRequestPath
            }
          }
        }
      }
    `;

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            accountTag: this.accountId,
            since: sinceStr,
            until: untilStr,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          available: false,
          reason: `Cloudflare API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return {
          available: false,
          reason: 'GraphQL query error',
        };
      }

      return this.formatAnalytics(data, sinceStr, untilStr);
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Transform raw Cloudflare GraphQL response into structured analytics.
   * @param {GraphQLAnalyticsResponse} rawData - Raw GraphQL response
   * @param {string} since - Start date
   * @param {string} until - End date
   * @returns {Object} Formatted analytics
   */
  formatAnalytics(rawData, since, until) {
    const accounts = rawData?.data?.viewer?.accounts;
    if (!accounts || accounts.length === 0) {
      return {
        available: true,
        period: { since, until },
        totalRequests: 0,
        totalBytes: 0,
        cachedRequests: 0,
        successRate: 0,
        dailyBreakdown: [],
        statusCodes: {},
        topPaths: [],
      };
    }

    const account = accounts[0];
    const groups = account.httpRequestsAdaptiveGroups || [];
    const requests = account.httpRequestsAdaptive || [];

    // Aggregate totals from grouped data
    let totalRequests = 0;
    let totalBytes = 0;
    let cachedRequests = 0;
    const dailyBreakdown = [];

    for (const group of groups) {
      const dayRequests = group.sum?.requests || 0;
      const dayBytes = group.sum?.bytes || 0;
      const dayCached = group.sum?.cachedRequests || 0;

      totalRequests += dayRequests;
      totalBytes += dayBytes;
      cachedRequests += dayCached;

      dailyBreakdown.push({
        date: group.dimensions?.date,
        requests: dayRequests,
        bytes: dayBytes,
        cachedRequests: dayCached,
      });
    }

    // Aggregate status codes from individual requests
    /** @type {Record<number | string, number>} */
    const statusCodes = {};
    /** @type {Record<string, number>} */
    const pathCounts = {};
    let successCount = 0;

    for (const req of requests) {
      const status = req.edgeResponseStatus;
      statusCodes[status] = (statusCodes[status] || 0) + 1;

      if (status >= 200 && status < 400) {
        successCount++;
      }

      const path = req.clientRequestPath || '/';
      pathCounts[path] = (pathCounts[path] || 0) + 1;
    }

    // Top paths sorted by count
    const topPaths = Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    const successRate =
      requests.length > 0 ? Math.round((successCount / requests.length) * 10000) / 100 : 0;

    return {
      available: true,
      period: { since, until },
      totalRequests,
      totalBytes,
      cachedRequests,
      cacheRate: totalRequests > 0 ? Math.round((cachedRequests / totalRequests) * 10000) / 100 : 0,
      successRate,
      statusCodes,
      topPaths,
      dailyBreakdown,
    };
  }
}
