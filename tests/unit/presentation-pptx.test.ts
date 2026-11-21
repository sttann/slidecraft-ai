import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createPresentationPptx } from '../../src/export/presentation-pptx';
import { layoutPresentation } from '../../src/layout/engine';
import { createMockOutline, createMockPresentation, exampleBriefs } from '../../src/mocks/presentations';
import { nativeShapes } from '../helpers/pptx-xml';

describe('Phase 3 native editable multi-page PPTX', () => {
  it.each(exampleBriefs)('exports $label with the same text, geometry and editable native objects', async ({ brief }) => {
    const deck = createMockPresentation(brief, createMockOutline(brief));
    const scenes = layoutPresentation(deck);
    const zip = await JSZip.loadAsync(await (await createPresentationPptx(deck)).arrayBuffer());
    expect(Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))).toHaveLength(brief.slideCount);
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(await zip.file('ppt/presentation.xml')!.async('string')).toContain('cx="12192000" cy="6858000"');
    for (let index = 0; index < scenes.length; index++) {
      const xml = await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string');
      expect(xml).not.toContain('<p:pic>');
      const shapes = nativeShapes(xml);
      for (const node of scenes[index].nodes) {
        const shape = shapes.find(shape => shape.name === node.id);
        expect(shape, node.id).toBeDefined();
        if (!shape || node.type === 'line') continue;
        for (const key of ['x', 'y', 'w', 'h'] as const) expect(Math.abs(shape[key] - Math.round(node[key] * 12700))).toBeLessThanOrEqual(1);
        if (node.type === 'text') { expect(shape.text).toEqual(node.lines); expect(shape.fontSize).toBe(node.fontSize); }
      }
    }
  });
  it('keeps full original text in notes when the visible slide must shorten it', async () => {
    const brief = exampleBriefs[0].brief; const deck = createMockPresentation(brief, createMockOutline(brief));
    const slide = deck.slides.find(slide => slide.layout === 'comparison')!;
    if (slide.layout !== 'comparison') throw new Error('Fixture mismatch');
    slide.elements[0].left.items = Array.from({ length: 4 }, () => '必须保留的完整原文'.repeat(12));
    const scene = layoutPresentation(deck)[deck.slides.indexOf(slide)];
    expect(scene.warnings.length).toBeGreaterThan(0);
    const zip = await JSZip.loadAsync(await (await createPresentationPptx(deck)).arrayBuffer());
    const notes = await zip.file(`ppt/notesSlides/notesSlide${deck.slides.indexOf(slide) + 1}.xml`)!.async('string');
    expect(notes).toContain('必须保留的完整原文'.repeat(12));
  });
  it('rejects invalid model input before creating a partial file', async () => {
    const brief = exampleBriefs[0].brief; const deck = createMockPresentation(brief, createMockOutline(brief));
    deck.slides[1].id = deck.slides[0].id;
    await expect(createPresentationPptx(deck)).rejects.toThrow();
  });
});
