import { subdivideGeodesic, subdivideGoldbergCoxeter } from './solids/geodesic';
import { goldbergDual, classifyFaces, type GoldbergFace } from './goldberg/dual';
import { domeAxis, domeCounts } from './goldberg/hemisphere';
import { domeSpecs, type DomeSpecs } from './bricks/specs';
import { fullBrickShapes, type BrickShape } from './bricks/schedule';
import type { BaseSolid } from './goldberg/formulas';
import type { Vec3 } from './solids/base';

export type SubdivisionClass = 'I' | 'II';

export interface OvenParams {
  base: BaseSolid;
  frequency: number;
  subdivisionClass: SubdivisionClass;
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

/** One-shot orchestration of the whole geometry core for a parameter set. */
export function computeOven(p: OvenParams): OvenResult {
  const mesh = p.subdivisionClass === 'II'
    ? subdivideGoldbergCoxeter(p.base, p.frequency, p.frequency)
    : subdivideGeodesic(p.base, p.frequency);
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
  interiorMm: 1020,
  thicknessMm: 100,
  cutAngleDeg: 90,
};
