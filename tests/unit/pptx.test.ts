import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { createPptx, downloadPptx, pptxMime, safeFilename } from '../../src/export/pptx';
import { demoSlide, parseSlide } from '../../src/domain/presentation';
import type { AnnaHost } from '../../src/platform/anna';

describe('Phase 1 PPTX feasibility', () => {
  it('produces a standard ZIP containing editable native text and shapes', async () => {
    const blob = await createPptx(demoSlide, 'forest');
    expect(blob.type).toBe(pptxMime);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(zip.file('ppt/presentation.xml')).not.toBeNull();
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain(demoSlide.title);
    for (const point of demoSlide.bullets) expect(xml).toContain(point);
    expect(xml).toContain('<p:sp>');
    expect(xml).toContain('<a:t>');
    expect(xml).not.toContain('<p:pic>');
  });
  it('enforces text limits and safely parses JSON fences', () => {
    expect(parseSlide('```json\n' + JSON.stringify(demoSlide) + '\n```')).toEqual(demoSlide);
    expect(() => parseSlide('{"title":"x","bullets":[]}')).toThrow();
    expect(() => parseSlide(JSON.stringify({ ...demoSlide, title: 'x'.repeat(61) }))).toThrow();
    expect(safeFilename('../a:b?')).toBe('..ab.pptx');
  });
  it('uses APS init → PUT → finalize(path) → host download without leaking URLs into DOM', async () => {
    const events: string[] = [];
    const host = { files: {
      upload_init: vi.fn(async () => { events.push('init'); return { put_url: 'https://storage.example/put', headers: { 'Content-Type': pptxMime } }; }),
      upload_finalize: vi.fn(async () => { events.push('finalize'); }),
      download: vi.fn(async () => { events.push('download'); return { ok: true }; }),
    } } as unknown as AnnaHost;
    const fetcher = vi.fn(async () => { events.push('put'); return new Response('', { status: 200 }); });
    const blob = new Blob(['PK-test']);
    await downloadPptx(blob, 'demo.pptx', host, fetcher);
    expect(events).toEqual(['init', 'put', 'finalize', 'download']);
    expect(host.files.upload_finalize).toHaveBeenCalledWith({ path: expect.stringMatching(/^exports\/.+\.pptx$/), size: blob.size });
    expect(fetcher).toHaveBeenCalledWith('https://storage.example/put', expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': pptxMime } }));
  });
  it('does not download or finalize when R2 upload fails', async () => {
    const host = { files: {
      upload_init: vi.fn(async () => ({ put_url: 'https://storage.example/put', headers: {} })),
      upload_finalize: vi.fn(), download: vi.fn(),
    } } as unknown as AnnaHost;
    await expect(downloadPptx(new Blob(['x']), 'demo.pptx', host, vi.fn(async () => new Response('', { status: 403 })))).rejects.toThrow('403');
    expect(host.files.upload_finalize).not.toHaveBeenCalled();
    expect(host.files.download).not.toHaveBeenCalled();
  });
  it('does not download if APS finalization fails after a successful PUT', async () => {
    const host = { files: {
      upload_init: vi.fn(async () => ({ put_url: 'https://storage.example/put', headers: {} })),
      upload_finalize: vi.fn(async () => { throw new Error('size mismatch'); }), download: vi.fn(),
    } } as unknown as AnnaHost;
    await expect(downloadPptx(new Blob(['x']), 'demo.pptx', host, vi.fn(async () => new Response('', { status: 200 })))).rejects.toThrow('size mismatch');
    expect(host.files.download).not.toHaveBeenCalled();
  });
  it('refuses insecure upload URLs before transmitting file bytes', async () => {
    const host = { files: {
      upload_init: vi.fn(async () => ({ put_url: 'http://storage.example/put', headers: {} })),
      upload_finalize: vi.fn(), download: vi.fn(),
    } } as unknown as AnnaHost;
    const fetcher = vi.fn();
    await expect(downloadPptx(new Blob(['x']), 'demo.pptx', host, fetcher)).rejects.toThrow('非安全');
    expect(fetcher).not.toHaveBeenCalled();
    expect(host.files.download).not.toHaveBeenCalled();
  });
});
