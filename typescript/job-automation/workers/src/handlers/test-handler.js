import { BaseHandler } from './base-handler.js';
import { normalizeError } from '../../../src/shared/errors/index.js';

/**
 * Handler for test/debug operations.
 * Provides diagnostic endpoints for testing API integrations.
 */
export class TestHandler extends BaseHandler {
  /**
   * Test endpoint for Chaos API resume integration
   * GET /api/test/chaos-resumes
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async testChaosResumes(request) {
    try {
      const cookies = await this.env?.SESSIONS?.get('wanted:session');
      if (!cookies) {
        return this.jsonResponse({
          success: false,
          error: 'No session cookies found',
          authenticated: false,
        });
      }

      // Debug: Test direct fetch to see what's happening with Worker fetch
      const debugUrl = 'https://www.wanted.co.kr/api/chaos/resumes/v1';
      const debugResp = await fetch(debugUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: 'https://www.wanted.co.kr/',
          Origin: 'https://www.wanted.co.kr',
          Cookie: cookies,
        },
      });

      const debugBody = await debugResp.text();

      if (!debugResp.ok) {
        return this.jsonResponse({
          success: false,
          debug: true,
          fetchStatus: debugResp.status,
          fetchStatusText: debugResp.statusText,
          cookiesLength: cookies.length,
          hasToken: cookies.includes('WWW_ONEID_ACCESS_TOKEN'),
          responsePreview: debugBody.substring(0, 300),
        });
      }

      // Direct fetch worked - return the data directly without WantedClient
      const debugData = JSON.parse(debugBody);
      const resumes = debugData.data || [];

      return this.jsonResponse({
        success: true,
        authenticated: true,
        resumeCount: resumes?.length || 0,
        resumes: resumes?.map((r) => ({
          id: r.id,
          title: r.title,
          updatedAt: r.updated_at,
        })),
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'TestHandler',
        action: 'testChaosResumes',
      });
      console.error('Chaos resume test failed:', normalized);
      return this.jsonResponse(
        {
          success: false,
          error: normalized.message,
        },
        500
      );
    }
  }
}
