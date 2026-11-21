import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { briefSchema, outlineSchema, presentationSchema, type DeckSlide, type Brief, type Outline, type OutlineSlide, type Presentation, type Theme } from '../domain/deck';
import { deckThemes } from '../domain/themes';
import { createMockOutline, createMockPresentation } from '../mocks/presentations';

export type WorkspaceStep = 'brief' | 'outline' | 'preview';
export interface WorkspaceState {
  step: WorkspaceStep; brief: Brief; outline: Outline | null; presentation: Presentation | null;
  selectedSlideId: string | null; error: string | null; fieldErrors: Record<string, string>;
  setBrief(patch: Partial<Brief>): void; setTheme(id: Theme['id']): void;
  loadExample(brief: Brief): void; resetBrief(): void; generateOutline(): boolean; confirmOutline(): boolean;
  updateOutlineSlide(id: string, patch: Pick<Partial<OutlineSlide>, 'title' | 'description' | 'layout'>): void;
  moveOutlineSlide(id: string, direction: -1 | 1): void; removeOutlineSlide(id: string): void; addOutlineSlide(): void;
  navigate(step: WorkspaceStep): void; selectSlide(id: string): void;
  saveSlide(slide: DeckSlide): boolean;
}
export const initialBrief: Brief = { topic: '', description: '', audience: '通用受众', slideCount: 8, language: 'zh-CN', themeId: 'forest' };

export function createWorkspaceStore() {
  return createStore<WorkspaceState>((set, get) => ({
    step: 'brief', brief: { ...initialBrief }, outline: null, presentation: null, selectedSlideId: null, error: null, fieldErrors: {},
    setBrief(patch) {
      const { themeId, ...content } = patch;
      if (Object.keys(content).length) set(state => ({ brief: { ...state.brief, ...content }, outline: null, presentation: null, selectedSlideId: null, step: 'brief', error: null, fieldErrors: {} }));
      if (themeId) get().setTheme(themeId);
    },
    setTheme(id) {
      if (!deckThemes[id]) return;
      set(state => ({ brief: { ...state.brief, themeId: id }, presentation: state.presentation ? { ...state.presentation, theme: structuredClone(deckThemes[id]) } : null }));
    },
    loadExample(brief) {
      const parsed = briefSchema.parse(brief);
      set({ brief: parsed, step: 'brief', outline: null, presentation: null, selectedSlideId: null, error: null, fieldErrors: {} });
    },
    resetBrief() { set({ brief: { ...initialBrief }, step: 'brief', outline: null, presentation: null, selectedSlideId: null, error: null, fieldErrors: {} }); },
    generateOutline() {
      const parsed = briefSchema.safeParse(get().brief);
      if (!parsed.success) {
        const errors = Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]));
        set({ error: '请检查需求后再生成大纲。', fieldErrors: errors }); return false;
      }
      set({ brief: parsed.data, outline: createMockOutline(parsed.data), presentation: null, selectedSlideId: null, step: 'outline', error: null, fieldErrors: {} }); return true;
    },
    updateOutlineSlide(id, patch) {
      if (!get().outline?.slides.some(slide => slide.id === id)) return;
      set(state => ({ outline: state.outline ? { ...state.outline, slides: state.outline.slides.map(slide => slide.id === id ? { ...slide, ...patch } : slide) } : null, presentation: null, selectedSlideId: null, step: 'outline', error: null, fieldErrors: {} }));
    },
    moveOutlineSlide(id, direction) {
      const outline = get().outline; if (!outline) return;
      const index = outline.slides.findIndex(slide => slide.id === id); const target = index + direction;
      if (index < 0 || target < 0 || target >= outline.slides.length) return;
      const slides = [...outline.slides]; [slides[index], slides[target]] = [slides[target], slides[index]];
      set({ outline: { ...outline, slides }, presentation: null, selectedSlideId: null, step: 'outline', error: null });
    },
    removeOutlineSlide(id) {
      const outline = get().outline; if (!outline || outline.slides.length <= 1) return;
      if (!outline.slides.some(slide => slide.id === id)) return;
      set({ outline: { ...outline, slides: outline.slides.filter(slide => slide.id !== id) }, presentation: null, selectedSlideId: null, step: 'outline', error: null, fieldErrors: {} });
    },
    addOutlineSlide() {
      const outline = get().outline; if (!outline || outline.slides.length >= 15) return;
      const en = get().brief.language === 'en-US';
      const slide: OutlineSlide = { id: crypto.randomUUID(), title: en ? 'A new idea' : '新的观点', description: en ? 'Describe the key point for this slide.' : '写下这一页最想传递的观点。', layout: 'bullets' };
      const slides = [...outline.slides]; slides.splice(slides.at(-1)?.layout === 'summary' ? slides.length - 1 : slides.length, 0, slide);
      set({ outline: { ...outline, slides }, presentation: null, selectedSlideId: null, step: 'outline', error: null });
    },
    confirmOutline() {
      if (get().presentation) { set({ step: 'preview' }); return true; }
      if (get().outline?.source === 'anna') { set({ error: '大纲已准备好，请点击“AI 生成正文”继续。' }); return false; }
      const outline = outlineSchema.safeParse(get().outline);
      if (!outline.success) { set({ error: '请为每页填写有效的标题和要点，最多保留 15 页。' }); return false; }
      const presentation = createMockPresentation(get().brief, outline.data);
      set({ outline: outline.data, presentation, selectedSlideId: presentation.slides[0].id, step: 'preview', error: null, fieldErrors: {} }); return true;
    },
    navigate(step) {
      if (step === 'outline' && !get().outline || step === 'preview' && !get().presentation) return;
      set({ step, error: null, fieldErrors: {} });
    },
    selectSlide(id) { if (get().presentation?.slides.some(slide => slide.id === id)) set({ selectedSlideId: id }); },
    saveSlide(slide) {
      const current = get().presentation;
      if (!current?.slides.some(page => page.id === slide.id)) return false;
      const parsed = presentationSchema.safeParse({ ...current, slides: current.slides.map(page => page.id === slide.id ? slide : page) });
      if (!parsed.success) return false;
      set({ presentation: parsed.data }); return true;
    },
  }));
}
export const workspaceStore = createWorkspaceStore();
export function useWorkspace<T>(selector: (state: WorkspaceState) => T): T { return useStore(workspaceStore, selector); }
