import { describe, expect, it } from 'vitest';
import { layoutPresentation, layoutSlide, SLIDE_HEIGHT, SLIDE_WIDTH, type SlideScene, type TextNode } from '../../src/layout/engine';
import { fitText, measureText, wrapText } from '../../src/layout/text';
import { createMockOutline, createMockPresentation, exampleBriefs } from '../../src/mocks/presentations';
import type { DeckSlide } from '../../src/domain/deck';

export function assertSafeScene(scene: SlideScene) {
  for (const node of scene.nodes) {
    if (node.type === 'line') {
      for (const [x, y] of [[node.x1, node.y1], [node.x2, node.y2]]) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(SLIDE_WIDTH); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(SLIDE_HEIGHT); }
      continue;
    }
    expect(node.x).toBeGreaterThanOrEqual(0); expect(node.y).toBeGreaterThanOrEqual(0);
    expect(node.w).toBeGreaterThan(0); expect(node.h).toBeGreaterThan(0);
    expect(node.x + node.w).toBeLessThanOrEqual(SLIDE_WIDTH + 0.01); expect(node.y + node.h).toBeLessThanOrEqual(SLIDE_HEIGHT + 0.01);
    if (node.type === 'text') {
      expect(node.lines.length * node.lineHeight).toBeLessThanOrEqual(node.h + 0.01);
      for (const line of node.lines) expect(measureText(line, node.fontSize, node.bold)).toBeLessThanOrEqual(node.w + 0.01);
    }
  }
  const text = scene.nodes.filter((node): node is TextNode => node.type === 'text');
  for (let i = 0; i < text.length; i++) for (let j = i + 1; j < text.length; j++) {
    const a = text[i], b = text[j];
    const overlaps = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.1;
    expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false);
  }
}

describe('Phase 3 text fitting', () => {
  it('wraps Chinese, English, long words and graphemes without losing non-whitespace content', () => {
    for (const text of ['让知识成为生产力，保持信息完整。', 'Clear ideas become useful actions.', 'W'.repeat(120), '你好 👩‍💻 café 🌍']) {
      const lines = wrapText(text, 16, 125);
      expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
      for (const line of lines) expect(measureText(line, 16)).toBeLessThanOrEqual(125);
    }
  });
  it('preserves explicit paragraphs and empty lines', () => { expect(wrapText('One\n\nTwo', 16, 300)).toEqual(['One', '', 'Two']); });
  it('keeps Chinese punctuation away from line starts and opening brackets away from line ends', () => {
    const source = '核心观点（解释意义），明确行动。提出建议，并检查结果！';
    const lines = wrapText(source, 19, 145);
    expect(lines.join('')).toBe(source);
    for (const line of lines) {
      expect(line).not.toMatch(/^[，。！？；：、）]/);
      expect(line).not.toMatch(/[（「【]$/);
      expect(measureText(line, 19)).toBeLessThanOrEqual(145);
    }
  });
  it('balances tiny final lines without crossing paragraph boundaries or splitting English words', () => {
    const source = '明确本页的核心观点，解释它的意义，并提出一个可执行的下一步。';
    const lines = wrapText(source, 19, 572);
    expect(lines.join('')).toBe(source);
    expect(measureText(lines.at(-1)!, 19)).toBeGreaterThanOrEqual(572 * 0.28);
    expect(wrapText('One clear action for everyone.\nEnd.', 19, 210).at(-1)).toBe('End.');
  });
  it('shrinks to fit, then explicitly marks shortening at the minimum font', () => {
    const source = '完整原文'.repeat(30);
    const fit = fitText(source, 150, 50, 24, 12);
    expect(fit.shortened).toBe(true); expect(fit.fontSize).toBe(12); expect(fit.lines.at(-1)).toMatch(/…$/);
    expect(fit.lines.length * fit.lineHeight).toBeLessThanOrEqual(50);
  });
  it('rejects impossible geometry instead of producing invalid coordinates', () => { expect(() => fitText('Hello', 2, 2, 20, 12)).toThrow(); });
});

describe('Phase 3 deterministic shared geometry', () => {
  it.each(exampleBriefs)('fits all $label pages without overlapping text boxes', ({ brief }) => {
    const deck = createMockPresentation(brief, createMockOutline(brief));
    const before = JSON.stringify(deck);
    const scenes = layoutPresentation(deck);
    expect(scenes).toHaveLength(brief.slideCount);
    scenes.forEach(assertSafeScene);
    expect(layoutPresentation(deck)).toEqual(scenes);
    expect(JSON.stringify(deck)).toBe(before);
    expect(scenes.flatMap(scene => scene.warnings)).toHaveLength(0);
  });
  it('protects every layout at schema text limits, preserving shortened source diagnostics', () => {
    const brief = exampleBriefs[0].brief;
    const deck = createMockPresentation(brief, createMockOutline(brief));
    let warnings = 0;
    for (const input of deck.slides) {
      const slide = structuredClone(input); slide.title = '长标题'.repeat(26);
      const element = slide.elements[0];
      if (element.type === 'text') element.text = '说明文字'.repeat(60);
      if (element.type === 'bullets') element.items = Array.from({ length: 4 }, () => '正文文字'.repeat(30));
      if (element.type === 'columns' || element.type === 'comparison') {
        const columns = element.type === 'columns' ? element.columns : [element.left, element.right];
        columns.forEach(column => { column.heading = '栏目标题'.repeat(10); column.items = Array.from({ length: 4 }, () => '完整原文'.repeat(30)); });
      }
      if (element.type === 'process') element.steps = Array.from({ length: 5 }, () => ({ title: '步骤标题'.repeat(9), description: '流程原文'.repeat(30) }));
      const scene = layoutSlide(slide as DeckSlide, deck.theme, 0, 8, deck.language);
      assertSafeScene(scene);
      warnings += scene.warnings.length;
      for (const warning of scene.warnings) { expect(warning.original.length).toBeGreaterThan(warning.displayed.length); expect(warning.displayed).toContain('…'); }
    }
    expect(warnings).toBeGreaterThan(0);
  });
});
