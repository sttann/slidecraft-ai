import { Check, CheckCircle2, ChevronRight, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { connectAnna } from './platform/anna';
import { BriefForm } from './components/BriefForm';
import { AiGeneration } from './components/AiGeneration';
import { OutlineEditor } from './components/OutlineEditor';
import { PresentationWorkspace } from './components/PresentationWorkspace';
import { useWorkspace, type WorkspaceStep } from './state/workspace';
import './styles/tokens.css';
import './styles/workspace.css';

const steps: { id: WorkspaceStep; label: string; caption: string }[] = [
  { id: 'brief', label: '想法与风格', caption: '告诉我们你的想法' },
  { id: 'outline', label: '梳理大纲', caption: '让故事更有逻辑' },
  { id: 'preview', label: '演示预览', caption: '找到最好的表达' },
];

export default function App() {
  useEffect(() => { connectAnna().catch(() => console.warn('Anna host handshake unavailable; continuing the Mock workspace.')); }, []);
  const { step, outline, presentation, navigate, error } = useWorkspace(state => state);
  const currentIndex = steps.findIndex(item => item.id === step);
  return <div className="workbench">
    <header className="workbench-header"><a className="brand" href="#workspace"><span className="brand-icon"><Layers3 size={21}/></span>SlideCraft<span className="ai-mark">AI</span></a><div className="header-center">你的想法，值得精彩呈现。</div><span className="mode-pill"><span className="status-dot"/>{outline?.source === 'anna' || presentation?.source === 'anna' ? 'Anna AI 内容' : 'Mock 示例模式'}</span></header>
    <main className="workbench-main" id="workspace">
      {step === 'brief' && <section className="workbench-hero"><div><div className="hero-eyebrow"><span/>SMALL SPARKS. GREAT STORIES.</div><h1>把灵感，变成<br/><span>下一场精彩演示。</span><Sparkles className="hero-spark" size={31}/></h1><p>你专注于想表达的，我们帮你把故事讲清楚。<br/>从一个主题开始，找到内容、结构与设计的默契。</p></div><div className="hero-aside"><span className="hero-asterisk">✳</span><p>Make room<br/>for your next<br/><em>big idea.</em></p><span>THOUGHTFULLY CRAFTED. SIMPLY YOURS.</span></div></section>}
      <nav className="creation-steps" aria-label="演示制作进度">{steps.map((item, i) => <div className="step-wrapper" key={item.id}><button className={step === item.id ? 'current' : i < currentIndex ? 'complete' : ''} aria-current={step === item.id ? 'step' : undefined} disabled={item.id === 'outline' ? !outline : item.id === 'preview' ? !presentation : false} onClick={() => navigate(item.id)}><span className="step-circle">{i < currentIndex ? <Check size={12}/> : i + 1}</span><span><strong>{item.label}</strong><small>{item.caption}</small></span></button>{i < 2 && <ChevronRight size={14}/>}</div>)}<span className="cost-reassurance"><ShieldCheck size={15}/>仅显式 AI 生成消耗额度</span></nav>
      {step === 'brief' && <AiGeneration/>}
      {error && <div role="alert" className="workspace-alert">{error}</div>}
      {step === 'brief' ? <BriefForm/> : step === 'outline' ? <OutlineEditor/> : <PresentationWorkspace/>}
      {step === 'brief' && <div className="workbench-promises"><div><CheckCircle2 size={18}/><span><strong>先理清思路</strong><small>大纲可以编辑、增删和调整顺序</small></span></div><div><Layers3 size={18}/><span><strong>设计始终一致</strong><small>统一主题，让每一页自然衔接</small></span></div><div><ShieldCheck size={18}/><span><strong>让你掌握节奏</strong><small>确认大纲后，再展开完整内容</small></span></div></div>}
      <footer className="workbench-footer"><span>SLIDECRAFT AI</span><p>Crafted for ideas that matter.</p><span>Mock 与 Anna AI · 按需生成</span></footer>
    </main>
  </div>;
}
