const { expect } = require('@playwright/test');
const sharp = require('sharp');

const FIXED_CONTROL_MINIMUMS = [
  ['mobile action 1', 20],
  ['mobile action 2', 20],
  ['mobile action 3', 20],
  ['back-to-top arrow', 8],
];

async function assertForegroundPixels(locator, animations, label, minimum) {
  const buffer = await locator.screenshot({ animations });
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let foregroundPixels = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset] >= 150 && data[offset + 1] >= 150 && data[offset + 2] >= 150) {
      foregroundPixels += 1;
    }
  }
  expect(foregroundPixels, `${label} must contain rendered foreground pixels`).toBeGreaterThan(
    minimum
  );
}

async function prepareFullPageCapture(page, animations) {
  const revealTargets = await page.locator('.reveal').all();
  for (const target of revealTargets) {
    if (!(await target.isVisible())) continue;
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveClass(/\brevealed\b/);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const incomplete = await page.locator('.reveal').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (!element.classList.contains('revealed') || Number(style.opacity) < 0.99)
        );
      })
      .map((element) => element.id || element.className)
  );
  expect(incomplete, 'full-page capture has unrevealed visible content').toEqual([]);

  const sections = await page.locator('main > section, footer').all();
  for (const [index, section] of sections.entries()) {
    if (!(await section.isVisible())) continue;
    await assertForegroundPixels(section, animations, `full-page region ${index + 1}`, 20);
  }
}

async function decodeRgb(input) {
  return sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function captureTransparentFixedControls(page, animations) {
  const controls = [
    ...(await page.locator('.mobile-actions__link').all()),
    page.locator('.back-to-top'),
  ];
  expect(controls, 'fixed control count').toHaveLength(FIXED_CONTROL_MINIMUMS.length);
  const viewport = page.viewportSize();
  expect(viewport, 'fixed control viewport').not.toBeNull();
  const boxes = [];
  const originalStyles = [];
  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box, 'fixed control bounding box').not.toBeNull();
    boxes.push(box);
    originalStyles.push(
      await control.evaluate((element) => {
        const original = element.getAttribute('style');
        element.style.setProperty('color', 'transparent', 'important');
        element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        return original;
      })
    );
  }
  try {
    return {
      boxes,
      buffer: await page.screenshot({ animations }),
      viewport,
    };
  } finally {
    for (const [index, control] of controls.entries()) {
      await control.evaluate((element, original) => {
        if (original === null) element.removeAttribute('style');
        else element.setAttribute('style', original);
      }, originalStyles[index]);
    }
  }
}

async function measureFixedControlGlyphDeltas(approvedInput, transparentInput, boxes, viewport) {
  const [approved, transparent] = await Promise.all([
    decodeRgb(approvedInput),
    decodeRgb(transparentInput),
  ]);
  expect(approved.info.width, 'approved viewport width').toBe(transparent.info.width);
  expect(approved.info.height, 'approved viewport height').toBe(transparent.info.height);
  const scaleX = approved.info.width / viewport.width;
  const scaleY = approved.info.height / viewport.height;
  return boxes.map((box) => {
    const left = Math.max(0, Math.floor(box.x * scaleX));
    const top = Math.max(0, Math.floor(box.y * scaleY));
    const right = Math.min(approved.info.width, Math.ceil((box.x + box.width) * scaleX));
    const bottom = Math.min(approved.info.height, Math.ceil((box.y + box.height) * scaleY));
    let changedPixels = 0;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const offset = (y * approved.info.width + x) * approved.info.channels;
        const delta = Math.max(
          Math.abs(approved.data[offset] - transparent.data[offset]),
          Math.abs(approved.data[offset + 1] - transparent.data[offset + 1]),
          Math.abs(approved.data[offset + 2] - transparent.data[offset + 2])
        );
        if (delta >= 12) changedPixels += 1;
      }
    }
    return changedPixels;
  });
}

async function assertApprovedFixedControlGlyphs(page, testInfo, name, animations) {
  const transparent = await captureTransparentFixedControls(page, animations);
  const deltas = await measureFixedControlGlyphDeltas(
    testInfo.snapshotPath(name),
    transparent.buffer,
    transparent.boxes,
    transparent.viewport
  );
  for (const [index, [label, minimum]] of FIXED_CONTROL_MINIMUMS.entries()) {
    expect(
      deltas[index],
      `${label} must differ from its transparent-text viewport crop`
    ).toBeGreaterThan(minimum);
  }
}

module.exports = {
  assertApprovedFixedControlGlyphs,
  captureTransparentFixedControls,
  measureFixedControlGlyphDeltas,
  prepareFullPageCapture,
};
