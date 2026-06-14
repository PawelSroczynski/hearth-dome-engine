import type { GoldbergFace } from '../goldberg/dual';
import { classifyFace } from '../goldberg/hemisphere';
import type { Vec3 } from '../solids/base';

/**
 * Group the dome's FULL bricks into unique congruent shapes.
 *
 * Two faces are the same shape if their edge-length multisets match (congruent
 * polygons share the same set of edge chords, independent of position/orientation
 * — and independent of absolute scale, so this needs no metric calibration).
 * Cut bricks (clipped by the plane) are handled separately (see clipping stage).
 *
 * Verified vs v1 schedule counts (e.g. icosa GP(4,0): PENTAGON x6,
 * HEXAGON A x30, HEXAGON B x10, HEXAGON C x25 = 71 full bricks).
 */

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const SIG_PRECISION = 1e3; // round chords (unit sphere) to cluster congruent faces

export interface BrickShape {
  label: string; // PENTAGON, SQUARE, TRIANGLE, HEXAGON A/B/C...
  sides: number;
  count: number;
  /** sorted edge chords on the unit sphere (relative; absolute mm needs scale) */
  edgeUnits: number[];
  /** longest diagonal on the unit sphere (relative) */
  spanUnit: number;
}

function edgeChords(face: GoldbergFace): number[] {
  const n = face.corners.length;
  const e: number[] = [];
  for (let i = 0; i < n; i++) e.push(dist(face.corners[i], face.corners[(i + 1) % n]));
  return e;
}

function spanOf(face: GoldbergFace): number {
  let s = 0;
  const c = face.corners;
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) s = Math.max(s, dist(c[i], c[j]));
  return s;
}

const cornerName = (sides: number) =>
  sides === 5 ? 'PENTAGON' : sides === 4 ? 'SQUARE' : sides === 3 ? 'TRIANGLE' : 'HEXAGON';

/** Full-brick shape schedule, ordered: corner shape first, then hexagons by frequency. */
export function fullBrickShapes(faces: GoldbergFace[], up: Vec3): BrickShape[] {
  const groups = new Map<string, { sides: number; edges: number[]; span: number; count: number }>();
  for (const f of faces) {
    if (classifyFace(f, up) !== 'full') continue;
    const edges = edgeChords(f).sort((a, b) => a - b);
    const sig = `${f.sides}|${edges.map((x) => Math.round(x * SIG_PRECISION)).join(',')}`;
    const g = groups.get(sig);
    if (g) g.count++;
    else groups.set(sig, { sides: f.sides, edges, span: spanOf(f), count: 1 });
  }
  const arr = [...groups.values()];
  // corner shapes (pent/sq/tri = fewer sides) first, then hexagons; within a
  // side-class order by count desc for stable A/B/C labelling.
  arr.sort((a, b) => a.sides - b.sides || b.count - a.count || a.span - b.span);

  let hexLetter = 0;
  return arr.map((g) => {
    const base = cornerName(g.sides);
    const label = g.sides === 6 ? `HEXAGON ${String.fromCharCode(65 + hexLetter++)}` : base;
    return { label, sides: g.sides, count: g.count, edgeUnits: g.edges, spanUnit: g.span };
  });
}
