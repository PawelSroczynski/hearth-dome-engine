import { panelizeSurface, type Opening, type SurfaceSpec, type WallSpec, type Panel } from '../wall/panelize';
import { floorize } from '../floor/floorize';
import { roofTiles, gableInfills } from '../roof/roofize';

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
export interface RoofSpec { type: RoofType; pitchDeg: number; ridgeAxis: 'x' | 'y'; moduleWidthMm: number }
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
export function buildingFromWall(wall: WallSpec, depthMm: number, floor?: FloorSpec, roof?: RoofSpec): BuildingModel {
  return {
    footprint: rectangleFootprint(wall.lengthMm, depthMm),
    wallHeightMm: wall.heightMm,
    wallThicknessMm: wall.thicknessMm,
    targetWidthMm: wall.targetWidthMm,
    openingsByEdge: [wall.openings, [], [], []],
    roof: roof ?? { type: 'flat', pitchDeg: 0, ridgeAxis: 'x', moduleWidthMm: 800 },
    floor: floor ?? { moduleWidthMm: 800, thicknessMm: 240, spanAxis: 'y' },
  };
}

/** Roof covering panels + gable infills as a flat BOM list. */
export function roofPanels(m: BuildingModel): Panel[] {
  const { L, D } = footprintBBox(m.footprint);
  return [
    ...roofTiles(L, D, m.roof.pitchDeg, m.roof.type, m.roof.moduleWidthMm),
    ...gableInfills(L, D, m.roof.pitchDeg, m.roof.type),
  ];
}

/** Footprint bounding box dimensions (mm). */
export function footprintBBox(f: Footprint): { L: number; D: number } {
  const xs = f.points.map((p) => p.x), ys = f.points.map((p) => p.y);
  return { L: Math.max(...xs) - Math.min(...xs), D: Math.max(...ys) - Math.min(...ys) };
}

/** Outer platform extent = wall-centreline footprint grown by the wall thickness on
 *  every side (t/2 each), so the walls stand fully ON the platform (no overhang). */
export function platformBBox(m: BuildingModel): { L: number; D: number } {
  const { L, D } = footprintBBox(m.footprint);
  return { L: L + m.wallThicknessMm, D: D + m.wallThicknessMm };
}

/** Floor cassettes tiling the outer platform (plan coords). */
export function floorCassettes(m: BuildingModel): Panel[] {
  const { L, D } = platformBBox(m);
  return floorize(L, D, m.floor.moduleWidthMm, m.floor.spanAxis);
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
