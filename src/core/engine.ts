import { subdivideGeodesic, subdivideGoldbergCoxeter } from './solids/geodesic';
import { goldbergDual, classifyFaces, type GoldbergFace } from './goldberg/dual';
import { domeAxis, domeCounts } from './goldberg/hemisphere';
import { domeSpecs, type DomeSpecs } from './bricks/specs';
import { fullBrickShapes, type BrickShape } from './bricks/schedule';
import type { BaseSolid } from './goldberg/formulas';
import type { Vec3 } from './solids/base';

export type SubdivisionClass = 'I' | 'II' | 'III';

export interface OvenParams {
  base: BaseSolid;
  frequency: number;
  subdivisionClass: SubdivisionClass;
  classIIIn: number; // chiral n for Class III GP(m,n), used only when class === 'III'
  interiorMm: number;
  thicknessMm: number;
  cutAngleDeg: number;
}

export interface OvenResult {
  faces: GoldbergFace[];
  up: Vec3;
  /** dome brick counts */
  total: number;
  full: number;
  cut: number;
  /** full-sphere composition */
  sphereFaces: number;
  pentagons: number;
  hexagons: number;
  /** unique full-brick shapes with cast counts */
  shapes: BrickShape[];
  uniqueShapes: number;
  specs: DomeSpecs;
}

/** Clamp the chiral n for Class III into the valid open range (0, m). */
export function classIIIn(m: number, n: number): number {
  return Math.min(Math.max(Math.round(n), 1), Math.max(1, m - 1));
}

function subdivideForClass(p: OvenParams) {
  if (p.subdivisionClass === 'II') return subdivideGoldbergCoxeter(p.base, p.frequency, p.frequency);
  if (p.subdivisionClass === 'III') return subdivideGoldbergCoxeter(p.base, p.frequency, classIIIn(p.frequency, p.classIIIn));
  return subdivideGeodesic(p.base, p.frequency);
}

/** One-shot orchestration of the whole geometry core for a parameter set. */
export function computeOven(p: OvenParams): OvenResult {
  const mesh = subdivideForClass(p);
  const faces = goldbergDual(mesh);
  const up = domeAxis(p.base);
  const { full, cut, total } = domeCounts(faces, up);
  const comp = classifyFaces(faces);
  const shapes = fullBrickShapes(faces, up, p.interiorMm / 2);
  return {
    faces,
    up,
    total,
    full,
    cut,
    sphereFaces: faces.length,
    pentagons: comp[5] ?? 0,
    hexagons: comp[6] ?? 0,
    shapes,
    uniqueShapes: shapes.length,
    specs: domeSpecs({ interiorMm: p.interiorMm, thicknessMm: p.thicknessMm, cutAngleDeg: p.cutAngleDeg }),
  };
}

export const DEFAULT_PARAMS: OvenParams = {
  base: 'icosa',
  frequency: 4,
  subdivisionClass: 'I',
  classIIIn: 1,
  interiorMm: 1020,
  thicknessMm: 100,
  cutAngleDeg: 90,
};
