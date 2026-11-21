import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createPresentationPptx } from '../src/export/presentation-pptx.ts';
import { layoutPresentation } from '../src/layout/engine.ts';

await mkdir('artifacts/phase3', { recursive: true });
for (const name of ['rag', 'product', 'teaching']) {
  const presentation = JSON.parse(await readFile(`tests/fixtures/${name}.json`, 'utf8'));
  const blob = await createPresentationPptx(presentation);
  const path = `artifacts/phase3/${name}-${presentation.slides.length}.pptx`;
  await writeFile(path, Buffer.from(await blob.arrayBuffer()));
  await writeFile(`artifacts/phase3/${name}-layout.json`, JSON.stringify(layoutPresentation(presentation), null, 2));
  console.log(`${path}: ${presentation.slides.length} pages, ${blob.size} bytes; no model calls.`);
}
