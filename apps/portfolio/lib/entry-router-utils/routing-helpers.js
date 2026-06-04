function getPortfolioTargetPath(pathname, _language) {
  if (pathname === '/en' || pathname === '/en/') {
    return '/en/';
  }

  if (pathname === '/ko' || pathname === '/ko/') {
    return '/';
  }

  if (pathname === '/ja' || pathname === '/ja/') {
    return '/ja/';
  }
  // Root '/' always serves Korean canonical content. Language selection is
  // explicit via /en/ and /ja/ paths; we no longer negotiate '/' by
  // Accept-Language so the canonical URL stays stable and cacheable.
  if (pathname === '/') {
    return '/';
  }

  return pathname;
}

export { getPortfolioTargetPath };
