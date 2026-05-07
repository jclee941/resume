function getPortfolioTargetPath(pathname, language) {
  if (pathname === '/en' || pathname === '/en/') {
    return '/en/';
  }

  if (pathname === '/ko' || pathname === '/ko/') {
    return '/';
  }

  if (pathname === '/ja' || pathname === '/ja/') {
    return '/ja/';
  }

  if (pathname === '/') {
    if (language === 'en') {
      return '/en/';
    }

    if (language === 'ja') {
      return '/ja/';
    }

    return '/';
  }

  return pathname;
}

export { getPortfolioTargetPath };
