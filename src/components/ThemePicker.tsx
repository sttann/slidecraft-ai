import { Check } from 'lucide-react';
import { deckThemes } from '../domain/themes';
import type { Theme } from '../domain/deck';

export function ThemePicker({ selected, onChange, compact = false, disabled = false }: { selected: Theme['id']; onChange(id: Theme['id']): void; compact?: boolean; disabled?: boolean }) {
  return <div className={`deck-theme-picker ${compact ? 'compact' : ''}`} role="group" aria-label="视觉主题">
    {Object.values(deckThemes).map(theme => <button type="button" key={theme.id} disabled={disabled} className={`deck-theme ${selected === theme.id ? 'selected' : ''}`} aria-pressed={selected === theme.id} onClick={() => onChange(theme.id)}>
      <span className="deck-theme-sample" aria-hidden="true" style={{ backgroundColor: `#${theme.colors.ink}`, color: `#${theme.colors.accent}` }}><span>Aa</span><i style={{ backgroundColor: `#${theme.colors.accent}` }}/>{selected === theme.id && <Check size={13}/>}</span>
      <span>{theme.name}</span>
    </button>)}
  </div>;
}
