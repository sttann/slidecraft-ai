import { briefSchema, outlineSchema, presentationSchema, type Brief, type DeckSlide, type LayoutId, type Outline, type Presentation } from '../domain/deck.ts';
import { deckThemes } from '../domain/themes.ts';

export const exampleBriefs: { id: string; label: string; caption: string; brief: Brief }[] = [
  { id: 'rag', label: 'RAG 技术介绍', caption: '技术分享 · 8 页 · 中文', brief: { topic: 'RAG：让知识成为生产力', description: '用易懂的语言介绍检索增强生成的基本原理、使用方式和注意事项。', audience: '产品与技术团队', slideCount: 8, language: 'zh-CN', themeId: 'forest' } },
  { id: 'product', label: '商业产品分析', caption: '商业汇报 · 6 页 · 中文', brief: { topic: '从用户需求到产品价值', description: '梳理用户问题、产品方案、价值主张与下一步验证计划。', audience: '产品与业务团队', slideCount: 6, language: 'zh-CN', themeId: 'ink' } },
  { id: 'teaching', label: '英文教学演示', caption: '课程教学 · 10 页 · English', brief: { topic: 'Learning through clear explanations', description: 'Introduce a concept, compare approaches, and walk through a short learning activity.', audience: 'Students', slideCount: 10, language: 'en-US', themeId: 'ocean' } },
];

const middleLayouts: LayoutId[] = ['section', 'bullets', 'two-columns', 'comparison', 'process', 'bullets'];
const zhTitles = ['先建立共同的起点', '理解核心概念', '把想法连接到实践', '看见不同路径的取舍', '用清晰步骤推动行动', '值得关注的边界'];
const enTitles = ['Start with common ground', 'Understand the core idea', 'Connect ideas to practice', 'Compare the possible approaches', 'Move forward step by step', 'Recognize the boundaries'];

export function createMockOutline(input: Brief): Outline {
  const brief = briefSchema.parse(input);
  const en = brief.language === 'en-US';
  return outlineSchema.parse({
    title: brief.topic, source: 'mock',
    slides: Array.from({ length: brief.slideCount }, (_, index) => {
      const first = index === 0;
      const last = index === brief.slideCount - 1;
      const middleIndex = brief.slideCount === 6 ? index : index - 1;
      const layout = first ? 'cover' : last ? 'summary' : middleLayouts[middleIndex % middleLayouts.length];
      return {
        id: `slide-${String(index + 1).padStart(2, '0')}`, layout,
        title: first ? brief.topic : last ? (en ? 'Bring the ideas together' : '把观点汇成下一步行动') : (en ? enTitles : zhTitles)[middleIndex % zhTitles.length],
        description: first ? (brief.description || (en ? `A clear introduction for ${brief.audience}.` : `为${brief.audience}准备的一次清晰介绍。`)).slice(0, 240)
          : en ? 'Clarify the main idea, explain its purpose, and identify a useful next step.' : '明确本页的核心观点，解释它的意义，并提出一个可执行的下一步。',
      };
    }),
  });
}

export function createMockPresentation(input: Brief, draft: Outline): Presentation {
  const brief = briefSchema.parse(input);
  const outline = outlineSchema.parse(draft);
  const en = brief.language === 'en-US';
  const choose = (zh: string, english: string) => en ? english : zh;
  const usedIds = new Set(outline.slides.map(page => page.id));
  let elementSerial = 0;
  const slides: DeckSlide[] = outline.slides.map(page => {
    const base = { id: page.id, title: page.title, notes: '' };
    let id: string;
    do { id = `element-${++elementSerial}`; } while (usedIds.has(id));
    usedIds.add(id);
    const firstPoint = page.description.slice(0, 120);
    switch (page.layout) {
      case 'cover': case 'section':
        return { ...base, layout: page.layout, elements: [{ id, type: 'text', text: page.description }] };
      case 'bullets': case 'summary':
        return { ...base, layout: page.layout, elements: [{ id, type: 'bullets', items: [firstPoint, choose('从受众真正关心的问题出发', 'Start with what the audience needs'), choose('先验证假设，再形成清晰结论', 'Test assumptions before drawing conclusions')] }] };
      case 'two-columns':
        return { ...base, layout: page.layout, elements: [{ id, type: 'columns', columns: [
          { heading: choose('核心观点', 'The idea'), items: [firstPoint, choose('把复杂问题拆成可理解的部分', 'Break a complex problem into clear parts')] },
          { heading: choose('实践启发', 'In practice'), items: [choose('用小规模实验检验方向', 'Try a small, focused experiment'), choose('记录反馈并持续调整', 'Review feedback and adapt')] },
        ] }] };
      case 'comparison':
        return { ...base, layout: page.layout, elements: [{ id, type: 'comparison',
          left: { heading: choose('直接推进', 'Direct approach'), items: [firstPoint, choose('适合目标明确、信息充分的情况', 'Useful when the goal and context are clear')] },
          right: { heading: choose('先行探索', 'Explore first'), items: [choose('先澄清未知条件和关键假设', 'Clarify unknowns and key assumptions'), choose('适合仍需学习和验证的情况', 'Useful when more learning is needed')] },
        }] };
      case 'process':
        return { ...base, layout: 'process', elements: [{ id, type: 'process', steps: [
          { title: choose('理解问题', 'Understand'), description: firstPoint },
          { title: choose('探索方案', 'Explore'), description: choose('比较可行方向，明确取舍', 'Compare options and make trade-offs') },
          { title: choose('验证行动', 'Validate'), description: choose('开展实验，收集反馈，形成下一步', 'Test the idea and collect feedback') },
        ] }] };
    }
  });
  return presentationSchema.parse({ schemaVersion: 1, id: 'mock-presentation', title: outline.title, language: brief.language, audience: brief.audience, source: 'mock', theme: deckThemes[brief.themeId], slides });
}
