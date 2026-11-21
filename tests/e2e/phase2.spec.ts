import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const scenarios = [
  { id: 'rag', label: 'RAG 技术介绍', count: 8, title: '我希望受众记住的观点', description: '检索相关知识，再形成可验证的回答。' },
  { id: 'product', label: '商业产品分析', count: 6, title: '从用户问题出发', description: '先理解用户，再确定需要验证的产品价值。' },
  { id: 'teaching', label: '英文教学演示', count: 10, title: 'A clear learning objective', description: 'Explain the idea and validate it with a simple example.' },
];

for (const scenario of scenarios) {
  test(`${scenario.count}-page ${scenario.id}: brief → edited outline → preview uses no AI`, async ({ page }, testInfo) => {
    const external: string[] = []; const errors: string[] = [];
    page.on('request', req => { if (/^https?:/.test(req.url()) && new URL(req.url()).hostname !== '127.0.0.1') external.push(req.url()); });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(scenario.label) }).click();
    await expect(page.getByLabel('演示页数', { exact: true })).toHaveValue(String(scenario.count));
    await mkdir('artifacts', { recursive: true });
    if (scenario.id === 'rag') await page.screenshot({ path: `artifacts/phase2-brief-${testInfo.project.name}.png`, fullPage: true });
    await page.getByRole('button', { name: '生成示例大纲', exact: true }).click();
    await expect(page.getByTestId('outline-page')).toHaveCount(scenario.count);
    await page.getByLabel('第 2 页标题', { exact: true }).fill(scenario.title);
    await page.getByLabel('第 2 页要点', { exact: true }).fill(scenario.description);
    await page.getByLabel('第 2 页布局', { exact: true }).selectOption('bullets');
    await page.getByRole('button', { name: '上移第 2 页', exact: true }).click();
    await expect(page.getByLabel('第 1 页标题', { exact: true })).toHaveValue(scenario.title);
    await page.getByRole('button', { name: '添加页面', exact: true }).click();
    await expect(page.getByTestId('outline-page')).toHaveCount(scenario.count + 1);
    await page.getByRole('button', { name: '删除第 3 页', exact: true }).click();
    await expect(page.getByTestId('outline-page')).toHaveCount(scenario.count);
    if (scenario.id === 'rag') await page.screenshot({ path: `artifacts/phase2-outline-${testInfo.project.name}.png`, fullPage: true });
    await page.getByRole('button', { name: '确认大纲，展开示例', exact: true }).click();
    await expect(page.getByTestId('slide-preview').getByRole('heading', { level: 3 })).toHaveText(scenario.title);
    await expect(page.getByTestId('slide-preview')).toContainText(scenario.description);
    if (scenario.id === 'teaching') await expect(page.getByTestId('slide-preview')).not.toContainText(/[\u3400-\u9fff]/);
    await expect(page.getByRole('navigation', { name: '幻灯片列表' }).getByRole('button')).toHaveCount(scenario.count);
    await page.getByRole('button', { name: '经典黑白', exact: true }).click();
    await expect(page.getByTestId('slide-preview')).toHaveCSS('background-color', 'rgb(244, 242, 238)');
    await expect(page.getByTestId('slide-preview').getByRole('heading', { level: 3 })).toHaveText(scenario.title);
    await expect(page.getByTestId('page-counter')).toHaveText(`01 / ${String(scenario.count).padStart(2, '0')}`);
    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await expect(page.getByTestId('page-counter')).toHaveText(`02 / ${String(scenario.count).padStart(2, '0')}`);
    await page.getByLabel('幻灯片预览区域，使用左右方向键翻页', { exact: true }).press('ArrowRight');
    await expect(page.getByTestId('page-counter')).toHaveText(`03 / ${String(scenario.count).padStart(2, '0')}`);
    await page.getByRole('button', { name: new RegExp(`^查看第 ${scenario.count} 页：`) }).click();
    await expect(page.getByTestId('slide-preview')).toHaveAttribute('data-layout', 'summary');
    if (scenario.id === 'teaching') await expect(page.getByTestId('slide-preview')).not.toContainText(/[\u3400-\u9fff]/);
    await expect(page.getByRole('button', { name: '下一页', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '下载 PPTX', exact: true })).toBeEnabled();
    await page.screenshot({ path: `artifacts/phase2-preview-${scenario.id}-${testInfo.project.name}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(external).toEqual([]); expect(errors).toEqual([]);
  });
}

test('invalid brief and outline edits stay editable and cannot bypass validation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: '演示制作进度' }).getByRole('button', { name: /演示预览/ })).toBeDisabled();
  await page.getByRole('button', { name: '生成示例大纲', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('请检查需求');
  await expect(page.getByLabel('演示主题', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: /RAG 技术介绍/ }).click();
  await page.getByRole('button', { name: '生成示例大纲', exact: true }).click();
  await page.getByLabel('第 1 页标题', { exact: true }).fill('');
  await page.getByRole('button', { name: '确认大纲，展开示例', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('每页填写有效');
  await expect(page.getByLabel('第 1 页标题', { exact: true })).toHaveValue('');
  await expect(page.getByTestId('outline-page')).toHaveCount(8);
});

test('all seven design previews render in desktop and mobile without content escaping the slide', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /RAG 技术介绍/ }).click();
  await page.getByRole('button', { name: '生成示例大纲', exact: true }).click();
  await page.getByRole('button', { name: '确认大纲，展开示例', exact: true }).click();
  const layouts = new Set<string>();
  for (let i = 1; i <= 8; i++) {
    await page.getByRole('button', { name: new RegExp(`^查看第 ${i} 页：`) }).click();
    const slide = page.getByTestId('slide-preview');
    const layout = (await slide.getAttribute('data-layout'))!;
    layouts.add(layout);
    const escaped = await slide.evaluate(element => {
      return Array.from(element.querySelectorAll<SVGTextElement>('svg text')).filter(node => {
        const rect = node.getBBox();
        return rect.x + rect.width > 961 || rect.x < -1 || rect.y + rect.height > 541 || rect.y < -1;
      }).map(node => node.textContent);
    });
    expect(escaped).toEqual([]);
    if (testInfo.project.name === 'desktop') await page.screenshot({ path: `artifacts/phase2-layout-${layout}.png`, fullPage: true });
  }
  expect(layouts.size).toBe(7);
});
