import fs from 'fs';
import path from 'path';

export async function extractCookies(page, config) {
  const { platformKey, platform, syncOnly, log } = config;

  if (syncOnly) {
    return loadSessionFromFile(platformKey, config);
  }

  log('Extracting cookies', 'info', platformKey);

  await page
    .goto(platform.urls.main, { waitUntil: 'networkidle2', timeout: 30000 })
    .catch(() => {});

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const cookieUrls = platform.cookieDomains.map((d) => `https://${d}`);
  const allCookies = await page.cookies(...cookieUrls);

  if (allCookies.length > 0) {
    log(
      `All cookies found: ${allCookies
        .map((c) => `${c.name}@${c.domain}`)
        .slice(0, 10)
        .join(', ')}...`,
      'info',
      platformKey
    );
  }

  const relevantCookies = allCookies.filter((c) =>
    platform.cookieDomains.some((d) => {
      const normalizedDomain = d.replace(/^www\./, '');
      return c.domain.endsWith(normalizedDomain) || c.domain === `.${normalizedDomain}`;
    })
  );

  log(`Found ${relevantCookies.length} cookies`, 'info', platformKey);

  if (relevantCookies.length === 0) {
    return null;
  }

  const cookieString = relevantCookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const session = {
    platform: platformKey,
    cookies: cookieString,
    email: platform.authMethod === 'google' ? config.GOOGLE_EMAIL : config.WANTED_EMAIL,
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  saveSessionToFile(platformKey, session, config);
  log(`Extracted ${relevantCookies.length} cookies`, 'success', platformKey);
  return session;
}

export function getSessionPath(platform, config = {}) {
  return path.join(config.SESSION_DIR, `${platform}-session.json`);
}

export function loadSessionFromFile(platform, config = {}) {
  const log = config.log || (() => {});

  try {
    const filepath = getSessionPath(platform, config);
    if (!fs.existsSync(filepath)) {
      throw new Error('Session file not found');
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    if (new Date(data.expiresAt) < new Date()) {
      throw new Error('Session expired');
    }

    log('Loaded session from file', 'success', platform);
    return data;
  } catch (error) {
    log(`Failed to load session: ${error.message}`, 'error', platform);
    return null;
  }
}

export function saveSessionToFile(platform, data, config = {}) {
  const log = config.log || (() => {});

  if (!fs.existsSync(config.SESSION_DIR)) {
    fs.mkdirSync(config.SESSION_DIR, { recursive: true });
  }

  const filepath = getSessionPath(platform, config);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`Session saved to ${filepath}`, 'success', platform);
}
