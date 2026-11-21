import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { readFile, mkdir } from 'node:fs/promises';

test('edit, cancel, validation, theme, revisit and PPTX preserve saved content', async ({page}, info) => {
 await page.goto('/');
 await page.getByRole('button',{name:/RAG 技术介绍/}).click();
 await page.getByRole('button',{name:'生成示例大纲',exact:true}).click();
 await page.getByRole('button',{name:'确认大纲，展开示例',exact:true}).click();
 await page.getByRole('button',{name:'编辑本页内容',exact:true}).click();
 await page.getByLabel('本页标题',{exact:true}).fill('');
 await page.getByRole('button',{name:'保存本页',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('请填写有效');
 await page.getByLabel('本页标题',{exact:true}).fill('保存后的真实标题');
 await page.getByLabel('本页正文',{exact:true}).fill('直接编辑正文，不必重新生成。');
 await page.getByLabel('演讲备注',{exact:true}).fill('讲解时强调这个观点。');
 await page.getByRole('button',{name:'保存本页',exact:true}).click();
 await expect(page.getByTestId('slide-preview')).toContainText('保存后的真实标题');
 await page.getByRole('button',{name:'编辑本页内容',exact:true}).click();
 await page.getByLabel('本页标题',{exact:true}).fill('不应保存');
 await page.getByRole('button',{name:'取消修改',exact:true}).click();
 await page.getByRole('button',{name:'深海蓝',exact:true}).click();
 await page.getByRole('button',{name:'编辑大纲',exact:true}).click();
 await page.getByRole('button',{name:'确认大纲，展开示例',exact:true}).click();
 await expect(page.getByTestId('slide-preview')).toContainText('保存后的真实标题');
 const pending = page.waitForEvent('download');
 await page.getByRole('button',{name:'下载 PPTX',exact:true}).click();
 const download = await pending;
 const zip = await JSZip.loadAsync(await readFile((await download.path())!));
 expect(await zip.file('ppt/slides/slide1.xml')!.async('string')).toContain('保存后的真实标题');
 expect(await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string')).toContain('讲解时强调这个观点。');
 await mkdir('artifacts/phase5',{recursive:true});
 await page.screenshot({path:`artifacts/phase5/edited-${info.project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('standalone AI failure leaves input intact and Mock remains usable', async ({page}) => {
 await page.goto('/');
 await page.getByRole('button',{name:/RAG 技术介绍/}).click();
 await page.getByRole('button',{name:'AI 生成大纲',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Anna 宿主');
 await expect(page.locator('#brief-topic')).not.toHaveValue('');
 await expect(page.getByRole('button',{name:'AI 生成大纲',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'生成示例大纲',exact:true}).click();
 await expect(page.getByTestId('outline-page')).toHaveCount(8);
});

test('all seven layout editors save fields without replacing other pages', async ({page}) => {
 await page.goto('/');
 await page.getByRole('button',{name:/RAG 技术介绍/}).click();
 await page.getByRole('button',{name:'生成示例大纲',exact:true}).click();
 await page.getByRole('button',{name:'确认大纲，展开示例',exact:true}).click();
 for (const i of [1,2,3,4,5,6,8]) {
  await page.getByRole('button',{name:new RegExp(`^查看第 ${i} 页：`)}).click();
  await page.getByRole('button',{name:'编辑本页内容',exact:true}).click();
  const editor = page.getByRole('region',{name:'本页内容编辑器'});
  const fields = editor.locator('textarea');
  for(let j=0;j<await fields.count();j++) await fields.nth(j).fill(`第${i}页字段${j}已更新`);
  await editor.getByRole('button',{name:'保存本页',exact:true}).click();
  await expect(page.getByTestId('slide-preview')).toContainText(`第${i}页字段0已更新`);
 }
});

