/**
 * EcoCocon straw-wall panelizer (MVP). A wall (length × height × thickness) with
 * rectangular openings is split into prefab straw panels:
 *   - vertical STANDARD panels across solid stretches (≤ 850 mm wide),
 *   - a LINTEL band above each opening, a SILL band below each window,
 *   - the opening itself is a VOID.
 * Panels tile the wall exactly. Each panel is checked against EcoCocon size
 * ranges; out-of-range panels are flagged (ok=false) rather than silently split.
 *
 * Dimension ranges (EcoCocon Technical Specification v2.2):
 *   standard: width 400–850 mm, height 400–3000 mm
 *   lintel:   width 400–3000 mm, height 424–850 mm
 *   sill:     width 600–3000 mm, height 424–850 mm
 *   thickness 300–400 mm
 */

export type PanelType = 'standard' | 'lintel' | 'sill' | 'cassette' | 'roof' | 'gable' | 'void';

export interface Opening {
  x: number;      // left edge from wall start (mm)
  w: number;      // width (mm)
  sillH: number;  // bottom of opening above floor (0 = door) (mm)
  headH: number;  // top of opening above floor (mm)
}

export interface WallSpec {
  lengthMm: number;
  heightMm: number;
  thicknessMm: number;
  targetWidthMm: number; // preferred standard-panel width (clamped 400–850)
  openings: Opening[];
  depthMm?: number; // building depth (perpendicular wall length) for the 4-wall shell
}

/**
 * Element-agnostic planar surface to panelize (wall / floor / roof face). Panels
 * come back in LOCAL 2D coordinates (origin bottom-left); a caller places them in
 * 3D via the surface's frame. `panelize(WallSpec)` is a thin wrapper over this.
 */
export interface SurfaceSpec {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  targetWidthMm: number;
  openings: Opening[];
}

export interface Panel {
  type: PanelType;
  x: number; y: number; w: number; h: number; // mm, origin at wall bottom-left
  ok: boolean; // within EcoCocon range for its type
}

export const PANEL_LIMITS: Record<Exclude<PanelType, 'void'>, { wMin: number; wMax: number; hMin: number; hMax: number }> = {
  standard: { wMin: 400, wMax: 850, hMin: 400, hMax: 3000 },
  lintel: { wMin: 400, wMax: 3000, hMin: 424, hMax: 850 },
  sill: { wMin: 600, wMax: 3000, hMin: 424, hMax: 850 },
  cassette: { wMin: 300, wMax: 1200, hMin: 400, hMax: 6000 }, // floor cassette (our catalog)
  roof: { wMin: 400, wMax: 1200, hMin: 400, hMax: 6000 },     // roof panel (our catalog)
  gable: { wMin: 400, wMax: 6000, hMin: 200, hMax: 4000 },    // gable infill (placeholder)
};
export const THICKNESS_MIN = 300;
export const THICKNESS_MAX = 400;

function inRange(type: Exclude<PanelType, 'void'>, w: number, h: number): boolean {
  const L = PANEL_LIMITS[type];
  return w >= L.wMin - 0.5 && w <= L.wMax + 0.5 && h >= L.hMin - 0.5 && h <= L.hMax + 0.5;
}

/** Solid x-intervals of the wall = [0,length] minus the openings' x-ranges. */
function solidIntervals(lengthMm: number, openings: Opening[]): [number, number][] {
  const cuts = [...openings].sort((a, b) => a.x - b.x);
  const out: [number, number][] = [];
  let cursor = 0;
  for (const o of cuts) {
    const a = Math.max(0, o.x), b = Math.min(lengthMm, o.x + o.w);
    if (a > cursor) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < lengthMm) out.push([cursor, lengthMm]);
  return out;
}

/** Wall convenience wrapper: a wall is just a surface of width = length. */
export function panelize(spec: WallSpec): Panel[] {
  return panelizeSurface({
    widthMm: spec.lengthMm, heightMm: spec.heightMm, thicknessMm: spec.thicknessMm,
    targetWidthMm: spec.targetWidthMm, openings: spec.openings,
  });
}

