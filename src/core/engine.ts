import { subdivideGeodesic } from './solids/geodesic';
import { goldbergDual, classifyFaces, type GoldbergFace } from './goldberg/dual';
import { domeAxis, domeCounts } from './goldberg/hemisphere';
import { domeSpecs, type DomeSpecs } from './bricks/specs';
import type { BaseSolid } from './goldberg/formulas';
import type { Vec3 } from './solids/base';

export interface OvenParams {
  base: BaseSolid;
  frequency: number;
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
  specs: DomeSpecs;
}

/** One-shot orchestration of the whole geometry core for a parameter set. */
export function computeOven(p: OvenParams): OvenResult {
  const faces = goldbergDual(subdivideGeodesic(p.base, p.frequency));
  const up = domeAxis(p.base);
  const { full, cut, total } = domeCounts(faces, up);
  const comp = classifyFaces(faces);
  return {
    faces,
    up,
    total,
    full,
    cut,
    sphereFaces: faces.length,
    pentagons: comp[5] ?? 0,
    hexagons: comp[6] ?? 0,
    specs: domeSpecs({ interiorMm: p.interiorMm, thicknessMm: p.thicknessMm, cutAngleDeg: p.cutAngleDeg }),
  };
}

export const DEFAULT_PARAMS: OvenParams = {
  base: 'icosa',
  frequency: 4,
  interiorMm: 1020,
  thicknessMm: 100,
  cutAngleDeg: 90,
};
