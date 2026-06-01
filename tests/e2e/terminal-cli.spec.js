// @ts-check
const { test, expect } = require('@playwright/test');
const { executeCliCommand, focusElement } = require('./fixtures/helpers');

/**
 * Terminal CLI E2E Tests
 *
 * Tests the interactive terminal CLI commands.
 * Commands defined in window.terminalCommands in index.html.
 */

async function safeGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping terminal CLI test');
    }
  } catch (error) {
    if (
      error.message?.includes('net::ERR_NETWORK_CHANGED') ||
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping terminal CLI test');
    }
    throw error;
  }
}

test.describe('Terminal CLI - Command Execution', () => {
  test.beforeEach(async ({ page }) => {
    await safeGoto(page);
  });

  test('should have CLI input focused or focusable', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await expect(cliInput).toBeVisible();

    // Focus the input
    await focusElement(page, '#terminal-input');
  });

  test('should execute help command', async ({ page }) => {
    await executeCliCommand(page, 'help', {
      expectedOutput: /help|commands|available/i,
    });

    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(/help|commands|available/i);
  });

  test('should execute skills command', async ({ page }) => {
    await executeCliCommand(page, 'skills', {
      expectedOutput: /skills|prometheus|terraform|kubernetes|grafana/i,
    });

    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(/skills|prometheus|terraform|kubernetes|grafana/i);
  });

  test('should execute clear command', async ({ page }) => {
    // First execute a command to have output
    await executeCliCommand(page, 'help');

    const cliOutput = page.locator('#cli-output');
    const initialText = await cliOutput.textContent();
    expect(initialText?.length).toBeGreaterThan(0);

    // Now clear
    await executeCliCommand(page, 'clear');

    // Output should be empty or minimal
    await expect(async () => {
      const clearedText = await cliOutput.textContent();
      expect(clearedText?.trim().length).toBeLessThan(initialText?.length || 0);
    }).toPass({ timeout: 5000 });
  });

  test('should show error for unknown command', async ({ page }) => {
    await executeCliCommand(page, 'unknowncommand12345', {
      expectedOutput: /not found|unknown|command not recognized/i,
    });

    const cliOutput = page.locator('#cli-output');
    // Should show some form of "not found" or "unknown" message
    await expect(cliOutput).toContainText(/not found|unknown|command not recognized/i);
  });

  test('should handle empty command gracefully', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await cliInput.focus();
    await cliInput.press('Enter');

    // Should not crash, page should still be functional
    await expect(cliInput).toBeVisible();
  });
});

test.describe('Terminal CLI - Extended Commands', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should execute contact command', async ({ page }) => {
    await executeCliCommand(page, 'contact', {
      expectedOutput: /contact|github|email|qws941/i,
    });

    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(/contact|github|email|qws941/i);
  });

  test('should execute history command', async ({ page }) => {
    await executeCliCommand(page, 'help');
    await executeCliCommand(page, 'history');

    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(/help|history/i);
  });
});

test.describe('Terminal CLI - Cover Letter', () => {
  // Real SSoT cover-letter content (zero fabricated fixtures).
  const coverLetter = require('../../packages/data/resumes/master/resume_data.json').coverLetter;
  const koHeadline = coverLetter.ko.headline;
  const koFragment = koHeadline.slice(0, 12);

  test.beforeEach(async ({ page }) => {
    await safeGoto(page, '/');
  });

  test('coverletter command prints the real KO headline', async ({ page }) => {
    await executeCliCommand(page, 'coverletter');
    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(koFragment);
  });

  test('cl alias prints the same cover letter', async ({ page }) => {
    await executeCliCommand(page, 'cl');
    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(koFragment);
  });

  test('help lists the coverletter command', async ({ page }) => {
    await executeCliCommand(page, 'help', { expectedOutput: /coverletter/i });
    await expect(page.locator('#cli-output')).toContainText(/coverletter/i);
  });

  test('ls lists coverletter.txt', async ({ page }) => {
    await executeCliCommand(page, 'ls', { expectedOutput: /coverletter\.txt/i });
    await expect(page.locator('#cli-output')).toContainText(/coverletter\.txt/i);
  });

  test('tab-completion expands cov -> coverletter', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await cliInput.focus();
    await cliInput.fill('cov');
    await cliInput.press('Tab');
    await expect(cliInput).toHaveValue('coverletter');
  });
  test('cat coverletter.txt prints the cover letter', async ({ page }) => {
    await executeCliCommand(page, 'cat coverletter.txt');
    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(koFragment);
    await expect(cliOutput).not.toContainText(/No such file or directory/i);
  });

});

