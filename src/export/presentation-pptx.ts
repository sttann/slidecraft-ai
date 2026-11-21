import pptxgen from 'pptxgenjs';
import { presentationSchema, type Presentation } from '../domain/deck.ts';
import { layoutPresentation, SLIDE_HEIGHT, SLIDE_WIDTH } from '../layout/engine.ts';

export async function createPresentationPptx(input: Presentation): Promise<Blob> {
  const presentation = presentationSchema.parse(input);
  const scenes = layoutPresentation(presentation);
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'SLIDECRAFT_WIDE', width: SLIDE_WIDTH / 72, height: SLIDE_HEIGHT / 72 });
  pptx.layout = 'SLIDECRAFT_WIDE';
  pptx.author = 'SlideCraft AI'; pptx.title = presentation.title;
  pptx.subject = presentation.source === 'mock' ? 'Mock presentation — editable native PowerPoint' : 'Editable presentation';
  pptx.company = 'SlideCraft AI';
  pptx.theme = { headFontFace: presentation.theme.fonts.heading, bodyFontFace: presentation.theme.fonts.body };
  scenes.forEach((scene, index) => {
    const slide = pptx.addSlide(); slide.background = { color: scene.background };
    for (const node of scene.nodes) {
      if (node.type === 'text') {
        slide.addText(node.lines.join('\n'), { x: node.x / 72, y: node.y / 72, w: node.w / 72, h: node.h / 72,
          fontFace: node.fontFace, fontSize: node.fontSize, color: node.color, bold: node.bold, align: node.align,
          margin: 0, valign: 'top', wrap: false, lineSpacing: node.lineHeight, paraSpaceAfter: 0, paraSpaceBefore: 0,
          lang: presentation.language, objectName: node.id,
        });
      } else if (node.type === 'line') {
        // Normalize the line rectangle and flip a rising diagonal to preserve its endpoints.
        slide.addShape(pptx.ShapeType.line, { x: Math.min(node.x1, node.x2) / 72, y: Math.min(node.y1, node.y2) / 72,
          w: Math.abs(node.x2 - node.x1) / 72, h: Math.abs(node.y2 - node.y1) / 72,
          flipV: (node.x2 - node.x1) * (node.y2 - node.y1) < 0,
          line: { color: node.color, width: node.width }, objectName: node.id });
      } else {
        slide.addShape(node.type === 'ellipse' ? pptx.ShapeType.ellipse : pptx.ShapeType.rect, {
          x: node.x / 72, y: node.y / 72, w: node.w / 72, h: node.h / 72, objectName: node.id,
          fill: node.fill ? { color: node.fill } : { color: 'FFFFFF', transparency: 100 },
          line: node.stroke ? { color: node.stroke, width: node.strokeWidth ?? 1 } : { transparency: 100 },
        });
      }
    }
    const notes = [presentation.slides[index].notes];
    if (scene.warnings.length) notes.push(presentation.language === 'zh-CN' ? '以下内容因页面容量限制在画面中显示摘要，完整原文如下：' : 'The following text was shortened on the slide to prevent overflow. Full original text:');
    for (const warning of scene.warnings) notes.push(warning.original);
    if (notes.some(Boolean)) slide.addNotes(notes.filter(Boolean).join('\n\n'));
  });
  const bytes = await pptx.write({ outputType: 'arraybuffer', compression: true });
  if (!(bytes instanceof ArrayBuffer)) throw new Error('PPTX 库返回了未知格式。');
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
