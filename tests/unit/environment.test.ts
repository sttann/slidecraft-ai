import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
describe('Phase 0 environment', () => {
  it('uses a static SPA with no unnecessary external permissions', () => {
    const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
    expect(manifest.schema).toBe(4);
    expect(manifest.ui.bundle.entry).toBe('index.html');
    expect(manifest.ui.bundle.external_origins).toEqual([]);
    expect(manifest.required_executas).toEqual([]);
  });
});
