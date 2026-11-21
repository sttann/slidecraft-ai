import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, ChevronRight, CircleCheck, FileSliders, FlaskConical, Layers3, LoaderCircle, PanelTop, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { demoSlide, slideSchema, themes, type ProbeSlide, type ThemeId } from './domain/presentation';
import { connectAnna, friendlyError, type AnnaHost } from './platform/anna';
import { browserAudit, runProbe, type UsageRecord } from './platform/probe';

export default function Phase1Lab() {
  const [topic, setTopic] = useState('让每一个想法，清晰呈现。');
  const [slide, setSlide] = useState<ProbeSlide>(demoSlide);
  const [theme, setTheme] = useState<ThemeId>('forest');
  const [host, setHost] = useState<AnnaHost | null>(null);
  const [hostState, setHostState] = useState('本地 Mock 模式');
  const [busy, setBusy] = useState<'ai' | 'export' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [audit, setAudit] = useState<UsageRecord[]>([]);
  useEffect(() => {
    let active = true;
    connectAnna().then(value => {
      if (!active) return;
      setHost(value); setHostState(value ? 'Anna 宿主已连接' : '本地 Mock 模式');
    }).catch(() => { if (active) setHostState('Anna 宿主连接失败'); });
    try { setAudit(browserAudit().read()); } catch { setError('本地额度记录不可读，真实测试已暂停。'); }
    return () => { active = false; };
  }, []);

  function mockGenerate() {
    setError(''); setNotice('');
    const parsed = slideSchema.safeParse({ ...demoSlide, title: topic });
    if (!parsed.success) { setError('请输入 1–60 个字符的主题。'); return; }
    setSlide(parsed.data); setNotice('示例已更新。使用固定 Mock 要点，未调用 AI。');
  }
  async function realProbe() {
    if (!host || busy) return;
    setBusy('ai'); setError(''); setNotice('');
    try {
      setSlide(await runProbe(host, topic, browserAudit()));
      const repairs = browserAudit().read().at(-1)?.repairs ?? [];
      setNotice(repairs.length ? 'Anna 最小调用成功；要点已按单页容量保留前四条，并通过 Schema 校验。' : 'Anna 最小调用成功，生成结果已通过 Schema 校验。');
    } catch (err) { setError(friendlyError(err)); }
    finally {
      setBusy(null);
      try { setAudit(browserAudit().read()); } catch { setError('额度记录保存失败，请暂停真实调用并检查存储。'); }
    }
  }
  async function exportDeck() {
    if (busy) return;
    setBusy('export'); setError(''); setNotice('');
    try {
      const { createPptx, downloadPptx, safeFilename } = await import('./export/pptx');
      await downloadPptx(await createPptx(slide, theme), safeFilename(slide.title), host);
      setNotice(host ? 'Anna 宿主已确认下载请求，请查看浏览器下载列表。' : '已发起 PPTX 下载，请查看浏览器下载列表。');
    } catch (err) { setError(friendlyError(err)); }
    finally { setBusy(null); }
  }
  const color = themes[theme];
  const knownSpend = audit.reduce((sum, row) => sum + (row.quotaConsumed ?? 0), 0);
  const unknownSpend = audit.some(row => row.quotaConsumed === null || row.status === 'pending');

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon"><Layers3 size={21} /></span>SlideCraft<span className="ai-mark">AI</span></a>
      <div className="header-right"><span className="connection"><i />{hostState}</span><span className="phase-badge">Phase 1 · 技术验证</span></div>
    </header>
    <main className="workspace">
      <div className="eyebrow"><span /> A LITTLE IDEA. A BIG IMPRESSION.</div>
      <section className="hero">
        <div><h1>好想法，<br /><span>值得好好呈现。</span><svg viewBox="0 0 100 16" aria-hidden="true"><path d="M3 12 Q45 0 96 7"/></svg></h1><p>从灵感到演示，让表达更有力量。<br />为你理清思路，把每一页变成观点的舞台。</p></div>
        <div className="hero-note"><span className="note-symbol">✳</span><p>Great stories<br />start with a spark.</p><span className="note-foot">YOU BRING THE IDEA. WE BRING THE CRAFT.</span></div>
      </section>
      <div className="workflow" aria-label="开发验证进度"><span className="workflow-active"><span className="step-number">1</span>想法与风格</span><ChevronRight size={15}/><span><span className="step-number">2</span>结构与内容 <small>后续阶段</small></span><ChevronRight size={15}/><span><span className="step-number">3</span>预览与导出</span><span className="workflow-tail"><ShieldCheck size={14}/>默认使用 Mock，保护你的额度</span></div>
      <section className="studio-grid">
        <div className="input-panel">
          <div className="panel-heading"><span className="section-number">01 /</span><h2>从一个想法开始</h2><Sparkles size={17}/></div>
          <label className="field-label" htmlFor="topic">你想讲述什么？ <span>{topic.length}/60</span></label>
          <textarea id="topic" className="topic-input" maxLength={60} value={topic} onChange={e => setTopic(e.target.value)} placeholder="例如：面向产品团队的 RAG 技术介绍" disabled={!!busy}/>
          <div className="helper">先用一页示例，验证预览与可编辑 PPTX 导出。</div>
          <div className="field-label theme-label">选择视觉风格 <span>随时可以切换</span></div>
          <div className="theme-options">{(Object.keys(themes) as ThemeId[]).map(id => <button key={id} className={`theme-option ${theme === id ? 'selected' : ''}`} aria-pressed={theme === id} onClick={() => setTheme(id)}><span className="theme-swatch" style={{ backgroundColor: `#${themes[id].ink}` }}><i style={{backgroundColor: `#${themes[id].accent}`}}/>{theme === id && <Check size={13}/>}</span>{themes[id].name}</button>)}</div>
          <button className="primary-button" onClick={mockGenerate} disabled={!!busy || !topic.trim()}><WandSparkles size={17}/>生成 Mock 示例<ArrowRight size={17}/></button>
          <div className="free-hint"><CircleCheck size={13}/>不连接模型 · 不消耗 AI 额度</div>
          <div className="probe-panel"><div><FlaskConical size={15}/><strong>Anna 最小可行性测试</strong><span>开发专用</span></div><p>显式调用一次 Anna AI，输出上限 128 token。仅在宿主连接且余额检查通过后可运行。</p><button onClick={realProbe} disabled={!host || !!busy || unknownSpend}>{busy === 'ai' ? <LoaderCircle size={14} className="spin"/> : <Sparkles size={14}/>}测试真实 AI 连接</button></div>
        </div>
        <div className="preview-panel">
          <div className="preview-toolbar"><div><PanelTop size={16}/><strong>你的演示预览</strong><span className="preview-tag">示例 · 1 页</span></div><span>16:9</span></div>
          <div className="preview-mat">
            <div className="slide-preview" role="img" aria-label={`幻灯片预览：${slide.title}`} style={{ backgroundColor: `#${color.paper}`, color: `#${color.ink}`, borderLeftColor: `#${color.ink}` }}>
              <div className="slide-kicker" style={{color: `#${color.muted}`}}>SLIDECRAFT / IDEAS INTO IMPACT</div>
              <h3>{slide.title}</h3>
              <ul>{slide.bullets.map((point, i) => <li key={i}>{point}</li>)}</ul>
              <div className="slide-footer" style={{color: `#${color.muted}`}}><span>MAKE YOUR NEXT IDEA COUNT.</span><span>01</span></div>
            </div>
          </div>
          <div className="preview-caption"><span><span className="tiny-dot"/>原生文字与图形，导出后仍可编辑</span><span>01 / 01</span></div>
          <details className="content-editor"><summary>编辑示例内容<span>修改后直接用于导出</span></summary><label htmlFor="slide-title">页面标题</label><input id="slide-title" value={slide.title} maxLength={60} onChange={e => setSlide({...slide, title:e.target.value})}/>{slide.bullets.map((bullet,i) => <label key={i}>要点 {i+1}<input aria-label={`要点 ${i+1}`} value={bullet} maxLength={90} onChange={e => setSlide({...slide,bullets:slide.bullets.map((p,j) => i===j ? e.target.value : p)})}/></label>)}</details>
          <div className="export-row"><div className="export-file"><span><FileSliders size={22}/></span><div><strong>把好想法带走</strong><p>PowerPoint · 可编辑 .pptx</p></div></div><button className="export-button" onClick={exportDeck} disabled={!!busy || !slideSchema.safeParse(slide).success}>{busy === 'export' ? <LoaderCircle className="spin" size={16}/> : <ArrowDownToLine size={16}/>}下载 PPTX</button></div>
        </div>
      </section>
      {error && <div role="alert" className="feedback error">{error}</div>}
      {notice && <div role="status" className="feedback success"><CircleCheck size={16}/>{notice}</div>}
      {audit.length > 0 && <details className="usage-audit"><summary>本浏览器额度审计记录 <span>{audit.length} 次请求</span></summary><pre data-testid="usage-audit">{JSON.stringify(audit, null, 2)}</pre></details>}
      <section className="trust-row"><div><ShieldCheck size={18}/><span><strong>额度有据可查</strong><small>本浏览器探针记录：{audit.length} 次 · {knownSpend.toFixed(2)} CU{unknownSpend ? ' + 未核实消耗' : ''}</small></span></div><div><Layers3 size={18}/><span><strong>预览与导出同源</strong><small>统一内容模型，确定性排版</small></span></div><div><Check size={18}/><span><strong>每一步都可验证</strong><small>Phase 0 已完成 · staging 路径已验证</small></span></div></section>
      <footer><span>SLIDECRAFT AI</span><p>Crafted for ideas that matter.</p><span>技术验证版本 · 尚未发布</span></footer>
    </main>
  </div>;
}
