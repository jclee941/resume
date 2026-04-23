import { evaluateWithFallback, getActivePage } from './page-utils.js';

export async function isLoggedIn(page) {
  const activePage = await getActivePage(page);
  return evaluateWithFallback(activePage, (currentPage) => {
    return currentPage.evaluate(() => {
      const logoutLink = document.querySelector('a[href*="/Login/Logout"]');
      const userLink = document.querySelector(
        'header a[href*="/User/"], #header a[href*="/User/"], a[href*="/User/"]'
      );
      return Boolean(logoutLink || userLink);
    });
  });
}

export async function getDiagnostics(page) {
  const activePage = await getActivePage(page);
  return evaluateWithFallback(activePage, (currentPage) => {
    return currentPage.evaluate(() => ({
      url: location.href,
      title: document.title,
      hasLogoutLink: Boolean(document.querySelector('a[href*="/Login/Logout"]')),
      hasUserLink: Boolean(
        document.querySelector(
          'header a[href*="/User/"], #header a[href*="/User/"], a[href*="/User/"]'
        )
      ),
      hasLoginForm: Boolean(document.querySelector('input[name="M_ID"], input[name="M_PWD"]')),
      bodySnippet: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
    }));
  });
}
