import { ArrowRight, Check, Lightbulb, Sparkles } from 'lucide-react';
import { exampleBriefs } from '../mocks/presentations';
import { useWorkspace } from '../state/workspace';
import { ThemePicker } from './ThemePicker';
import { SlidePreview } from './SlidePreview';
import { deckThemes } from '../domain/themes';

export function BriefForm() {
  const { brief, setBrief, setTheme, loadExample, resetBrief, generateOutline, fieldErrors } = useWorkspace(state => state);
  return <div className="brief-layout">
    <section className="work-card brief-card" aria-labelledby="brief-heading">
      <div className="card-title"><span className="card-icon"><Lightbulb size={18}/></span><div><span className="micro-label">THE STARTING POINT</span><h2 id="brief-heading">先说说，你的想法</h2></div><span className="card-counter">01 / 03</span></div>
      <form onSubmit={event => { event.preventDefault(); generateOutline(); }} noValidate>
        <label className="control-label" htmlFor="brief-topic">演示主题 <span>{brief.topic.length}/80</span></label>
        <textarea id="brief-topic" className="brief-topic" placeholder="例如：向产品团队介绍 RAG，让复杂概念变得易懂" maxLength={80} value={brief.topic} onChange={event => setBrief({ topic: event.target.value })} aria-invalid={!!fieldErrors.topic} aria-describedby={fieldErrors.topic ? 'topic-error' : undefined}/>
        {fieldErrors.topic && <p className="field-error" id="topic-error">{fieldErrors.topic}</p>}
        <label className="control-label" htmlFor="brief-description">补充说明 <span>选填</span></label>
        <textarea id="brief-description" className="brief-description" placeholder="想传递的观点、演示场景，或特别想强调的内容…" maxLength={1200} value={brief.description} onChange={event => setBrief({ description: event.target.value })}/>
        <div className="form-columns">
          <div><label className="control-label" htmlFor="brief-audience">目标受众</label><input id="brief-audience" maxLength={80} value={brief.audience} onChange={event => setBrief({ audience: event.target.value })} aria-invalid={!!fieldErrors.audience}/>{fieldErrors.audience && <p className="field-error">{fieldErrors.audience}</p>}</div>
          <div><label className="control-label" htmlFor="brief-count">演示页数</label><select id="brief-count" value={brief.slideCount} onChange={event => setBrief({ slideCount: Number(event.target.value) })}>{Array.from({ length: 11 }, (_, i) => <option key={i + 5} value={i + 5}>{i + 5} 页</option>)}</select></div>
        </div>
        <div className="language-field"><label className="control-label" htmlFor="brief-language">输出语言</label><select id="brief-language" value={brief.language} onChange={event => setBrief({ language: event.target.value as typeof brief.language })}><option value="zh-CN">简体中文</option><option value="en-US">English</option></select></div>
        <div className="control-label theme-field-title">视觉主题 <span>预览中也可以切换</span></div>
        <ThemePicker selected={brief.themeId} onChange={setTheme}/>
        <button type="submit" className="work-button primary full"><Sparkles size={17}/>生成示例大纲<ArrowRight size={17}/></button>
        <p className="form-footnote"><Check size={12}/>使用固定 Mock 示例内容 · 不消耗 AI 额度</p>
      </form>
    </section>
    <aside className="brief-inspiration">
      <div className="inspiration-topline"><span>让你的故事，从容展开</span><span>16:9</span></div>
      <div className="sample-deck-stack"><div className="sample-back second"/><div className="sample-back first"/><SlidePreview slide={{ id: 'style-preview', title: brief.topic || (brief.language === 'en-US' ? 'Make your next idea count.' : '好想法，值得被看见。'), layout: 'cover', notes: '', elements: [{ id: 'style-subtitle', type: 'text', text: brief.description.slice(0, 240) || (brief.language === 'en-US' ? 'A clear story. A thoughtful design. A presentation that brings your ideas to life.' : '让内容有逻辑，让设计有呼吸，让每一页都服务于你的观点。') }] }} theme={deckThemes[brief.themeId]} index={0} total={brief.slideCount} language={brief.language}/></div>
      <div className="inspiration-caption"><span>你的风格，先睹为快</span><span className="soft-pill">{brief.slideCount} 页 · {brief.language === 'zh-CN' ? '中文' : 'English'}</span></div>
      <div className="examples-title"><span className="micro-label">NEED A LITTLE INSPIRATION?</span><h2>或从一个示例开始</h2><p>选一个方向，再加入你自己的想法。</p></div>
      <div className="example-list">{exampleBriefs.map((example, index) => <button type="button" key={example.id} onClick={() => loadExample(example.brief)} className="example-card"><span className={`example-mark mark-${index}`}>{['↗', '◈', 'Aa'][index]}</span><span><strong>{example.label}</strong><small>{example.caption}</small></span><ArrowRight size={16}/></button>)}</div>
      {brief.topic && <button className="text-button reset-brief" onClick={resetBrief}>清空需求，重新开始</button>}
    </aside>
  </div>;
}