export function panelizeSurface(spec: SurfaceSpec): Panel[] {
  const { widthMm, heightMm, targetWidthMm, openings } = spec;
  const lengthMm = widthMm;
  const panels: Panel[] = [];
  const target = Math.min(Math.max(targetWidthMm, PANEL_LIMITS.standard.wMin), PANEL_LIMITS.standard.wMax);

  // solid stretches -> as many identical 'target'-wide panels as possible; only the
  // edge panel(s) "close" the remainder (maximises repeated identical panels).
  for (const [a, b] of solidIntervals(lengthMm, openings)) {
    const span = b - a;
    if (span < 1) continue;
    let x = a;
    for (const w of closerWidths(span, target)) {
      addColumn(panels, x, w, 0, heightMm, 'standard');
      x += w;
    }
  }

  // openings -> void + sill (below) + lintel (above)
  for (const o of openings) {
    const x = Math.max(0, o.x), w = Math.min(lengthMm, o.x + o.w) - x;
    if (w < 1) continue;
    const sillH = Math.max(0, Math.min(o.sillH, heightMm));
    const headH = Math.max(sillH, Math.min(o.headH, heightMm));
    panels.push({ type: 'void', x, y: sillH, w, h: headH - sillH, ok: true });
    if (sillH > 0) panels.push({ type: 'sill', x, y: 0, w, h: sillH, ok: inRange('sill', w, sillH) });
    if (headH < heightMm) {
      const h = heightMm - headH;
      panels.push({ type: 'lintel', x, y: headH, w, h, ok: inRange('lintel', w, h) });
    }
  }
  return panels;
}

/**
 * Widths for a solid stretch: repeat `target` as many times as possible; the leftover
 * "closes" the run. If the closer would be below the min panel width it is merged with
 * the last full panel and the two are split evenly (both still ≥ min).
 */
function closerWidths(span: number, target: number): number[] {
  const MIN = PANEL_LIMITS.standard.wMin;
  if (span <= target + 0.5) return [span];
  const nFull = Math.floor(span / target);
  const rem = span - nFull * target;
  if (rem < 0.5) return Array(nFull).fill(target);
  if (rem >= MIN) return [...Array(nFull).fill(target), rem];
  const two = (target + rem) / 2;
  return [...Array(nFull - 1).fill(target), two, two];
}

/** A full-height column split vertically into ≤3000 mm standard panels. */
function addColumn(out: Panel[], x: number, w: number, y0: number, y1: number, type: 'standard') {
  const total = y1 - y0;
  const hMax = PANEL_LIMITS.standard.hMax;
  const n = Math.max(1, Math.ceil(total / hMax));
  const h = total / n;
  for (let i = 0; i < n; i++) {
    out.push({ type, x, y: y0 + i * h, w, h, ok: inRange('standard', w, h) });
  }
}

export interface BomRow { type: PanelType; label: string; w: number; h: number; count: number; ok: boolean }

/**
 * Bill of materials: group identical panels (type + rounded w×h). Voids excluded.
 * Each distinct size gets its own typological label — a single size keeps the bare
 * type name ("Standard"), several sizes of one type are suffixed A/B/C… (ordered by
 * count, then larger first), so a panel with individual dimensions has its own name.
 */
export function wallBom(panels: Panel[]): BomRow[] {
  const map = new Map<string, BomRow>();
  for (const p of panels) {
    if (p.type === 'void') continue;
    const w = Math.round(p.w), h = Math.round(p.h);
    const key = `${p.type}:${w}x${h}`;
    const row = map.get(key);
    if (row) row.count++;
    else map.set(key, { type: p.type, label: '', w, h, count: 1, ok: p.ok });
  }
  const rows = [...map.values()];
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  for (const type of new Set(rows.map((r) => r.type))) {
    const group = rows.filter((r) => r.type === type)
      .sort((a, b) => b.count - a.count || b.w * b.h - a.w * a.h);
    group.forEach((r, i) => {
      r.label = group.length > 1 ? `${cap(type)} ${String.fromCharCode(65 + i)}` : cap(type);
    });
  }
  return rows.sort((a, b) => a.type.localeCompare(b.type) || b.count - a.count);
}
