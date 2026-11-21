import pptxgen from 'pptxgenjs';
import { slideSchema, themes, type ProbeSlide, type ThemeId } from '../domain/presentation';
import type { AnnaHost } from '../platform/anna';

export const pptxMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
export async function createPptx(content: ProbeSlide, themeId: ThemeId): Promise<Blob> {
  const data = slideSchema.parse(content);
  const theme = themes[themeId];
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'SlideCraft AI';
  pptx.subject = 'Phase 1 editable export validation';
  pptx.title = data.title;
  pptx.theme = { headFontFace: 'Microsoft YaHei', bodyFontFace: 'Microsoft YaHei' };
  const slide = pptx.addSlide();
  slide.background = { color: theme.paper };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: theme.ink }, line: { transparency: 100 } });
  slide.addText('SLIDECRAFT  /  IDEAS INTO IMPACT', { x: 0.8, y: 0.55, w: 10, h: 0.25, fontSize: 10, charSpacing: 2, color: theme.muted, margin: 0 });
  slide.addText(data.title, { x: 0.8, y: 1.3, w: 11.6, h: 1.4, fontSize: 34, bold: true, color: theme.ink, margin: 0, breakLine: false, fit: 'shrink', valign: 'middle' });
  data.bullets.forEach((point, index) => {
    const y = 3.2 + index * 0.75;
    slide.addShape(pptx.ShapeType.ellipse, { x: 0.85, y: y + 0.1, w: 0.16, h: 0.16, fill: { color: theme.ink }, line: { transparency: 100 } });
    slide.addText(point, { x: 1.25, y, w: 10.6, h: 0.55, fontSize: 20, color: theme.ink, margin: 0, fit: 'shrink', valign: 'middle' });
  });
  slide.addText('MAKE YOUR NEXT IDEA COUNT.', { x: 0.8, y: 6.9, w: 10, h: 0.2, fontSize: 9, color: theme.muted, margin: 0 });
  slide.addText('01', { x: 11.8, y: 6.85, w: 0.6, h: 0.3, fontSize: 12, color: theme.ink, margin: 0 });
  const result = await pptx.write({ outputType: 'arraybuffer', compression: true });
  if (!(result instanceof ArrayBuffer)) throw new Error('PPTX 库返回了未知格式。');
  return new Blob([result], { type: pptxMime });
}

export function safeFilename(title: string): string {
  const cleaned = Array.from(title).filter(char => char.charCodeAt(0) >= 32).join('');
  return (cleaned.replace(/[<>:"/\\|?*]/g, '').replace(/[. ]+$/g, '').trim().slice(0, 60) || 'SlideCraft') + '.pptx';
}

export async function downloadPptx(blob: Blob, filename: string, host: AnnaHost | null, fetcher: typeof fetch = fetch): Promise<void> {
  if (host) {
    const path = `exports/${crypto.randomUUID()}.pptx`;
    const init = await host.files.upload_init({ path, content_type: pptxMime, size: blob.size, ttl_seconds: 3600 });
    const target = new URL(init.put_url);
    if (target.protocol !== 'https:') throw new Error('宿主返回了非安全上传地址。');
    const put = await fetcher(init.put_url, { method: 'PUT', headers: init.headers, body: blob, signal: AbortSignal.timeout(60000) });
    if (!put.ok) throw new Error(`文件上传失败 (${put.status})，未发起下载。`);
    await host.files.upload_finalize({ path, size: blob.size });
    const response = await host.files.download({ path, filename });
    if (!response.ok) throw new Error('宿主未确认下载，请稍后重试。');
    return;
  }
  // iframe downloads MUST go through Anna. Never silently fall back to a sandboxed anchor.
  if (window.parent !== window) throw new Error('Anna 宿主未连接，无法在沙箱内下载。');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
