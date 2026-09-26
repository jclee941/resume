import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import { getCategoryScores, summarizeAssertions } from './lighthouse-assertions.mjs';

/**
 * @typedef {Object} CollectSettings
 * @property {string} [preset]
 * @property {Record<string, unknown>} [throttling]
 * @property {{ mobile?: boolean }} [screenEmulation]
 */

/**
 * @typedef {Object} CollectConfig
 * @property {string[]} [url]
 * @property {number | string} [numberOfRuns]
 * @property {CollectSettings} [settings]
 */

/**
 * @param {string} profileName
 * @param {CollectConfig} collectConfig
 * @param {Record<string, unknown>} assertions
 */
export async function runLighthouseProfile(profileName, collectConfig, assertions) {
  const urls = collectConfig?.url ?? [];
  const runs = Number(collectConfig?.numberOfRuns ?? 1);
  const settings = collectConfig?.settings ?? {};

  if (!urls.length) {
    throw new Error(`Profile ${profileName} has no URL configured`);
  }

  /** @type {import('./lighthouse-assertions.mjs').LighthouseResult[]} */
  const results = [];
  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    for (const url of urls) {
      for (let index = 0; index < runs; index += 1) {
        const runnerResult =
          await /** @type {(url: string, flags: import('lighthouse').Flags, config: undefined) => Promise<{ lhr: import('./lighthouse-assertions.mjs').LighthouseResult } | undefined>} */ (
            lighthouse
          )(
            url,
            /** @type {import('lighthouse').Flags & { preset?: string }} */ ({
              port: chrome.port,
              logLevel: 'error',
              output: 'json',
              onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
              preset: settings.preset,
              throttling: /** @type {import('lighthouse').ThrottlingSettings | undefined} */ (
                settings.throttling
              ),
              screenEmulation:
                /** @type {import('lighthouse').ScreenEmulationSettings | undefined} */ (
                  settings.screenEmulation
                ),
              formFactor: settings.screenEmulation?.mobile ? 'mobile' : 'desktop',
            }),
            undefined
          );

        if (!runnerResult?.lhr) {
          throw new Error(`Lighthouse returned no report for ${url}`);
        }

        results.push(runnerResult.lhr);
      }
    }
  } finally {
    await chrome.kill();
  }

  return {
    profileName,
    urls,
    runs: results.length,
    ...summarizeAssertions(profileName, results, assertions),
    scores: getCategoryScores(results[0]),
  };
}
