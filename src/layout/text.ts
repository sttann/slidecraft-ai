/** Portable point-based metrics: the same conservative wrapping runs in Node and the browser. */
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
export const graphemes = (value: string) => Array.from(segmenter.segment(value), part => part.segment);
export const lineHeightAt = (fontSize: number) => fontSize * 1.35;

function glyphUnits(char: string): number {
  if (/^\p{Mark}+$/u.test(char)) return 0;
  if (/^\s$/u.test(char)) return 0.38;
  if (/^[ilI1|.,:;'!`]$/.test(char)) return 0.46;
  if (/^[MWmw@%&]$/.test(char)) return 1.08;
  if (/^[A-Z0-9]$/.test(char)) return 0.82;
  if (/^[a-z]$/.test(char)) return 0.72;
  if (/^[(){}[\]<>/?+=_-]$/.test(char)) return 0.67;
  return 1.08;
}
export function measureText(text: string, fontSize: number, bold = false): number {
  return graphemes(text).reduce((sum, char) => sum + glyphUnits(char), 0) * fontSize * (bold ? 1.04 : 1);
}

export function wrapText(text: string, fontSize: number, width: number, bold = false): string[] {
  if (!(fontSize > 0 && width > 0)) throw new Error('Text geometry must be positive.');
  const output: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) { output.push(''); continue; }
    const closes = /^[，。！？；：、）》」』】〕〉”’.,!?;:)\]}]$/u;
    const opens = /^[（《「『【〔〈“‘([{]$/u;
    let pending = graphemes(paragraph.trim());
    const lines: string[] = [];
    while (pending.length) {
      let end = 1;
      while (end < pending.length && measureText(pending.slice(0, end + 1).join(''), fontSize, bold) <= width) end++;
      if (end < pending.length) {
        const space = pending.slice(0, end).lastIndexOf(' ');
        if (space > 0) end = space;
        // Move a boundary left rather than allowing closing punctuation to start a line.
        while (end > 1 && (closes.test(pending[end]) || opens.test(pending[end - 1]))) end--;
      }
      lines.push(pending.slice(0, end).join('').trimEnd());
      pending = pending.slice(end);
      while (pending.length && /^\s$/u.test(pending[0])) pending.shift();
    }
    // Balance a tiny final line within this paragraph, keeping English words intact.
    if (lines.length > 1) {
      const previous = lines.length - 2, last = lines.length - 1;
      while (measureText(lines[last], fontSize, bold) < width * 0.28) {
        const chars = graphemes(lines[previous]);
        let boundary = chars.length - 1;
        if (/^[a-zA-Z0-9]$/.test(chars[boundary] ?? '')) {
          while (boundary > 0 && /^[a-zA-Z0-9]$/.test(chars[boundary - 1])) boundary--;
        }
        while (boundary > 0 && (closes.test(chars[boundary]) || opens.test(chars[boundary - 1]))) boundary--;
        if (boundary < 1) break;
        const suffix = chars.slice(boundary).join('');
        const joiner = /[a-zA-Z0-9]$/.test(suffix) && /^[a-zA-Z0-9]/.test(lines[last]) ? ' ' : '';
        const candidate = suffix + joiner + lines[last];
        if (measureText(candidate, fontSize, bold) > width) break;
        lines[previous] = chars.slice(0, boundary).join('').trimEnd();
        lines[last] = candidate;
      }
    }
    output.push(...(lines.length ? lines : ['']));
  }
  return output.length ? output : [''];
}

export interface FittedText { lines: string[]; fontSize: number; lineHeight: number; shortened: boolean }
function ellipsize(line: string, width: number, fontSize: number, bold: boolean): string {
  const chars = graphemes(line.trimEnd());
  while (chars.length && measureText(chars.join('') + '…', fontSize, bold) > width) chars.pop();
  return chars.join('') + '…';
}
export function fitText(text: string, width: number, height: number, preferred: number, minimum: number, bold = false): FittedText {
  if (!(minimum > 0 && preferred >= minimum && width >= minimum * 1.2 && height >= lineHeightAt(minimum))) throw new Error('Text box is too small for its minimum font.');
  for (let size = preferred; size >= minimum; size--) {
    const lines = wrapText(text, size, width, bold);
    if (lines.length * lineHeightAt(size) <= height + 0.001) return { lines, fontSize: size, lineHeight: lineHeightAt(size), shortened: false };
  }
  const lines = wrapText(text, minimum, width, bold);
  const maximum = Math.max(1, Math.floor(height / lineHeightAt(minimum)));
  const visible = lines.slice(0, maximum);
  visible[visible.length - 1] = ellipsize(visible.at(-1)!, width, minimum, bold);
  return { lines: visible, fontSize: minimum, lineHeight: lineHeightAt(minimum), shortened: true };
}

export function fitList(items: string[], width: number, height: number, preferred: number, minimum: number, gap: number): FittedText[] {
  for (let size = preferred; size >= minimum; size--) {
    const results = items.map(text => ({ lines: wrapText(text, size, width), fontSize: size, lineHeight: lineHeightAt(size), shortened: false }));
    if (results.reduce((sum, item) => sum + item.lines.length * item.lineHeight, 0) + gap * (items.length - 1) <= height + 0.001) return results;
  }
  const wanted = items.map(text => wrapText(text, minimum, width).length);
  const allocated = items.map(() => 1);
  let remaining = Math.floor((height - gap * (items.length - 1)) / lineHeightAt(minimum)) - items.length;
  if (remaining < 0) throw new Error('List cannot fit even one line per item.');
  while (remaining > 0) {
    let used = false;
    for (let i = 0; i < items.length && remaining > 0; i++) {
      if (allocated[i] < wanted[i]) { allocated[i]++; remaining--; used = true; }
    }
    if (!used) break;
  }
  return items.map((text, index) => fitText(text, width, allocated[index] * lineHeightAt(minimum) + 0.01, minimum, minimum));
}
