import { expect, test } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { nativeShapes } from '../helpers/pptx-xml';

for (const sample of [{ id: 'rag', label: 'RAG 技术介绍', count: 8 }, { id: 'product', label: '商业产品分析', count: 6 }, { id: 'teaching', label: '英文教学演示', count: 10 }]) {
  test(`${sample.id} downloads ${sample.count} editable pages matching actual preview geometry`, async ({ page }, info) => {
    const external: string[] = []; const errors: string[] = [];
    page.on('request', request => { if (request.url().startsWith('https://')) external.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(sample.label) }).click();
    await page.getByRole('button', { name: '生成示例大纲', exact: true }).click();
    await page.getByRole('button', { name: '确认大纲，展开示例', exact: true }).click();
    await page.getByRole('button', { name: '深海蓝', exact: true }).click();
    await page.getByRole('button', { name: /^查看第 3 页：/ }).click();
    const preview = await page.getByTestId('slide-preview').locator('g[data-box]').evaluateAll(elements => elements.map(node => ({
      id: node.getAttribute('data-scene-id')!, box: node.getAttribute('data-box')!.split(',').map(Number),
      fontSize: Number(node.getAttribute('data-font-size')), lines: Array.from(node.querySelectorAll('text'), text => text.textContent ?? ''),
    })));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '下载 PPTX', exact: true }).click();
    const download = await downloadPromise;
    const zip = await JSZip.loadAsync(await readFile((await download.path())!));
    expect(Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))).toHaveLength(sample.count);
    const xml = await zip.file('ppt/slides/slide3.xml')!.async('string');
    expect(xml).not.toContain('<p:pic>');
    const shapes = nativeShapes(xml);
    for (const item of preview) {
      const shape = shapes.find(shape => shape.name === item.id)!;
      expect(shape).toBeDefined(); expect(shape.text).toEqual(item.lines); expect(shape.fontSize).toBe(item.fontSize);
      for (const [i, key] of (['x', 'y', 'w', 'h'] as const).entries()) expect(Math.abs(shape[key] - Math.round(item.box[i] * 12700))).toBeLessThanOrEqual(1);
    }
    expect(xml).toContain('153F64');
    await expect(page.getByRole('status')).toContainText(`${sample.count} 页可编辑 PPTX`);
    await mkdir('artifacts/phase3', { recursive: true });
    await download.saveAs(`artifacts/phase3/${sample.id}-${sample.count}-${info.project.name}.pptx`);
    await page.screenshot({ path: `artifacts/phase3/${sample.id}-${info.project.name}.png`, fullPage: true });
    expect(external).toEqual([]); expect(errors).toEqual([]);
  });
}

test('a download failure is visible and a later user retry succeeds without AI', async ({ page }) => {
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL);
    let shouldFail = true;
    URL.createObjectURL = blob => { if (shouldFail) { shouldFail = false; throw new Error('Mock download failure'); } return original(blob); };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /RAG 技术介绍/ }).click();
  await page.getByRole('button', { name: '生成示例大纲', exact: true }).click();
  await page.getByRole('button', { name: '确认大纲，展开示例', exact: true }).click();
  await page.getByRole('button', { name: '下载 PPTX', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Mock download failure');
  await expect(page.getByRole('button', { name: '下载 PPTX', exact: true })).toBeEnabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 PPTX', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pptx$/);
});
