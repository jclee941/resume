// @ts-check
const { test, expect } = require('@playwright/test');

const projectData = require('../../apps/portfolio/data.json');
const orderedProjects = [...projectData.projects].sort(
  (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
);

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Data Consistency', () => {
  test('resume count should match data.json', async ({ page }) => {
    await page.goto('/');
    const resumeItems = page.locator('#resume .resume-list [role="listitem"]');
    await expect(resumeItems).toHaveCount(projectData.resume.length);
  });

  test('project count should match data.json', async ({ page }) => {
    await page.goto('/');
    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(projectData.projects.length);
  });

  test('project titles should match data.json order', async ({ page }) => {
    await page.goto('/');

    for (let i = 0; i < orderedProjects.length; i++) {
      const expected = new RegExp(escapeRegExp(orderedProjects[i].title), 'i');
      const actual = page
        .locator('#projects li.project-item')
        .nth(i)
        .locator('.project-link-title, .project-title-text');
      await expect(actual).toContainText(expected);
    }
  });
});