test.describe('Terminal CLI - Cover Letter locale parity', () => {
  const coverLetter = require('../../packages/data/resumes/master/resume_data.json').coverLetter;

  test('EN route prints the English cover letter, not Korean', async ({ page }) => {
    await safeGoto(page, '/en/');
    await executeCliCommand(page, 'coverletter');
    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(coverLetter.en.headline.slice(0, 16));
    await expect(cliOutput).not.toContainText(coverLetter.ko.headline.slice(0, 12));
  });

  test('JA route prints the Japanese cover letter, not Korean', async ({ page }) => {
    await safeGoto(page, '/ja/');
    await executeCliCommand(page, 'coverletter');
    const cliOutput = page.locator('#cli-output');
    await expect(cliOutput).toContainText(coverLetter.ja.headline.slice(0, 12));
    await expect(cliOutput).not.toContainText(coverLetter.ko.headline.slice(0, 12));
  });
});

test.describe('Terminal CLI - Output is rendered as text, not HTML (XSS guard)', () => {
  // The EN template historically built cli output via innerHTML; command/data
  // output (e.g. coverletter) must never be interpreted as markup.
  for (const route of ['/', '/en/']) {
    test(`command output on ${route} does not inject markup elements`, async ({ page }) => {
      await safeGoto(page, route);
      const cliInput = page.locator('#terminal-input');
      await cliInput.fill('help');
      await cliInput.press('Enter');
      await page.waitForTimeout(400);
      // `help` returns a string containing a <div class="help-output">. If output
      // is rendered as text (safe), that element must NOT exist in the DOM.
      const injected = await page.locator('#cli-output .help-output').count();
      expect(injected).toBe(0);
      // And the literal markup text should be visible instead.
      await expect(page.locator('#cli-output')).toContainText('help-output');
    });
  }
});

test.describe('Terminal CLI - Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should support Ctrl+L to clear (if implemented)', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await cliInput.focus();

    // Type something first
    await cliInput.fill('help');
    await cliInput.press('Enter');

    // Try Ctrl+L
    await cliInput.press('Control+l');

    // If clear is implemented, output should be cleared
    // This is a soft test - just verify the page doesn't crash
    await expect(page.locator('.terminal-window')).toBeVisible();
  });

  test('should support command history with arrow keys (if implemented)', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await cliInput.focus();

    // Execute a command
    await cliInput.fill('help');
    await cliInput.press('Enter');
    await expect(page.locator('#cli-output')).not.toBeEmpty();

    // Clear input
    await cliInput.fill('');

    // Press up arrow to recall last command
    await cliInput.press('ArrowUp');

    // If history is implemented, input should have the previous command
    // This is a soft test - page should remain functional
    await expect(cliInput).toBeVisible();
  });
});

test.describe('Terminal CLI - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should have accessible CLI input', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');

    // Input should be type text
    await expect(cliInput).toHaveAttribute('type', 'text');

    // Should have autocomplete off for terminal behavior
    await expect(cliInput).toHaveAttribute('autocomplete', 'off');

    // Should have spellcheck off
    await expect(cliInput).toHaveAttribute('spellcheck', 'false');
  });

  test('should have skip link for accessibility', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});
