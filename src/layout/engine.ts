import { deckSlideSchema, presentationSchema, type DeckSlide, type Presentation, type Theme } from '../domain/deck.ts';
import { fitList, fitText, type FittedText } from './text.ts';

export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;
export const LAYOUT_VERSION = 1;
export interface Rect { x: number; y: number; w: number; h: number }
export interface TextNode extends Rect, FittedText {
  type: 'text'; id: string; role: 'title' | 'body' | 'label' | 'footer' | 'decoration';
  source: string; color: string; fontFace: string; bold: boolean; align: 'left' | 'right' | 'center';
}
export interface ShapeNode extends Rect { type: 'rect' | 'ellipse'; id: string; fill?: string; stroke?: string; strokeWidth?: number }
export interface LineNode { type: 'line'; id: string; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
export type SceneNode = TextNode | ShapeNode | LineNode;
export interface SlideScene {
  version: typeof LAYOUT_VERSION; slideId: string; layout: DeckSlide['layout']; background: string;
  width: number; height: number; nodes: SceneNode[];
  warnings: { code: 'text-shortened'; nodeId: string; original: string; displayed: string }[];
}
function tint(foreground: string, background: string, opacity: number): string {
  return [0, 2, 4].map(offset => Math.round(parseInt(foreground.slice(offset, offset + 2), 16) * opacity + parseInt(background.slice(offset, offset + 2), 16) * (1 - opacity)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function layoutSlide(input: DeckSlide, theme: Theme, index: number, total: number, language: Presentation['language']): SlideScene {
  const slide = deckSlideSchema.parse(input);
  const { ink, paper, accent, muted } = theme.colors;
  const summary = slide.layout === 'summary';
  const scene: SlideScene = { version: LAYOUT_VERSION, slideId: slide.id, layout: slide.layout, background: summary ? ink : paper, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, nodes: [], warnings: [] };
  let serial = 0;
  const nextId = () => `${slide.id}-${++serial}`;
  function shape(type: ShapeNode['type'], box: Rect, fill?: string, stroke?: string, strokeWidth = 1) { scene.nodes.push({ type, id: nextId(), ...box, fill, stroke, strokeWidth }); }
  function line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1) { scene.nodes.push({ type: 'line', id: nextId(), x1, y1, x2, y2, color, width }); }
  function text(source: string, box: Rect, fontSize: number, minimum: number, role: TextNode['role'], color = ink, bold = false, align: TextNode['align'] = 'left', fitted?: FittedText) {
    const fit = fitted ?? fitText(source, box.w, box.h, fontSize, minimum, bold);
    const id = nextId();
    scene.nodes.push({ type: 'text', id, role, source, ...box, ...fit, color, bold, align, fontFace: role === 'title' ? theme.fonts.heading : theme.fonts.body });
    if (fit.shortened) scene.warnings.push({ code: 'text-shortened', nodeId: id, original: source, displayed: fit.lines.join('\n') });
  }
  const gap = theme.spacing === 'compact' ? 9 : 14;
  function list(items: string[], box: Rect, color = ink, markerColor = muted, numbered = false) {
    const indent = numbered ? 35 : 22;
    const fits = fitList(items, box.w - indent, box.h, 20, 12, gap);
    let y = box.y;
    fits.forEach((fit, i) => {
      if (numbered && summary) {
        line(box.x + 1, y + 10, box.x + 5, y + 14, markerColor, 1.6);
        line(box.x + 5, y + 14, box.x + 13, y + 3, markerColor, 1.6);
      } else if (numbered) text(String(i + 1).padStart(2, '0'), { x: box.x, y: y + 3, w: 25, h: 19 }, 11, 10, 'label', markerColor);
      else shape('ellipse', { x: box.x + 2, y: y + 7, w: 4, h: 4 }, markerColor);
      const h = fit.lines.length * fit.lineHeight;
      text(items[i], { x: box.x + indent, y, w: box.w - indent, h }, fit.fontSize, fit.fontSize, 'body', color, false, 'left', fit);
      y += h + gap;
    });
  }
  shape('rect', { x: 0, y: 0, w: 9, h: 540 }, summary ? accent : ink);
  const label = language === 'en-US' ? slide.layout.replaceAll('-', ' ').toUpperCase() : ({ cover: '封面', section: '章节', bullets: '要点', 'two-columns': '双栏', comparison: '对比', process: '流程', summary: '总结' })[slide.layout];
  text(`SLIDECRAFT / ${label}`, { x: 58, y: 35, w: 700, h: 16 }, 9, 9, 'label', summary ? accent : muted);
  text(summary ? 'MAKE YOUR NEXT IDEA COUNT.' : 'IDEAS INTO IMPACT.', { x: 58, y: 497, w: 650, h: 15 }, 8, 8, 'footer', summary ? accent : muted);
  text(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, { x: 830, y: 496, w: 72, h: 16 }, 9, 9, 'footer', summary ? accent : muted, false, 'right');

  if (slide.layout === 'cover') {
    shape('ellipse', { x: 750, y: 162, w: 170, h: 170 }, undefined, accent, 10);
    shape('ellipse', { x: 731, y: 143, w: 208, h: 208 }, undefined, tint(ink, paper, 0.16), 1);
    text(slide.title, { x: 58, y: 128, w: 645, h: 173 }, 44, 24, 'title', ink, true);
    text(slide.elements[0].text, { x: 58, y: 348, w: 645, h: 118 }, 19, 12, 'body', muted);
  } else if (slide.layout === 'section') {
    text(String(index + 1).padStart(2, '0'), { x: 58, y: 190, w: 214, h: 178 }, 126, 110, 'decoration', tint(ink, paper, 0.18));
    text(slide.title, { x: 330, y: 137, w: 572, h: 145 }, 34, 22, 'title', ink, true);
    text(slide.elements[0].text, { x: 330, y: 324, w: 572, h: 140 }, 19, 12, 'body', muted);
  } else {
    text(slide.title, { x: 58, y: 96, w: 844, h: 98 }, 33, 22, 'title', summary ? paper : ink, true);
    if (slide.layout === 'bullets' || slide.layout === 'summary') list(slide.elements[0].items, { x: 58, y: 222, w: 844, h: 240 }, summary ? paper : ink, summary ? accent : muted, true);
    else if (slide.layout === 'two-columns' || slide.layout === 'comparison') {
      const compare = slide.layout === 'comparison';
      const columns = slide.layout === 'two-columns' ? slide.elements[0].columns : [slide.elements[0].left, slide.elements[0].right];
      const width = 408;
      columns.forEach((column, i) => {
        const x = 58 + i * 436;
        const dark = compare && i === 1;
        if (compare) shape('rect', { x, y: 220, w: width, h: 246 }, dark ? ink : undefined, dark ? ink : muted, 0.7);
        const inset = compare ? 20 : 0;
        text(compare ? (i === 0 ? 'A' : 'B') : `0${i + 1}`, { x: x + inset, y: 231, w: 100, h: 16 }, 10, 10, 'label', dark ? accent : muted);
        text(column.heading, { x: x + inset, y: 256, w: width - inset * 2, h: 55 }, 23, 14, 'body', dark ? paper : ink, true);
        list(column.items, { x: x + inset, y: 324, w: width - inset * 2, h: 130 }, dark ? paper : ink, dark ? accent : muted);
      });
      if (!compare) line(480, 230, 480, 461, tint(muted, paper, 0.45), 0.7);
    } else if (slide.layout === 'process') {
      const steps = slide.elements[0].steps;
      const rows = steps.length > 3 ? 2 : 1;
      const count = rows === 2 ? 3 : steps.length;
      const width = (844 - (count - 1) * 26) / count;
      const rowHeight = rows === 1 ? 240 : 110;
      steps.forEach((step, i) => {
        const col = i % count; const row = Math.floor(i / count);
        const x = 58 + col * (width + 26); const y = 220 + row * 131;
        if (rows === 1) {
          shape('ellipse', { x, y, w: 38, h: 38 }, ink);
          text(String(i + 1).padStart(2, '0'), { x: x + 5, y: y + 10, w: 28, h: 18 }, 11, 11, 'label', accent, false, 'center');
          if (i < steps.length - 1) line(x + 50, y + 19, x + width + 10, y + 19, muted, 0.7);
          text(step.title, { x, y: y + 56, w: width, h: 58 }, 21, 13, 'body', ink, true);
          text(step.description, { x, y: y + 122, w: width, h: rowHeight - 122 }, 17, 12, 'body', muted);
        } else {
          text(String(i + 1).padStart(2, '0'), { x, y, w: 30, h: 18 }, 11, 11, 'label', muted);
          text(step.title, { x: x + 36, y, w: width - 36, h: 37 }, 16, 12, 'body', ink, true);
          text(step.description, { x, y: y + 45, w: width, h: 64 }, 14, 12, 'body', muted);
        }
      });
    }
  }
  return scene;
}

export function layoutPresentation(input: Presentation): SlideScene[] {
  const presentation = presentationSchema.parse(input);
  return presentation.slides.map((slide, index) => layoutSlide(slide, presentation.theme, index, presentation.slides.length, presentation.language));
}
