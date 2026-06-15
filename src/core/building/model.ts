import { panelizeSurface, type Opening, type SurfaceSpec, type WallSpec, type Panel } from '../wall/panelize';

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

/** A wall surface together with its placement on the footprint (for 3D layout). */
export interface WallPlacement { surface: SurfaceSpec; a: Vec2; b: Vec2; dir: Vec2 }

export function wallPlacements(m: BuildingModel): WallPlacement[] {
  const p = m.footprint.points;
  const surfs = wallSurfaces(m);
  const out: WallPlacement[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const len = dist2(a, b) || 1;
    out.push({ surface: surfs[i], a, b, dir: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } });
  }
  return out;
}

/** All wall panels of the building (every surface panelized). For BOM / cost. */
export function allWallPanels(m: BuildingModel): Panel[] {
  return wallSurfaces(m).flatMap(panelizeSurface);
}

/** Rectangular building shell from the single-wall store params (front edge holds openings). */
export function buildingFromWall(wall: WallSpec, depthMm: number): BuildingModel {
  return {
    footprint: rectangleFootprint(wall.lengthMm, depthMm),
    wallHeightMm: wall.heightMm,
    wallThicknessMm: wall.thicknessMm,
    targetWidthMm: wall.targetWidthMm,
    openingsByEdge: [wall.openings, [], [], []],
    roof: { type: 'flat', pitchDeg: 0, ridgeAxis: 'x' },
    floor: { moduleWidthMm: 800, thicknessMm: 240, spanAxis: 'y' },
  };
}

export function footprintCenter(f: Footprint): Vec2 {
  const p = f.points;
  return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length };
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
