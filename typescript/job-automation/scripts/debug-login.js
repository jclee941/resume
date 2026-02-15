#!/usr/bin/env node
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function dumpHtml() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,720',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log('Navigating...');
    await page.goto('https://id.wanted.jobs/login', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    const html = await page.content();
    fs.writeFileSync('/tmp/wanted-login.html', html);
    console.log('HTML dumped to /tmp/wanted-login.html');

    await page.screenshot({ path: '/tmp/wanted-debug.png' });
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

dumpHtml();
