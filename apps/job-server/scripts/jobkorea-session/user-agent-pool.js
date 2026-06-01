export const JOBKOREA_BROWSER_PROFILES = [
  {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    viewport: { width: 1536, height: 864 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    viewport: { width: 1728, height: 1117 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_3_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  {
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    viewport: { width: 1600, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  {
    userAgent:
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
];

export function pickJobKoreaBrowserProfile(options = {}) {
  const { randomFn = Math.random, profiles = JOBKOREA_BROWSER_PROFILES } = options;

  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('JobKorea browser profile pool is empty');
  }

  const selectedIndex = Math.min(Math.floor(randomFn() * profiles.length), profiles.length - 1);

  return profiles[selectedIndex];
}
