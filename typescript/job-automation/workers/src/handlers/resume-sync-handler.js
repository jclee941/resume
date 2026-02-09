import { BaseHandler } from './base-handler.js';
import { normalizeError } from '../../../src/shared/errors/index.js';

/**
 * Handler for resume sync operations.
 * Scrapes resume data from Wanted using Chaos API.
 */
export class ResumeSyncHandler extends BaseHandler {
  /**
   * Trigger resume scraping from Wanted
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async triggerResumeSync(request) {
    try {
      const cookies = await this.auth.getCookies('wanted');
      if (!cookies) {
        return this.jsonResponse({ success: false, error: 'Wanted authentication required' }, 401);
      }

      // 1. List resumes to find the main one
      const listResponse = await fetch('https://www.wanted.co.kr/api/chaos/resumes/v1/list', {
        headers: { Cookie: cookies },
        signal: AbortSignal.timeout(10000),
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to list resumes: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      const resumes = listData.data || [];
      const mainResume = resumes.find((r) => r.is_default) || resumes[0];

      if (!mainResume) {
        return this.jsonResponse({ success: false, error: 'No resumes found' }, 404);
      }

      // 2. Fetch full resume details
      const detailResponse = await fetch(
        `https://www.wanted.co.kr/api/chaos/resumes/v1/${mainResume.id}`,
        {
          headers: { Cookie: cookies },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!detailResponse.ok) {
        throw new Error(`Failed to fetch resume detail: ${detailResponse.status}`);
      }

      const resumeData = await detailResponse.json();

      // 3. (Optional) Save to D1 if we had a resume table, or just return for now
      // Since this is "Scraping", returning the data is the primary goal for now.
      // The CLI can consume this endpoint to update local files.

      return this.jsonResponse({
        success: true,
        message: 'Resume scraped successfully',
        resume: resumeData,
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ResumeSyncHandler',
        action: 'triggerResumeSync',
      });
      console.error('Resume sync failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }
}
