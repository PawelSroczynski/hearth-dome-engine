import type { Panel, PanelType } from '../wall/panelize';
import { PANEL_LIMITS } from '../wall/panelize';

export type RoofType = 'flat' | 'gable' | 'mono';

/** One rectangular roof slope: width along the ridge, length = rafter (eave→ridge). */
export interface RoofSlope { widthMm: number; rafterMm: number }

export interface RoofGeom {
  slopes: RoofSlope[];
  riseMm: number;          // height the ridge/high-eave rises above the wall top
  gableBaseMm: number;     // base of each gable/sloped-wall triangle
  gableHeightMm: number;   // height of that triangle (= rise)
  gableCount: number;      // number of triangular infills
}

/** Roof geometry over an L×D footprint at a given pitch. */
export function roofGeom(L: number, D: number, pitchDeg: number, type: RoofType): RoofGeom {
  const p = (pitchDeg * Math.PI) / 180;
  if (type === 'gable') {
    const rise = (D / 2) * Math.tan(p);
    const rafter = Math.hypot(D / 2, rise);
    return { slopes: [{ widthMm: L, rafterMm: rafter }, { widthMm: L, rafterMm: rafter }], riseMm: rise, gableBaseMm: D, gableHeightMm: rise, gableCount: 2 };
  }
  if (type === 'mono') {
    const rise = D * Math.tan(p);
    const rafter = Math.hypot(D, rise);
    return { slopes: [{ widthMm: L, rafterMm: rafter }], riseMm: rise, gableBaseMm: D, gableHeightMm: rise, gableCount: 2 };
  }
  return { slopes: [], riseMm: 0, gableBaseMm: 0, gableHeightMm: 0, gableCount: 0 };
}

/** Tile a rectangle into panels of a given type: strips ≤ module across width, ≤6000 along length. */
export function tileRect(widthMm: number, lengthMm: number, moduleMm: number, type: PanelType): Panel[] {
  const lim = PANEL_LIMITS[type as Exclude<PanelType, 'void'>];
  const mod = Math.min(Math.max(moduleMm, lim.wMin), lim.wMax);
  const nStrips = Math.max(1, Math.ceil(widthMm / mod));
  const stripW = widthMm / nStrips;
  const nSeg = Math.max(1, Math.ceil(lengthMm / lim.hMax));
  const segLen = lengthMm / nSeg;
  const out: Panel[] = [];
  for (let i = 0; i < nStrips; i++) {
    for (let j = 0; j < nSeg; j++) {
      const ok = stripW >= lim.wMin - 0.5 && stripW <= lim.wMax + 0.5 && segLen >= lim.hMin - 0.5 && segLen <= lim.hMax + 0.5;
      out.push({ type, x: i * stripW, y: j * segLen, w: stripW, h: segLen, ok });
    }
  }
  return out;
}

/** Roof covering panels (all slopes) as a flat BOM list (type 'roof'). */
export function roofTiles(L: number, D: number, pitchDeg: number, type: RoofType, moduleMm: number): Panel[] {
  return roofGeom(L, D, pitchDeg, type).slopes.flatMap((s) => tileRect(s.widthMm, s.rafterMm, moduleMm, 'roof'));
}

/** Gable/sloped-wall triangular infills as BOM rows (type 'gable'); area uses ½·base·height. */
export function gableInfills(L: number, D: number, pitchDeg: number, type: RoofType): Panel[] {
  const g = roofGeom(L, D, pitchDeg, type);
  if (g.gableCount === 0 || g.gableHeightMm < 1) return [];
  const ok = g.gableHeightMm <= PANEL_LIMITS.gable.hMax + 0.5;
  return Array.from({ length: g.gableCount }, () => ({ type: 'gable' as const, x: 0, y: 0, w: g.gableBaseMm, h: g.gableHeightMm, ok }));
}

/** True covered area (m²) of roof slopes + triangular gables. */
export function roofAreaMm2(L: number, D: number, pitchDeg: number, type: RoofType): number {
  const g = roofGeom(L, D, pitchDeg, type);
  const slope = g.slopes.reduce((s, x) => s + x.widthMm * x.rafterMm, 0);
  const gable = 0.5 * g.gableBaseMm * g.gableHeightMm * g.gableCount;
  return slope + gable;
}
