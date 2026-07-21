import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import { getCategoryScores, summarizeAssertions } from './lighthouse-assertions.mjs';

export async function runLighthouseProfile(profileName, collectConfig, assertions) {
  const urls = collectConfig?.url ?? [];
  const runs = Number(collectConfig?.numberOfRuns ?? 1);
  const settings = collectConfig?.settings ?? {};

  if (!urls.length) {
    throw new Error(`Profile ${profileName} has no URL configured`);
  }

  const results = [];
  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    for (const url of urls) {
      for (let index = 0; index < runs; index += 1) {
        const runnerResult = await lighthouse(
          url,
          {
            port: chrome.port,
            logLevel: 'error',
            output: 'json',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            preset: settings.preset,
            throttling: settings.throttling,
            screenEmulation: settings.screenEmulation,
            formFactor: settings.screenEmulation?.mobile ? 'mobile' : 'desktop',
          },
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
