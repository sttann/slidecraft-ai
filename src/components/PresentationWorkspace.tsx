import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Download, LayoutTemplate, LoaderCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { layoutLabels } from '../domain/deck';
import { useWorkspace } from '../state/workspace';
import { SlidePreview } from './SlidePreview';
import { SlideContentEditor } from './SlideContentEditor';
import { ThemePicker } from './ThemePicker';
import { SceneSvg } from './SceneSvg';
import { layoutPresentation } from '../layout/engine';
import { connectAnna } from '../platform/anna';

export function PresentationWorkspace() {
  const { presentation, selectedSlideId, selectSlide, setTheme, navigate } = useWorkspace(state => state);
  const scenes = useMemo(() => presentation ? layoutPresentation(presentation) : [], [presentation]);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const inFlight = useRef(false);
  if (!presentation) return null;
  const index = Math.max(0, presentation.slides.findIndex(slide => slide.id === selectedSlideId));
  const slide = presentation.slides[index];
  const warningCount = scenes.reduce((sum, scene) => sum + scene.warnings.length, 0);
  async function exportDeck() {
    if (!presentation || inFlight.current) return;
    const snapshot = presentation;
    inFlight.current = true; setExporting(true); setFeedback(null);
    try {
      const [{ createPresentationPptx }, { downloadPptx, safeFilename }] = await Promise.all([import('../export/presentation-pptx'), import('../export/pptx')]);
      const blob = await createPresentationPptx(snapshot);
      await downloadPptx(blob, safeFilename(snapshot.title), await connectAnna());
      setFeedback({ kind: 'success', text: `已发起 ${snapshot.slides.length} 页可编辑 PPTX 下载，请查看浏览器下载列表。` });
    } catch (error) { const message = error instanceof Error ? error.message : String(error); setFeedback({ kind: 'error', text: /endpoint not yet available/i.test(message) ? '当前 Anna 宿主暂不支持文件保存，请在已安装的应用中下载。内容已保留。' : `导出失败：${message}` }); }
    finally { inFlight.current = false; setExporting(false); }
  }
  function move(direction: number) { const next = presentation?.slides[index + direction]; if (next) selectSlide(next.id); }
  return <section className="presentation-workspace" aria-labelledby="presentation-heading">
    <div className="presentation-heading"><div><span className="micro-label">A STORY TAKING SHAPE</span><h2 id="presentation-heading">{presentation.title}</h2><p>{presentation.slides.length} 页 · {presentation.audience} · {presentation.language === 'zh-CN' ? '简体中文' : 'English'}</p></div><button className="work-button secondary" onClick={() => navigate('outline')}><ArrowLeft size={15}/>编辑大纲</button></div>
    <div className="preview-workbench">
      <nav className="slide-rail" aria-label="幻灯片列表"><div className="rail-heading"><LayoutTemplate size={14}/><span>全部页面</span><span>{presentation.slides.length}</span></div><ol>{presentation.slides.map((page, i) => <li key={page.id}><button className={`slide-thumb ${page.id === slide.id ? 'selected' : ''}`} aria-label={`查看第 ${i + 1} 页：${page.title}`} aria-current={page.id === slide.id ? 'page' : undefined} onClick={() => selectSlide(page.id)}><span className="scene-thumbnail"><SceneSvg scene={scenes[i]} decorative/></span><span className="thumb-caption"><span>{String(i + 1).padStart(2, '0')}</span><span>{layoutLabels[page.layout]}</span></span></button></li>)}</ol></nav>
      <div className="preview-main"><div className="preview-heading"><span><span className="status-dot"/>{presentation.source === 'anna' ? 'AI 内容预览' : '示例内容预览'}</span><span>16:9 · {layoutLabels[slide.layout]}</span></div><div className="deck-preview-mat" tabIndex={0} aria-label="幻灯片预览区域，使用左右方向键翻页" onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } }}><SlidePreview slide={slide} theme={presentation.theme} index={index} total={presentation.slides.length} language={presentation.language} scene={scenes[index]}/></div><div className="slide-navigation"><span>让每一页，都为你的观点服务。</span><div><button className="icon-button" aria-label="上一页" disabled={index === 0} onClick={() => move(-1)}><ChevronLeft size={16}/></button><span data-testid="page-counter">{String(index + 1).padStart(2, '0')} / {String(presentation.slides.length).padStart(2, '0')}</span><button className="icon-button" aria-label="下一页" disabled={index === presentation.slides.length - 1} onClick={() => move(1)}><ChevronRight size={16}/></button></div></div>
        <fieldset className="slide-editor-container" disabled={exporting}><SlideContentEditor key={slide.id} slide={slide}/></fieldset>
        <div className="preview-theme-row"><div><strong>换一种风格，同一个好故事</strong><p>切换主题会保留全部内容和页面顺序。</p></div><ThemePicker selected={presentation.theme.id} onChange={setTheme} compact disabled={exporting}/></div>
        <div className="export-placeholder"><div><strong>让你的故事，走出屏幕</strong><p id="export-availability">全部 {presentation.slides.length} 页 · 原生可编辑文字与图形 · 下载不会调用 AI</p></div><button className="work-button primary" disabled={exporting} onClick={exportDeck} aria-describedby="export-availability">{exporting ? <LoaderCircle size={15} className="spin"/> : <Download size={15}/>} {exporting ? '正在导出…' : '下载 PPTX'}</button></div>
        {warningCount > 0 && <div role="note" className="layout-warning">{warningCount} 处内容较密，已缩短画面展示以避免溢出，完整原文保留在 PowerPoint 备注中。可返回大纲精简内容或拆分页面。</div>}
        {feedback && <div role={feedback.kind === 'error' ? 'alert' : 'status'} className={`export-feedback ${feedback.kind}`}>{feedback.text}</div>}
      </div>
    </div>
    <div className="preview-bottom-note"><span>{presentation.source === 'anna' ? 'Anna AI 演示 · 费用见生成记录' : 'Mock 演示 · 本次流程未消耗 AI 额度'}</span><button className="text-button" onClick={() => navigate('brief')}>回到需求<ArrowRight size={13}/></button></div>
  </section>;
}

