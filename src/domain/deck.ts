import { z } from 'zod';

export const layoutIds = ['cover', 'section', 'bullets', 'two-columns', 'comparison', 'process', 'summary'] as const;
export const layoutSchema = z.enum(layoutIds);
export const languageSchema = z.enum(['zh-CN', 'en-US']);
export const themeIdSchema = z.enum(['forest', 'ink', 'ocean']);
const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/, '无效的内容标识');
const titleSchema = z.string().trim().min(1, '请填写页面标题').max(80, '标题最多 80 字');
const pointSchema = z.string().trim().min(1, '请填写内容').max(120, '单条内容最多 120 字');
const hexSchema = z.string().regex(/^[A-Fa-f0-9]{6}$/, '颜色必须为六位十六进制值');

export const themeSchema = z.object({
  id: themeIdSchema, name: z.string().min(1).max(40),
  colors: z.object({ ink: hexSchema, paper: hexSchema, accent: hexSchema, muted: hexSchema }).strict(),
  fonts: z.object({ heading: z.string().min(1).max(80), body: z.string().min(1).max(80) }).strict(),
  spacing: z.enum(['comfortable', 'compact']),
}).strict();
export type Theme = z.infer<typeof themeSchema>;

export const briefSchema = z.object({
  topic: z.string().trim().min(1, '请填写演示主题').max(80, '主题最多 80 字'),
  description: z.string().trim().max(1200, '补充说明最多 1200 字'),
  audience: z.string().trim().min(1, '请填写目标受众').max(80, '受众最多 80 字'),
  slideCount: z.number().int().min(5, '请选择 5–15 页').max(15, '请选择 5–15 页'),
  language: languageSchema, themeId: themeIdSchema,
}).strict();
export type Brief = z.infer<typeof briefSchema>;

export const outlineSlideSchema = z.object({
  id: idSchema, title: titleSchema,
  description: z.string().trim().min(1, '请填写本页要点').max(240, '本页要点最多 240 字'),
  layout: layoutSchema,
}).strict();
export type OutlineSlide = z.infer<typeof outlineSlideSchema>;
export const outlineSchema = z.object({
  title: titleSchema, source: z.enum(['mock', 'anna']),
  slides: z.array(outlineSlideSchema).min(1, '至少保留一页').max(15, '最多 15 页'),
}).strict().superRefine((outline, context) => {
  const ids = new Set<string>();
  outline.slides.forEach((slide, index) => {
    if (ids.has(slide.id)) context.addIssue({ code: 'custom', path: ['slides', index, 'id'], message: '页面标识不能重复' });
    ids.add(slide.id);
  });
});
export type Outline = z.infer<typeof outlineSchema>;

export const textElementSchema = z.object({ id: idSchema, type: z.literal('text'), text: z.string().trim().min(1).max(240) }).strict();
export const bulletsElementSchema = z.object({ id: idSchema, type: z.literal('bullets'), items: z.array(pointSchema).min(1).max(4) }).strict();
const columnSchema = z.object({ heading: z.string().trim().min(1).max(40), items: z.array(pointSchema).min(1).max(4) }).strict();
export const columnsElementSchema = z.object({ id: idSchema, type: z.literal('columns'), columns: z.tuple([columnSchema, columnSchema]) }).strict();
export const comparisonElementSchema = z.object({ id: idSchema, type: z.literal('comparison'), left: columnSchema, right: columnSchema }).strict();
export const processElementSchema = z.object({ id: idSchema, type: z.literal('process'), steps: z.array(z.object({
  title: z.string().trim().min(1).max(36), description: pointSchema,
}).strict()).min(2).max(5) }).strict();
export const elementSchema = z.discriminatedUnion('type', [textElementSchema, bulletsElementSchema, columnsElementSchema, comparisonElementSchema, processElementSchema]);
export type SlideElement = z.infer<typeof elementSchema>;

const slideBase = { id: idSchema, title: titleSchema, notes: z.string().max(1200) };
export const deckSlideSchema = z.discriminatedUnion('layout', [
  z.object({ ...slideBase, layout: z.literal('cover'), elements: z.tuple([textElementSchema]) }).strict(),
  z.object({ ...slideBase, layout: z.literal('section'), elements: z.tuple([textElementSchema]) }).strict(),
  z.object({ ...slideBase, layout: z.literal('bullets'), elements: z.tuple([bulletsElementSchema]) }).strict(),
  z.object({ ...slideBase, layout: z.literal('two-columns'), elements: z.tuple([columnsElementSchema]) }).strict(),
  z.object({ ...slideBase, layout: z.literal('comparison'), elements: z.tuple([comparisonElementSchema]) }).strict(),
  z.object({ ...slideBase, layout: z.literal('process'), elements: z.tuple([processElementSchema]) }).strict(),
  z.object({ ...slideBase, layout: z.literal('summary'), elements: z.tuple([bulletsElementSchema]) }).strict(),
]);
export type DeckSlide = z.infer<typeof deckSlideSchema>;
export type LayoutId = z.infer<typeof layoutSchema>;

export const presentationSchema = z.object({
  schemaVersion: z.literal(1), id: idSchema, title: titleSchema,
  language: languageSchema, audience: z.string().trim().min(1).max(80),
  source: z.enum(['mock', 'anna']), theme: themeSchema,
  slides: z.array(deckSlideSchema).min(1).max(15),
}).strict().superRefine((presentation, context) => {
  const ids = new Set<string>();
  function register(id: string, path: (string | number)[]) {
    if (ids.has(id)) context.addIssue({ code: 'custom', path, message: '页面和元素标识必须全局唯一' });
    ids.add(id);
  }
  presentation.slides.forEach((slide, index) => {
    register(slide.id, ['slides', index, 'id']);
    slide.elements.forEach((element, elementIndex) => register(element.id, ['slides', index, 'elements', elementIndex, 'id']));
  });
});
export type Presentation = z.infer<typeof presentationSchema>;

export const layoutLabels: Record<LayoutId, string> = {
  cover: '封面', section: '章节', bullets: '要点', 'two-columns': '双栏', comparison: '对比', process: '流程', summary: '总结',
};
