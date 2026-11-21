import { describe, expect, it } from 'vitest';
import { createWorkspaceStore } from '../../src/state/workspace';
import { exampleBriefs } from '../../src/mocks/presentations';

function outlined() {
  const store = createWorkspaceStore(); store.getState().loadExample(exampleBriefs[0].brief); store.getState().generateOutline(); return store;
}
describe('Phase 2 workspace transitions', () => {
  it('validates the brief and prevents skipping straight to preview', () => {
    const store = createWorkspaceStore();
    store.getState().navigate('preview'); expect(store.getState().step).toBe('brief');
    expect(store.getState().generateOutline()).toBe(false);
    expect(store.getState().fieldErrors.topic).toBeTruthy();
    expect(store.getState().outline).toBeNull();
  });
  it('preserves edited content and stable IDs through reorder and confirmation', () => {
    const store = outlined();
    const id = store.getState().outline!.slides[2].id;
    store.getState().updateOutlineSlide(id, { title: '我的核心观点', description: '这是受众需要理解的关键内容。', layout: 'bullets' });
    store.getState().moveOutlineSlide(id, -1);
    expect(store.getState().confirmOutline()).toBe(true);
    const slide = store.getState().presentation!.slides[1];
    expect(slide.id).toBe(id); expect(slide.title).toBe('我的核心观点');
    expect(slide.elements[0]).toMatchObject({ type: 'bullets', items: expect.arrayContaining(['这是受众需要理解的关键内容。']) });
  });
  it('blocks confirmation of incomplete edits without replacing them', () => {
    const store = outlined(); const id = store.getState().outline!.slides[0].id;
    store.getState().updateOutlineSlide(id, { title: '   ' });
    expect(store.getState().confirmOutline()).toBe(false);
    expect(store.getState().step).toBe('outline'); expect(store.getState().presentation).toBeNull();
    expect(store.getState().outline!.slides[0].title).toBe('   ');
  });
  it('limits additions to 15 and deletions to one remaining page', () => {
    const store = outlined();
    for (let i = 0; i < 20; i++) store.getState().addOutlineSlide();
    expect(store.getState().outline!.slides).toHaveLength(15);
    expect(new Set(store.getState().outline!.slides.map(slide => slide.id)).size).toBe(15);
    for (const slide of [...store.getState().outline!.slides]) store.getState().removeOutlineSlide(slide.id);
    expect(store.getState().outline!.slides).toHaveLength(1);
  });
  it('changes theme without regenerating or losing content, order or selection', () => {
    const store = outlined(); store.getState().confirmOutline();
    const deck = store.getState().presentation!; const selected = deck.slides[3].id;
    store.getState().selectSlide(selected); store.getState().setTheme('ocean');
    expect(store.getState().presentation!.slides).toBe(deck.slides);
    expect(store.getState().presentation!.theme.id).toBe('ocean');
    expect(store.getState().selectedSlideId).toBe(selected);
    expect(store.getState().step).toBe('preview');
  });
  it('invalidates stale preview when requirements or an outline page change', () => {
    const store = outlined(); store.getState().confirmOutline();
    store.getState().updateOutlineSlide(store.getState().presentation!.slides[0].id, { title: '新标题' });
    expect(store.getState().presentation).toBeNull(); expect(store.getState().step).toBe('outline');
    store.getState().confirmOutline(); store.getState().setBrief({ topic: '新的演示主题' });
    expect(store.getState().outline).toBeNull(); expect(store.getState().presentation).toBeNull();
    expect(store.getState().step).toBe('brief');
  });
  it('does not wrap boundary reorder or select a missing slide', () => {
    const store = outlined(); const first = store.getState().outline!.slides[0].id;
    store.getState().moveOutlineSlide(first, -1);
    expect(store.getState().outline!.slides[0].id).toBe(first);
    store.getState().confirmOutline(); store.getState().selectSlide('missing');
    expect(store.getState().selectedSlideId).toBe(first);
    store.getState().updateOutlineSlide('missing', { title: 'ignored' });
    expect(store.getState().step).toBe('preview');
  });
  it('clears the workspace without throwing on the intentionally empty topic', () => {
    const store = outlined(); store.getState().resetBrief();
    expect(store.getState().brief.topic).toBe(''); expect(store.getState().step).toBe('brief');
    expect(store.getState().outline).toBeNull();
  });
});
