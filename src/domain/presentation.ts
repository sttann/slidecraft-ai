import { z } from 'zod';

export const slideSchema = z.object({
  title: z.string().trim().min(1).max(60),
  bullets: z.array(z.string().trim().min(1).max(90)).min(1).max(4),
}).strict();
export type ProbeSlide = z.infer<typeof slideSchema>;
export const themes = {
  forest: { name: '松林绿', ink: '153F35', accent: 'BDE78B', paper: 'F1F4EC', muted: '65736C' },
  ink: { name: '经典黑白', ink: '242930', accent: 'E4BC72', paper: 'F4F2EE', muted: '74767B' },
  ocean: { name: '深海蓝', ink: '153F64', accent: '8BDEEB', paper: 'EDF4F8', muted: '687E8A' },
} as const;
export type ThemeId = keyof typeof themes;
export const demoSlide: ProbeSlide = {
  title: '让每一个想法，清晰呈现。',
  bullets: ['从一个主题出发，梳理有逻辑的演示结构', '用精简内容与统一设计，让观点更有力量', '下载可编辑的 PowerPoint，继续打磨你的表达'],
};

export function parseSlide(text: string): ProbeSlide {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return slideSchema.parse(JSON.parse(stripped));
}

// Repair only a bounded excess of otherwise valid bullet points; never invent content,
// truncate incomplete JSON, coerce types, or accept unbounded model output.
export function normalizeProbeSlide(text: string): { slide: ProbeSlide; repairs: string[] } {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const candidate = slideSchema.extend({ bullets: z.array(z.string().trim().min(1).max(90)).min(1).max(8) }).parse(JSON.parse(stripped));
  const repairs = candidate.bullets.length > 4 ? ['limited-bullets-to-four'] : [];
  return { slide: slideSchema.parse({ ...candidate, bullets: candidate.bullets.slice(0, 4) }), repairs };
}
