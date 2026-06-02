// @ts-check
const { test, expect } = require('@playwright/test');
const { executeCliCommand, focusElement } = require('./fixtures/helpers');

/** @param {import('@playwright/test').Page} page */
async function safeGoto(page, url = '/') {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 500) {
      test.skip(true, 'Server unavailable - skipping terminal CLI test');
    }
  } catch (error) {
    if (
      String(error).includes('net::ERR_NETWORK_CHANGED') ||
      String(error).includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      test.skip(true, 'Network unavailable - skipping terminal CLI test');
    }
    throw error;
  }
}

const ESSENTIAL_COMMANDS = [
  'help',
  'whoami',
  'resume',
  'projects',
  'skills',
  'contact',
  'download',
  'clear',
];

const REMOVED_COMMANDS = [
  'snake',
  'neofetch',
  'sudo',
  'rm',
  'coffee',
  'matrix',
  'chat',
  'ai',
  'theme',
  'history',
  'print',
  'social',
  'coverletter',
  'cl',
  'pwd',
  'date',
  'ls',
  'cat',
];

test.describe('Terminal CLI - Essential Commands', () => {
  test.beforeEach(async ({ page }) => {
    await safeGoto(page);
  });

  test('CLI input is focusable', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await expect(cliInput).toBeVisible();
    await focusElement(page, '#terminal-input');
  });

  test('help lists only the reduced command set', async ({ page }) => {
    await executeCliCommand(page, 'help', { expectedOutput: /Available commands/i });
    const helpText = (await page.locator('#cli-output').textContent()) || '';

    for (const command of ESSENTIAL_COMMANDS) {
      expect(helpText).toContain(command);
    }
    for (const command of REMOVED_COMMANDS) {
      expect(helpText.toLowerCase()).not.toMatch(new RegExp(`\\b${command}\\b`));
    }
  });

  test('whoami command returns role summary', async ({ page }) => {
    await executeCliCommand(page, 'whoami', { expectedOutput: /security engineer/i });
    await expect(page.locator('#cli-output')).toContainText(/security engineer/i);
  });

  test('resume command scrolls to experience', async ({ page }) => {
    await executeCliCommand(page, 'resume', { expectedOutput: /resume|experience|scrolling/i });
    await expect(page.locator('#resume')).toBeVisible();
  });

  test('projects command lists project names', async ({ page }) => {
    await executeCliCommand(page, 'projects', { expectedOutput: /projects|scrolling/i });
    await expect(page.locator('#cli-output')).toContainText(/projects|scrolling/i);
  });

  test('skills command scrolls to skills', async ({ page }) => {
    await executeCliCommand(page, 'skills', { expectedOutput: /skill|scrolling/i });
    await expect(page.locator('#skills')).toBeVisible();
  });

  test('contact command shows contact channels', async ({ page }) => {
    await executeCliCommand(page, 'contact', { expectedOutput: /contact|github|email|qws941/i });
    await expect(page.locator('#cli-output')).toContainText(/contact|github|email|qws941/i);
  });

  test('download command is accepted', async ({ page }) => {
    await executeCliCommand(page, 'download', { expectedOutput: /resume pdf|opening/i });
    await expect(page.locator('#cli-output')).toContainText(/resume pdf|opening/i);
  });

  test('clear command clears prior output', async ({ page }) => {
    await executeCliCommand(page, 'help');
    const cliOutput = page.locator('#cli-output');
    const initialText = await cliOutput.textContent();
    expect(initialText?.length).toBeGreaterThan(0);

    await executeCliCommand(page, 'clear');
    await expect(async () => {
      const clearedText = await cliOutput.textContent();
      expect(clearedText?.trim().length).toBeLessThan(initialText?.length || 0);
    }).toPass({ timeout: 5000 });
  });

  test('removed commands are rejected', async ({ page }) => {
    for (const command of ['snake', 'coverletter', 'history', 'cat coverletter.txt']) {
      await executeCliCommand(page, command, { expectedOutput: /command not allowed|command not found/i });
    }
    await expect(page.locator('#cli-output')).toContainText(/command not allowed|command not found/i);
  });

  test('unknown command shows an error', async ({ page }) => {
    await executeCliCommand(page, 'unknowncommand12345', {
      expectedOutput: /not found|not allowed|unknown|command not recognized/i,
    });
    await expect(page.locator('#cli-output')).toContainText(
      /not found|not allowed|unknown|command not recognized/i
    );
  });

  test('empty command does not crash', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await cliInput.focus();
    await cliInput.press('Enter');
    await expect(cliInput).toBeVisible();
  });
});

test.describe('Terminal CLI - Output is rendered as text, not HTML', () => {
  for (const route of ['/', '/en/']) {
    test(`command output on ${route} does not inject markup elements`, async ({ page }) => {
      await safeGoto(page, route);
      const cliInput = page.locator('#terminal-input');
      await cliInput.fill('help');
      await cliInput.press('Enter');
      await page.waitForTimeout(400);
      expect(await page.locator('#cli-output .help-output').count()).toBe(0);
      await expect(page.locator('#cli-output')).toContainText('help-output');
    });
  }
});

test.describe('Terminal CLI - Keyboard and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await safeGoto(page);
  });

  test('supports command history with arrow keys', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await cliInput.focus();
    await cliInput.fill('help');
    await cliInput.press('Enter');
    await expect(page.locator('#cli-output')).not.toBeEmpty();
    await cliInput.fill('');
    await cliInput.press('ArrowUp');
    await expect(cliInput).toBeVisible();
  });

  test('has accessible CLI input', async ({ page }) => {
    const cliInput = page.locator('#terminal-input');
    await expect(cliInput).toHaveAttribute('type', 'text');
    await expect(cliInput).toHaveAttribute('autocomplete', 'off');
    await expect(cliInput).toHaveAttribute('spellcheck', 'false');
  });

  test('has skip link for accessibility', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});
