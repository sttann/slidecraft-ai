import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { AiGeneration } from './AiGeneration';
import { layoutIds, layoutLabels } from '../domain/deck';
import { useWorkspace } from '../state/workspace';

export function OutlineEditor() {
  const { brief, outline, navigate, updateOutlineSlide, moveOutlineSlide, removeOutlineSlide, addOutlineSlide, confirmOutline } = useWorkspace(state => state);
  if (!outline) return null;
  return <section className="outline-workspace" aria-labelledby="outline-heading">
    <div className="section-heading"><div><span className="micro-label">GIVE YOUR STORY A SHAPE</span><h2 id="outline-heading">先把故事的脉络理清</h2><p>修改标题、要点和顺序，确认后再展开完整内容。</p></div><span className="soft-pill">{outline.slides.length} 页 · {outline.source === 'anna' ? 'Anna AI' : 'Mock 示例'}</span></div>
    <div className="outline-brief"><span>{brief.topic}</span><span>{brief.audience} · {brief.language === 'zh-CN' ? '简体中文' : 'English'}</span></div>
    <ol className="outline-list">{outline.slides.map((slide, index) => <li key={slide.id} className="outline-page" data-testid="outline-page">
      <span className="outline-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="outline-fields"><label className="sr-only" htmlFor={`title-${slide.id}`}>第 {index + 1} 页标题</label><input id={`title-${slide.id}`} value={slide.title} maxLength={80} aria-invalid={!slide.title.trim()} onChange={event => updateOutlineSlide(slide.id, { title: event.target.value })}/><label className="sr-only" htmlFor={`description-${slide.id}`}>第 {index + 1} 页要点</label><textarea id={`description-${slide.id}`} value={slide.description} maxLength={240} aria-invalid={!slide.description.trim()} onChange={event => updateOutlineSlide(slide.id, { description: event.target.value })}/></div>
      <div className="outline-actions"><select aria-label={`第 ${index + 1} 页布局`} value={slide.layout} onChange={event => updateOutlineSlide(slide.id, { layout: event.target.value as typeof slide.layout })}>{layoutIds.map(id => <option key={id} value={id}>{layoutLabels[id]}</option>)}</select><div className="outline-tools"><button className="icon-button" aria-label={`上移第 ${index + 1} 页`} disabled={index === 0} onClick={() => moveOutlineSlide(slide.id, -1)}><ArrowUp size={14}/></button><button className="icon-button" aria-label={`下移第 ${index + 1} 页`} disabled={index === outline.slides.length - 1} onClick={() => moveOutlineSlide(slide.id, 1)}><ArrowDown size={14}/></button><button className="icon-button danger-hover" aria-label={`删除第 ${index + 1} 页`} disabled={outline.slides.length <= 1} onClick={() => removeOutlineSlide(slide.id)}><Trash2 size={14}/></button></div></div>
    </li>)}</ol>
    <button className="add-page" onClick={addOutlineSlide} disabled={outline.slides.length >= 15}><Plus size={16}/>{outline.slides.length >= 15 ? '已达到 15 页上限' : '添加页面'}</button>
    <div className="stage-actions"><button className="work-button secondary" onClick={() => navigate('brief')}><ArrowLeft size={15}/>修改需求</button><p>{outline.source === 'anna' ? '完成修改后，点击上方“AI 生成正文”继续。' : '示例内容仅用于演练流程，尚未调用 AI。'}</p>{outline.source === 'anna' ? <AiGeneration/> : <button className="work-button primary" onClick={confirmOutline}>确认大纲，展开示例<ArrowRight size={16}/></button>}</div>
  </section>;
}
