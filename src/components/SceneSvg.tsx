import type { SlideScene } from '../layout/engine';
import { Fragment } from 'react';

export function SceneSvg({ scene, decorative = false }: { scene: SlideScene; decorative?: boolean }) {
  return <svg viewBox={`0 0 ${scene.width} ${scene.height}`} width="100%" height="100%" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : scene.nodes.flatMap(node => node.type === 'text' && node.role !== 'decoration' ? [node.source] : []).join('。')} className="scene-svg" data-layout-version={scene.version}>
    <rect width={scene.width} height={scene.height} fill={`#${scene.background}`}/>
    {scene.nodes.map(node => {
      if (node.type === 'line') return <line key={node.id} data-scene-id={node.id} x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2} stroke={`#${node.color}`} strokeWidth={node.width}/>;
      if (node.type === 'text') {
        const x = node.align === 'right' ? node.x + node.w : node.align === 'center' ? node.x + node.w / 2 : node.x;
        return <g key={node.id} data-scene-id={node.id} data-scene-role={node.role} data-box={`${node.x},${node.y},${node.w},${node.h}`} data-font-size={node.fontSize} data-line-height={node.lineHeight}>
          {node.lines.map((line, index) => <Fragment key={index}><text x={x} y={node.y + index * node.lineHeight} dominantBaseline="text-before-edge" textAnchor={node.align === 'right' ? 'end' : node.align === 'center' ? 'middle' : 'start'} fill={`#${node.color}`} fontFamily={node.fontFace} fontSize={node.fontSize} fontWeight={node.bold ? 700 : 400}>{line}</text>{'\n'}</Fragment>)}
        </g>;
      }
      const common = { 'data-scene-id': node.id, fill: node.fill ? `#${node.fill}` : 'none', stroke: node.stroke ? `#${node.stroke}` : undefined, strokeWidth: node.strokeWidth };
      return node.type === 'ellipse' ? <ellipse key={node.id} {...common} cx={node.x + node.w / 2} cy={node.y + node.h / 2} rx={node.w / 2} ry={node.h / 2}/> : <rect key={node.id} {...common} x={node.x} y={node.y} width={node.w} height={node.h}/>;
    })}
  </svg>;
}
