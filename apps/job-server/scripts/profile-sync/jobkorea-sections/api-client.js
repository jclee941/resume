/**
 * Register a portfolio URL via AddUserFileDB and return the server-generated IDX.
 * @param {import('playwright').Page} page
 * @param {string} url - Portfolio URL to register
 * @returns {Promise<number|null>} File IDX or null on failure
 */
export async function registerPortfolioUrl(page, url) {
  const result = await page.evaluate(async (u) => {
    return new Promise((resolve) => {
      $.post(
        '/User/Resume/AddUserFileDB',
        {
          File_Name: u,
          Display_File_Name: u,
          File_Type: 2,
          File_Up_Stat: 2,
          File_Size: 0,
        },
        (res) => resolve(res)
      ).fail(() => resolve(null));
    });
  }, url);
  return result?.sc === 1 ? result.idx : null;
}
