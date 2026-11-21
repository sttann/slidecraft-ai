export function unescapeXml(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (_, entity: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity]!);
}
export function nativeShapes(xml: string): { name: string; x: number; y: number; w: number; h: number; fontSize: number | null; text: string[] }[] {
  return Array.from(xml.matchAll(/<p:sp>.*?<\/p:sp>/gs), match => {
    const shape = match[0];
    const name = /<p:cNvPr\b[^>]*\bname="([^"]*)"/.exec(shape)?.[1] ?? '';
    const offset = /<a:off x="(-?\d+)" y="(-?\d+)"/.exec(shape);
    const extent = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(shape);
    const fontSize = /<a:rPr\b[^>]*\bsz="(\d+)"/.exec(shape)?.[1];
    return { name: unescapeXml(name), x: Number(offset?.[1]), y: Number(offset?.[2]), w: Number(extent?.[1]), h: Number(extent?.[2]), fontSize: fontSize ? Number(fontSize) / 100 : null,
      text: Array.from(shape.matchAll(/<a:t>(.*?)<\/a:t>/gs), item => unescapeXml(item[1])) };
  });
}
