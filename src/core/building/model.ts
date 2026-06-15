import type { Opening, SurfaceSpec } from '../wall/panelize';

/**
 * Building model (Phase 0) — single source of truth from which every modular
 * element (walls now; floor & roof later) is generated. Plan coordinates in mm.
 *
 * The strategy: each construction element is a planar SURFACE; `panelizeSurface`
 * fills it with modules and a frame places it in 3D. Walls come from footprint
 * edges; the floor from the footprint polygon; roof faces from the roof spec.
 */

export interface Vec2 { x: number; y: number }

/** Closed footprint polygon (CCW), in plan mm. */
export interface Footprint { points: Vec2[] }

export type RoofType = 'flat' | 'mono' | 'gable';
export interface RoofSpec { type: RoofType; pitchDeg: number; ridgeAxis: 'x' | 'y' }
export interface FloorSpec { moduleWidthMm: number; thicknessMm: number; spanAxis: 'x' | 'y' }

export interface BuildingModel {
  footprint: Footprint;
  wallHeightMm: number;
  wallThicknessMm: number;
  targetWidthMm: number;
  /** openings per footprint edge (index aligned to footprint.points edges) */
  openingsByEdge: Opening[][];
  roof: RoofSpec;
  floor: FloorSpec;
}

export const dist2 = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y);

/** Axis-aligned rectangle footprint, CCW from origin. */
export function rectangleFootprint(lengthMm: number, widthMm: number): Footprint {
  return { points: [{ x: 0, y: 0 }, { x: lengthMm, y: 0 }, { x: lengthMm, y: widthMm }, { x: 0, y: widthMm }] };
}

/** One wall SurfaceSpec per footprint edge (width = edge length, height = wall height). */
export function wallSurfaces(m: BuildingModel): SurfaceSpec[] {
  const p = m.footprint.points;
  const out: SurfaceSpec[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    out.push({
      widthMm: dist2(a, b),
      heightMm: m.wallHeightMm,
      thicknessMm: m.wallThicknessMm,
      targetWidthMm: m.targetWidthMm,
      openings: m.openingsByEdge[i] ?? [],
    });
  }
  return out;
}

/** Plan area of the footprint (shoelace), mm². Used for floor panel coverage. */
export function footprintAreaMm2(f: Footprint): number {
  const p = f.points;
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}
