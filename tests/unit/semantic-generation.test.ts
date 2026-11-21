import { expect, it } from 'vitest';
import { materializePresentation } from '../../src/platform/generation';
import { createMockOutline, exampleBriefs } from '../../src/mocks/presentations';
import { createPresentationPptx } from '../../src/export/presentation-pptx';
it.each(exampleBriefs)('materializes semantic AI content for $label without losing source points',async({brief})=>{
 const outline=createMockOutline(brief);outline.slides[0].id='element-1';
 const body={slides:outline.slides.map(slide=>({id:slide.id,summary:'A clear explanation',points:['First point','Second point','Third point','Fourth point'],notes:'Speaker notes'}))};
 const model=materializePresentation(brief,outline,body);
 expect(model.slides).toHaveLength(brief.slideCount);
 expect(model.slides.map(page=>page.layout)).toEqual(outline.slides.map(page=>page.layout));
 expect(model.slides[0].id).not.toBe(model.slides[0].elements[0].id);
 for(const slide of model.slides)for(const point of body.slides[0].points)expect(slide.notes).toContain(point);
 expect((await createPresentationPptx(model)).size).toBeGreaterThan(1000);
});
