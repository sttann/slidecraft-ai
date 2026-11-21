import { describe, expect, it } from 'vitest';
import { createGenerator, type GenerationAudit, type GenerationRecord } from '../../src/platform/generation';
import { createPresentationPptx } from '../../src/export/presentation-pptx';
import type { AnnaHost } from '../../src/platform/anna';
import { createMockOutline, createMockPresentation, exampleBriefs } from '../../src/mocks/presentations';

describe('Anna generation safety', () => {
  function setup(text: string, consumed: number | undefined = 0.01) {
    let records: GenerationRecord[] = [], calls = 0;
    const audit: GenerationAudit = { read: () => structuredClone(records), write: value => { records = structuredClone(value); } };
    const host = { llm: { catalog: async () => ({ quota: { remainingCU: 900 } }), complete: async () => { calls++; return { content: { text }, stopReason: 'endTurn', _meta: { quotaConsumed: consumed } }; } } } as unknown as AnnaHost;
    return { generator: createGenerator(host, audit), audit, calls: () => calls };
  }
  const brief = exampleBriefs[0].brief;
  it('deduplicates simultaneous and repeated successful requests', async () => {
    const outline = { ...createMockOutline(brief), source: 'anna' };
    const test = setup(JSON.stringify(outline));
    const [a,b] = await Promise.all([test.generator.outline(brief), test.generator.outline(brief)]);
    expect(a).toEqual(b); await test.generator.outline(brief); expect(test.calls()).toBe(1);
    expect(test.audit.read()[0]).toMatchObject({ status: 'success', consumed: 0.01 });
  });
  it('records billed malformed output before permitting an explicit retry', async () => {
    const test = setup('not JSON');
    await expect(test.generator.outline(brief)).rejects.toThrow();
    expect(test.audit.read()[0]).toMatchObject({ status: 'error', consumed: 0.01 });
    expect(test.calls()).toBe(1);
  });
  it('blocks retry when billing is unknown', async () => {
    const test = setup('{}', Number.NaN);
    await expect(test.generator.outline(brief)).rejects.toThrow();
    await expect(test.generator.outline(brief)).rejects.toThrow('未知费用');
    expect(test.calls()).toBe(1);
  });
  it('validates generated body and exports a native PPTX', async () => {
    const outline = createMockOutline(brief);
    const presentation = { ...createMockPresentation(brief, outline), source: 'anna' };
    const test = setup(JSON.stringify({slides: presentation.slides.map(slide => ({id:slide.id,summary:'Real explanation',points:['First point','Second point'],notes:'Notes'}))}));
    const result = await test.generator.presentation(brief, outline);
    const blob = await createPresentationPptx(result);
    expect(blob.size).toBeGreaterThan(1000);
    expect(test.calls()).toBe(1);
  });
  it('rejects invalid brief without spending', () => {
    const test = setup('{}'); expect(() => test.generator.outline({ ...brief, topic: '' })).toThrow(); expect(test.calls()).toBe(0);
  });
});

