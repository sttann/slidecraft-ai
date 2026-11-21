import { describe, expect, it } from 'vitest';
import { briefSchema, deckSlideSchema, layoutIds, outlineSchema, presentationSchema } from '../../src/domain/deck';
import { createMockOutline, createMockPresentation, exampleBriefs } from '../../src/mocks/presentations';

const brief = exampleBriefs[0].brief;
const presentation = () => createMockPresentation(brief, createMockOutline(brief));

describe('Phase 2 presentation contracts', () => {
  it.each(exampleBriefs)('builds a valid $label fixture with exactly the requested page count', ({ brief }) => {
    const deck = createMockPresentation(brief, createMockOutline(brief));
    expect(presentationSchema.safeParse(deck).success).toBe(true);
    expect(deck.slides).toHaveLength(brief.slideCount);
    expect(deck.language).toBe(brief.language);
    expect(deck.source).toBe('mock');
    expect(deck.slides[0].layout).toBe('cover');
    expect(deck.slides.at(-1)?.layout).toBe('summary');
    expect(presentationSchema.parse(JSON.parse(JSON.stringify(deck)))).toEqual(deck);
  });
  it('exercises all seven layout contracts with the eight-page RAG fixture', () => {
    expect(new Set(presentation().slides.map(slide => slide.layout))).toEqual(new Set(layoutIds));
  });
  it('rejects mismatched layout data rather than letting renderers guess', () => {
    const slide = presentation().slides[0];
    expect(deckSlideSchema.safeParse({ ...slide, layout: 'process' }).success).toBe(false);
    expect(deckSlideSchema.safeParse({ ...slide, layout: 'unknown' }).success).toBe(false);
  });
  it('rejects repeated slide IDs and slide/element collisions', () => {
    const deck = presentation();
    deck.slides[1].id = deck.slides[0].id;
    expect(presentationSchema.safeParse(deck).success).toBe(false);
    const other = presentation();
    other.slides[0].elements[0].id = other.slides[1].id;
    expect(presentationSchema.safeParse(other).success).toBe(false);
    const outline = createMockOutline(brief); outline.slides[1].id = outline.slides[0].id;
    expect(outlineSchema.safeParse(outline).success).toBe(false);
  });
  it('rejects invalid versions, colors, long titles and unknown fields', () => {
    const deck = presentation();
    expect(presentationSchema.safeParse({ ...deck, schemaVersion: 2 }).success).toBe(false);
    expect(presentationSchema.safeParse({ ...deck, unwanted: true }).success).toBe(false);
    expect(presentationSchema.safeParse({ ...deck, title: '字'.repeat(81) }).success).toBe(false);
    deck.theme.colors.ink = 'javascript:red';
    expect(presentationSchema.safeParse(deck).success).toBe(false);
  });
  it.each([0, 4, 16, 7.5, NaN])('rejects the invalid requested count %s', slideCount => {
    expect(briefSchema.safeParse({ ...brief, slideCount }).success).toBe(false);
  });
  it.each([5, 15])('accepts and generates the boundary count %s', slideCount => {
    const input = { ...brief, slideCount };
    expect(createMockPresentation(input, createMockOutline(input)).slides).toHaveLength(slideCount);
  });
  it('keeps long valid outline IDs while allocating non-colliding element IDs', () => {
    const outline = createMockOutline(brief);
    outline.slides[0].id = 'element-1';
    outline.slides[1].id = 'a'.repeat(64);
    expect(presentationSchema.safeParse(createMockPresentation(brief, outline)).success).toBe(true);
  });
});
