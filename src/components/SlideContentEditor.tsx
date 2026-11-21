import { useState } from 'react';
import type { DeckSlide } from '../domain/deck';
import { useWorkspace } from '../state/workspace';

export function SlideContentEditor({ slide }: { slide: DeckSlide }) {
  const saveSlide = useWorkspace(state => state.saveSlide);
  const [draft, setDraft] = useState(() => structuredClone(slide));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const field = (label: string, value: string, max: number, change: (value: string) => void) => <label className="slide-edit-field" key={label}>{label}<textarea aria-label={label} value={value} maxLength={max} onChange={event => change(event.target.value)}/></label>;
  function mutate(change: (value: DeckSlide) => void) { setDraft(previous => { const next = structuredClone(previous); change(next); return next; }); }
  if (!editing) return <div className="slide-editor"><button className="work-button secondary" onClick={() => { setDraft(structuredClone(slide)); setEditing(true); setError(''); }}>编辑本页内容</button><span>修改正文与备注，无需再次生成或消耗额度。</span></div>;
  const element = draft.elements[0];
  return <section className="slide-editor" aria-label="本页内容编辑器"><h3>编辑本页内容</h3><p>保存后同步更新预览和下载文件；取消会保留原内容。切换页面前请保存，否则会放弃未保存修改。</p>
    {field('本页标题', draft.title, 80, value => mutate(next => { next.title = value; }))}
    {element.type === 'text' && field('本页正文', element.text, 240, value => mutate(next => { const item = next.elements[0]; if (item.type === 'text') item.text = value; }))}
    {element.type === 'bullets' && element.items.map((item, i) => field(`要点 ${i + 1}`, item, 120, value => mutate(next => { const item = next.elements[0]; if (item.type === 'bullets') item.items[i] = value; })))}
    {(element.type === 'columns' || element.type === 'comparison') && (element.type === 'columns' ? element.columns : [element.left, element.right]).map((column, index) => <div key={index}>
      {field(`第 ${index + 1} 栏标题`, column.heading, 40, value => mutate(next => { const item = next.elements[0]; if (item.type === 'columns') item.columns[index].heading = value; if (item.type === 'comparison') (index ? item.right : item.left).heading = value; }))}
      {column.items.map((text, i) => field(`第 ${index + 1} 栏要点 ${i + 1}`, text, 120, value => mutate(next => { const item = next.elements[0]; if (item.type === 'columns') item.columns[index].items[i] = value; if (item.type === 'comparison') (index ? item.right : item.left).items[i] = value; })))}
    </div>)}
    {element.type === 'process' && element.steps.map((step, index) => <div key={index}>{field(`步骤 ${index + 1} 标题`, step.title, 36, value => mutate(next => { const item = next.elements[0]; if (item.type === 'process') item.steps[index].title = value; }))}{field(`步骤 ${index + 1} 说明`, step.description, 120, value => mutate(next => { const item = next.elements[0]; if (item.type === 'process') item.steps[index].description = value; }))}</div>)}
    {field('演讲备注', draft.notes, 1200, value => mutate(next => { next.notes = value; }))}
    {error && <p role="alert">{error}</p>}<div className="stage-actions"><button className="work-button secondary" onClick={() => { setEditing(false); setError(''); }}>取消修改</button><button className="work-button primary" onClick={() => { if (saveSlide(draft)) { setEditing(false); setError(''); } else setError('请填写有效的标题和正文，备注可留空。'); }}>保存本页</button></div>
  </section>;
}

