import { themes } from './presentation.ts';
import type { Theme } from './deck';

export const deckThemes: Record<Theme['id'], Theme> = Object.fromEntries(
  Object.entries(themes).map(([id, theme]) => [id, {
    id, name: theme.name,
    colors: { ink: theme.ink, paper: theme.paper, accent: theme.accent, muted: theme.muted },
    fonts: { heading: 'Microsoft YaHei', body: 'Microsoft YaHei' }, spacing: 'comfortable',
  }]),
) as Record<Theme['id'], Theme>;
