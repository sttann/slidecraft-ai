import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
  const errors = [];
  const external = [];
  // A wrongly configured harness must still never spend credits during this smoke test.
  await page.route('**/api/session/call', async route => {
    const body = route.request().postDataJSON();
    if (body.ns === 'llm' && ['complete', 'stream', 'embed'].includes(body.method)) {
      await route.abort();
      errors.push('Refused a potentially billed model request: start harness with --no-llm');
      return;
    }
    await route.continue();
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('request', req => { if (req.url().startsWith('https://')) external.push(new URL(req.url()).origin); });
  await page.goto('http://localhost:5180/');
  await expect(page.frameLocator('iframe').getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
  const labFrame = page.frames().find(frame => frame.parentFrame() === page.mainFrame());
  if (!labFrame) throw new Error('Harness iframe missing');
  const labUrl = new URL(labFrame.url()); labUrl.searchParams.set('lab', 'phase1');
  await labFrame.goto(labUrl.toString());
  const app = page.frameLocator('iframe');
  await expect(app.getByText('Anna 宿主已连接', { exact: true })).toBeVisible({ timeout: 15000 });
  await app.getByRole('button', { name: '生成 Mock 示例' }).click();
  await expect(app.getByRole('heading', { level: 3 })).toHaveText('让每一个想法，清晰呈现。');
  // This harness is launched with --no-llm: the explicit diagnostic must fail cleanly, never bill.
  await app.getByRole('button', { name: '测试真实 AI 连接' }).click();
  await expect(app.getByRole('alert')).toBeVisible({ timeout: 10000 });
  await expect(app.getByText('本浏览器探针记录：0 次', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/phase1-anna-harness.png', fullPage: true });
  const result = { sdkHandshake: 'passed', iframeMock: 'passed', disabledLlmError: 'passed', appLlmCompletions: 0, externalRequests: 0, errors };
  await writeFile('artifacts/harness-smoke.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
