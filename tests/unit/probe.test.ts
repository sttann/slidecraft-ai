import { describe, it, expect, vi } from 'vitest';
import { runProbe, type AuditSink, type UsageRecord } from '../../src/platform/probe';
import { demoSlide } from '../../src/domain/presentation';
import type { AnnaHost } from '../../src/platform/anna';

function setup(balance = 1000) {
  let records: UsageRecord[] = [];
  const audit: AuditSink = { read: () => structuredClone(records), write: r => { records = structuredClone(r); } };
  const host = { llm: {
    catalog: vi.fn(async () => ({ quota: { remainingCU: balance } })),
    complete: vi.fn(async () => ({ role: 'assistant', model: 'test-only', content: { type: 'text', text: JSON.stringify(demoSlide) }, stopReason: 'endTurn', usage: { inputTokens: 40, outputTokens: 80, totalTokens: 120 }, _meta: { quotaConsumed: 0.5 } })),
  } } as unknown as AnnaHost;
  return { host, audit };
}
describe('Phase 1 cost and failure guardrails (all Mock)', () => {
  it('records cost and caps output at 128 tokens', async () => {
    const { host, audit } = setup();
    expect(await runProbe(host, 'RAG', audit)).toEqual(demoSlide);
    expect(host.llm.complete).toHaveBeenCalledOnce();
    expect(host.llm.complete).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 128, thinking: false }), { timeoutMs: 60000 });
    expect(audit.read()[0]).toMatchObject({ status: 'success', quotaConsumed: 0.5, tokens: 120 });
  });
  it('never invokes AI below the reserve line', async () => {
    const { host, audit } = setup(249);
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('250');
    expect(host.llm.complete).not.toHaveBeenCalled();
  });
  it('does not retry malformed outputs and still records consumption', async () => {
    const { host, audit } = setup();
    vi.mocked(host.llm.complete).mockResolvedValueOnce({ role: 'assistant', model: 'test', content: { type: 'text', text: 'invalid JSON' }, stopReason: 'endTurn', _meta: { quotaConsumed: 0.2 } });
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow();
    expect(host.llm.complete).toHaveBeenCalledOnce();
    expect(audit.read()[0]).toMatchObject({ status: 'error', quotaConsumed: 0.2 });
  });
  it('locks unknown spend after timeout, preventing accidental re-billing', async () => {
    const { host, audit } = setup();
    vi.mocked(host.llm.complete).mockRejectedValueOnce(new Error('timeout'));
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('timeout');
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('未核实');
    expect(host.llm.complete).toHaveBeenCalledOnce();
    expect(audit.read()[0].quotaConsumed).toBeNull();
  });
  it('blocks repeated clicks while a request is in flight', async () => {
    const { host, audit } = setup();
    const first = runProbe(host, 'RAG', audit);
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('进行中');
    await first;
    expect(host.llm.complete).toHaveBeenCalledOnce();
  });
  it('rejects truncated model responses without retrying or losing the cost record', async () => {
    const { host, audit } = setup();
    vi.mocked(host.llm.complete).mockResolvedValueOnce({ role: 'assistant', model: 'test', content: { type: 'text', text: JSON.stringify(demoSlide) }, stopReason: 'maxTokens', _meta: { quotaConsumed: 0.3 } });
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('截断');
    expect(host.llm.complete).toHaveBeenCalledOnce();
    expect(audit.read()[0]).toMatchObject({ status: 'error', quotaConsumed: 0.3 });
  });
  it('does not start a model call if recording an audit would fail', async () => {
    const { host } = setup();
    const audit: AuditSink = { read: () => [], write: () => { throw new Error('Storage full'); } };
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('Storage full');
    expect(host.llm.complete).not.toHaveBeenCalled();
  });
  it('rejects corrupted audit rows before checking balance or spending credits', async () => {
    const { host } = setup();
    const audit: AuditSink = { read: () => [{ quotaConsumed: -100 } as UsageRecord], write: vi.fn() };
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('额度记录');
    expect(host.llm.catalog).not.toHaveBeenCalled();
    expect(host.llm.complete).not.toHaveBeenCalled();
  });
  it('blocks further calls when the provider does not report the charge', async () => {
    const { host, audit } = setup();
    vi.mocked(host.llm.complete).mockResolvedValueOnce({ role: 'assistant', model: 'test', content: { type: 'text', text: JSON.stringify(demoSlide) }, stopReason: 'endTurn' });
    await runProbe(host, 'RAG', audit);
    expect(audit.read()[0]).toMatchObject({ status: 'success', quotaConsumed: null });
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('未核实');
    expect(host.llm.complete).toHaveBeenCalledOnce();
  });
  it('stops when this phase has reached its budget, without requesting another completion', async () => {
    const { host, audit } = setup();
    await runProbe(host, 'RAG', audit);
    const records = audit.read(); records[0].quotaConsumed = 100; audit.write(records);
    await expect(runProbe(host, 'RAG', audit)).rejects.toThrow('100');
    expect(host.llm.complete).toHaveBeenCalledOnce();
  });
  it('locally caps five valid bullets without another billed request, preserving diagnostic output', async () => {
    const { host, audit } = setup();
    const fiveBullets = { title: 'RAG', bullets: ['检索', '增强', '生成', '验证', '评估'] };
    vi.mocked(host.llm.complete).mockResolvedValueOnce({ role: 'assistant', model: 'test', content: { type: 'text', text: JSON.stringify(fiveBullets) }, stopReason: 'endTurn', _meta: { quotaConsumed: 0.02 } });
    expect((await runProbe(host, 'RAG', audit)).bullets).toEqual(fiveBullets.bullets.slice(0, 4));
    expect(host.llm.complete).toHaveBeenCalledOnce();
    expect(audit.read()[0]).toMatchObject({ status: 'success', repairs: ['limited-bullets-to-four'], responseText: JSON.stringify(fiveBullets) });
  });
});
