const { test, expect } = require('@playwright/test');

const LOCALES = ['/ko/', '/en/', '/ja/'];
const MOTION_MODES = [
  { id: 'normal', reducedMotion: 'no-preference' },
  { id: 'reduced', reducedMotion: 'reduce' },
];

for (const path of LOCALES) {
  for (const motion of MOTION_MODES) {
    test(`capability evidence dots remain static (${path} ${motion.id})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion.reducedMotion });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'true');

      const dots = page.locator('.skill-domain-card__level-dot');
      await expect(dots.first()).toBeVisible();
      const animations = await dots.evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            name: style.animationName,
            iterations: style.animationIterationCount,
          };
        })
      );

      expect(animations.length).toBeGreaterThan(0);
      expect(animations).toEqual(animations.map(() => ({ name: 'none', iterations: '1' })));
    });
  }
}
