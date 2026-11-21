import { describe, expect, it, vi } from 'vitest';
import { createGenerator, type GenerationAudit, type GenerationRecord } from '../../src/platform/generation';
import type { AnnaHost } from '../../src/platform/anna';
import { exampleBriefs, createMockOutline } from '../../src/mocks/presentations';

function harness() {
 let records: GenerationRecord[] = [];
 const complete = vi.fn(async () => ({content:{text:JSON.stringify({...createMockOutline(exampleBriefs[0].brief),source:'anna'})},stopReason:'endTurn',_meta:{quotaConsumed:0.02}}));
 const catalog = vi.fn(async () => ({quota:{remainingCU:900}}));
 const audit: GenerationAudit = {read:()=>structuredClone(records),write:rows=>{records=structuredClone(rows);}};
 return {complete,catalog,audit, generator:createGenerator({llm:{complete,catalog}} as unknown as AnnaHost,audit)};
}
describe('Phase 6 generation failures',()=>{
 it('refuses reserve depletion before completion',async()=>{const h=harness();h.catalog.mockResolvedValue({quota:{remainingCU:249}});await expect(h.generator.outline(exampleBriefs[0].brief)).rejects.toThrow('250');expect(h.complete).not.toHaveBeenCalled();});
 it('refuses completion when pending audit cannot be persisted',async()=>{const h=harness();h.audit.write=()=>{throw new Error('storage unavailable');};await expect(h.generator.outline(exampleBriefs[0].brief)).rejects.toThrow('storage');expect(h.complete).not.toHaveBeenCalled();});
 it('does not automatically retry timeout or lose uncertain billing',async()=>{const h=harness();h.complete.mockRejectedValue(new Error('timeout'));await expect(h.generator.outline(exampleBriefs[0].brief)).rejects.toThrow('timeout');await expect(h.generator.outline(exampleBriefs[0].brief)).rejects.toThrow('未知费用');expect(h.complete).toHaveBeenCalledTimes(1);expect(h.audit.read()[0]).toMatchObject({status:'error',consumed:null});});
 it('rejects truncation after recording known cost',async()=>{const h=harness();const reply=await h.complete();h.complete.mockClear();h.complete.mockResolvedValue({...reply,stopReason:'maxTokens'});await expect(h.generator.outline(exampleBriefs[0].brief)).rejects.toThrow('截断');expect(h.audit.read()[0].consumed).toBe(0.02);expect(h.complete).toHaveBeenCalledTimes(1);});
 it('rejects wrong outline count instead of adopting partial output',async()=>{const h=harness();await expect(h.generator.outline({...exampleBriefs[0].brief,slideCount:6})).rejects.toThrow('页数');expect(h.audit.read()[0].status).toBe('error');});
 it('blocks further calls at the local tuning budget',async()=>{const h=harness();h.audit.write([{id:'past',kind:'outline',at:new Date().toISOString(),status:'success',consumed:150,tokens:1}]);await expect(h.generator.outline(exampleBriefs[0].brief)).rejects.toThrow('预算');expect(h.catalog).not.toHaveBeenCalled();});
});
