import { useMemo } from 'react';
import type { DeckSlide, Presentation, Theme } from '../domain/deck';
import { layoutSlide, type SlideScene } from '../layout/engine';
import { SceneSvg } from './SceneSvg';

export function SlidePreview({ slide, theme, index, total, language, scene: prepared }: { slide: DeckSlide; theme: Theme; index: number; total: number; language: Presentation['language']; scene?: SlideScene }) {
  const calculated = useMemo(() => prepared ?? layoutSlide(slide, theme, index, total, language), [prepared, slide, theme, index, total, language]);
  return <section className={`deck-slide engine-slide layout-${slide.layout}`} style={{ backgroundColor: `#${calculated.background}` }} aria-label={`第 ${index + 1} 页预览：${slide.title}`} data-testid="slide-preview" data-layout={slide.layout}>
    <h3 className="sr-only">{slide.title}</h3>
    <SceneSvg scene={calculated}/>
  </section>;
}
