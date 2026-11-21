import { useRef, useState } from 'react';
import { briefSchema, outlineSchema } from '../domain/deck';
import { connectAnna, friendlyError } from '../platform/anna';
import { createGenerator, generationAudit } from '../platform/generation';
import { useWorkspace, workspaceStore } from '../state/workspace';

export function AiGeneration() {
  const { brief, outline } = useWorkspace(state => state);
  const generator = useRef<ReturnType<typeof createGenerator> | null>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('仅点击下方按钮才调用 Anna；默认示例流程仍使用 Mock。');
  async function run(content: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFailed(false);
    const snapshot = JSON.stringify({ brief, outline });
    try {
      briefSchema.parse(brief);
      if (content) outlineSchema.parse(outline);
      const host = await connectAnna();
      if (!host) throw new Error('请在 Anna 宿主中使用真实 AI，本地预览支持 Mock。');
      generator.current ??= createGenerator(host, generationAudit);
      if (content) {
        if (!outline) throw new Error('请先生成并确认大纲。');
        const presentation = await generator.current.presentation(brief, outline);
        if (snapshot !== JSON.stringify({ brief: workspaceStore.getState().brief, outline: workspaceStore.getState().outline })) throw new Error('需求已变化，结果未覆盖当前内容。');
        workspaceStore.setState({ presentation, selectedSlideId: presentation.slides[0].id, step: 'preview', error: null });
      } else {
        const result = await generator.current.outline(brief);
        if (snapshot !== JSON.stringify({ brief: workspaceStore.getState().brief, outline: workspaceStore.getState().outline })) throw new Error('需求已变化，结果未覆盖当前内容。');
        workspaceStore.setState({ outline: result, presentation: null, selectedSlideId: null, step: 'outline', error: null });
      }
      const records = generationAudit.read();
      setMessage(`AI 生成完成。本浏览器累计已记录 ${records.reduce((sum, row) => sum + (row.consumed ?? 0), 0).toFixed(6)} CU；${records.filter(row => row.consumed === null).length} 条费用待核实。`);
    } catch (error) { setFailed(true); setMessage(friendlyError(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="export-placeholder ai-generation" aria-busy={busy} aria-label="Anna AI 生成"><div><strong>Anna AI 内容生成</strong><p role={failed ? 'alert' : undefined} aria-live="polite">{busy ? '正在生成，请勿重复操作…' : message}</p></div><button className="work-button secondary" disabled={busy} onClick={() => run(false)}>AI 生成大纲</button><button className="work-button primary" disabled={busy || !outline} onClick={() => run(true)}>AI 生成正文</button></section>;
}
