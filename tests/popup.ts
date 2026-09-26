import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

declare global {
  interface Window {
    fixture: { enabled: boolean; fail: boolean; reloaded: number };
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screenshots = process.argv.includes('--screenshots');
const screenshotPath = (name: string): string => path.join(root, 'docs/screenshots', name);
if (screenshots) mkdirSync(path.join(root, 'docs/screenshots'), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
});
try {
  const page = await browser.newPage({ viewport: { width: 300, height: 600 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.fixture = { enabled: JSON.parse(sessionStorage.getItem('enabled') ?? 'true') as boolean, fail: false, reloaded: 0 };
    window.close = () => {};
    Object.assign(window, { chrome: {
      runtime: { sendMessage: async (request: { type: string; enabled?: boolean }) => {
        if (window.fixture.fail) return { ok: false, error: 'Could not save. Please try again.' };
        if (request.type === 'set-enabled' && typeof request.enabled === 'boolean') {
          window.fixture.enabled = request.enabled;
          sessionStorage.setItem('enabled', JSON.stringify(request.enabled));
        }
        return { ok: true, enabled: window.fixture.enabled };
      } },
      tabs: { query: async () => [{ id: 42, url: 'https://www.youtube.com/watch?v=test' }],
        reload: async (id: number) => { if (id !== 42) throw Error('Wrong tab'); window.fixture.reloaded++; } },
      scripting: { executeScript: async () => [{ result: true }] }
    } });
  });
  await page.goto(pathToFileURL(path.join(root, 'popup/popup.html')).href);
  const ready = () => page.waitForFunction(() => {
    const toggle = document.getElementById('enabled') as HTMLInputElement | null;
    return toggle !== null && !toggle.disabled;
  });
  await ready();
  assert.equal(await page.locator('body').innerText(), 'YouTube AV1\nPrefer AV1\nReload to take effect');
  assert.equal(await page.locator('#apply').isDisabled(), true);
  const centered = await page.locator('.brand').evaluate(row => {
    const bounds = row.getBoundingClientRect();
    const logo = row.querySelector('img')?.getBoundingClientRect();
    const title = row.querySelector('h1')?.getBoundingClientRect();
    return logo !== undefined && title !== undefined &&
      Math.abs((logo.left + title.right) / 2 - (bounds.left + bounds.right) / 2) < 1;
  });
  assert.ok(centered, 'logo and title must be centered as a group');
  if (screenshots) await page.locator('body').screenshot({ path: screenshotPath('popup-dark.png') });
  await page.locator('#enabled').uncheck();
  await ready();
  assert.equal(await page.locator('#apply').isEnabled(), true);
  await page.reload();
  await ready();
  assert.equal(await page.locator('#enabled').isChecked(), false);
  assert.equal(await page.locator('#apply').isEnabled(), true);
  await page.locator('#enabled').check();
  await ready();
  assert.equal(await page.locator('#apply').isDisabled(), true);
  await page.evaluate(() => { window.fixture.fail = true; });
  await page.locator('#enabled').click();
  await ready();
  assert.equal(await page.locator('#enabled').isChecked(), true);
  assert.equal(await page.locator('#apply').isDisabled(), true);
  await page.evaluate(() => { window.fixture.fail = false; });
  await page.locator('#enabled').uncheck();
  await ready();
  await page.locator('#apply').click();
  await ready();
  assert.equal(await page.evaluate(() => window.fixture.reloaded), 1);
  assert.equal(await page.locator('#apply').isDisabled(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 300);
  await page.emulateMedia({ colorScheme: 'light' });
  assert.equal(await page.locator('#apply').isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: UI text, centered branding, reload workflow, save failure rollback, no script errors or overflow. Browser APIs mocked.');
} finally {
  await browser.close();
}
