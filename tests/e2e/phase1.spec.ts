import { expect, test } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import JSZip from 'jszip';

test('Mock workflow downloads a genuinely editable PPTX without any Anna network requests', async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith('https://')) externalRequests.push(request.url());
  });
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/?lab=phase1');
  await expect(page.getByRole('button', { name: '测试真实 AI 连接' })).toBeDisabled();
  await page.getByLabel('你想讲述什么？').fill('RAG 技术：让知识成为生产力');
  await page.getByRole('button', { name: '生成 Mock 示例' }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveText('RAG 技术：让知识成为生产力');
  await page.getByRole('button', { name: '深海蓝' }).click();
  await page.getByText('编辑示例内容', { exact: false }).click();
  await page.getByLabel('页面标题').fill('我的可编辑演示');
  await page.getByRole('textbox', { name: '要点 1', exact: true }).fill('文本与图形均保持可编辑');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 PPTX' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('我的可编辑演示.pptx');
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
  expect(xml).toContain('我的可编辑演示');
  expect(xml).toContain('文本与图形均保持可编辑');
  expect(xml).toContain('153F64');
  expect(xml).toContain('<a:t>');
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  await mkdir('artifacts', { recursive: true });
  await download.saveAs(`artifacts/phase1-${testInfo.project.name}.pptx`);
  await page.screenshot({ path: `artifacts/phase1-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('empty input is blocked; theme and refresh never generate AI', async ({ page }) => {
  await page.goto('/?lab=phase1');
  await page.getByLabel('你想讲述什么？').fill('');
  await expect(page.getByRole('button', { name: '生成 Mock 示例' })).toBeDisabled();
  await page.getByRole('button', { name: '经典黑白' }).click();
  await page.reload();
  await expect(page.getByText('本浏览器探针记录：0 次', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '测试真实 AI 连接' })).toBeDisabled();
});
