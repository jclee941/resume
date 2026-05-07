import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './constants.js';

function getLocaleFromPath(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) {
    return null;
  }

  return SUPPORTED_LANGUAGES.includes(segment) ? segment : null;
}

function parseAcceptLanguageHeader(headerValue) {
  if (!headerValue) {
    return null;
  }

  const ranked = headerValue
    .split(',')
    .map((entry, index) => {
      const [rawRange, ...params] = entry.trim().split(';');
      if (!rawRange) {
        return null;
      }

      let quality = 1;
      for (const param of params) {
        const trimmed = param.trim();
        if (!trimmed.startsWith('q=')) {
          continue;
        }

        const parsed = Number.parseFloat(trimmed.slice(2));
        if (Number.isFinite(parsed)) {
          quality = parsed;
        }
      }

      return {
        index,
        quality,
        code: rawRange.toLowerCase(),
      };
    })
    .filter((item) => item && item.quality > 0)
    .sort((a, b) => {
      if (b.quality !== a.quality) {
        return b.quality - a.quality;
      }

      return a.index - b.index;
    });

  for (const candidate of ranked) {
    const [baseCode] = candidate.code.split('-');
    if (SUPPORTED_LANGUAGES.includes(baseCode)) {
      return baseCode;
    }
  }

  return null;
}

function detectRequestLanguage(request, pathname) {
  const pathLanguage = getLocaleFromPath(pathname);
  if (pathLanguage) {
    return {
      language: pathLanguage,
      source: 'path',
    };
  }

  const headerLanguage = parseAcceptLanguageHeader(request.headers.get('Accept-Language'));
  if (headerLanguage) {
    return {
      language: headerLanguage,
      source: 'accept-language',
    };
  }

  return {
    language: DEFAULT_LANGUAGE,
    source: 'default',
  };
}

export { detectRequestLanguage, getLocaleFromPath, parseAcceptLanguageHeader };
