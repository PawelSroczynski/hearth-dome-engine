import type { GoldbergFace } from '../goldberg/dual';
import type { Vec3 } from '../solids/base';
import { flattenFace } from './panel';
import { innerCorner, outerCorner } from './brick';

/**
 * A casting MOULD for one brick: a thin-walled shell that wraps the brick's
 * perimeter, laid flat with the cavity floor on z=0 and a base flange so the
 * rim sits flush on the print bed. Open at top and bottom (hollow cavity),
 * tapered to flare outward going up — matching the original tool's mould.
 *
 * Pure geometry in millimetres, in a LOCAL frame (z = outward face normal,
 * origin = inner-face centroid). No THREE / DOM.
 */

export interface MouldParams {
  innerRMm: number;
  thicknessMm: number;
  wallMm: number;
  flangeMm: number;
}

export interface MouldShell {
  /** cavity (brick perimeter) rings, local mm */
  cavityBase: Vec3[];
  cavityTop: Vec3[];
  /** outer-wall rings offset out by wall thickness */
  outerBase: Vec3[];
  outerTop: Vec3[];
  /** flange outer edge ring on z = 0 */
  flange: Vec3[];
  /** triangulated surface (flat array, mm, local frame) */
  positions: number[];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const toMm = (v: Vec3): Vec3 => [v[0] * 1000, v[1] * 1000, v[2] * 1000];
/** push xy outward from the local z-axis by `d` mm, keep z. */
const radialOut = (p: Vec3, d: number): Vec3 => { const m = Math.hypot(p[0], p[1]) || 1; return [p[0] + (p[0] / m) * d, p[1] + (p[1] / m) * d, p[2]]; };

export function mouldShell(face: GoldbergFace, p: MouldParams): MouldShell {
  const panel = flattenFace(face);
  const n = panel.corners.length;

  // brick corner positions (mm) in world
  const innerW = panel.corners.map((c): Vec3 => toMm(innerCorner(c, p.innerRMm)));
  const outerW = panel.corners.map((c): Vec3 => toMm(outerCorner(c, p.innerRMm, p.thicknessMm)));
  const ciW = toMm(innerCorner(panel.centroid, p.innerRMm));

  // local frame: origin = inner centroid, z = outward normal
  const w = norm(panel.normal);
  const u = norm(sub(sub(innerW[0], ciW), (() => { const d = sub(innerW[0], ciW); const k = dot(d, w); return [w[0] * k, w[1] * k, w[2] * k] as Vec3; })()));
  const v = cross(w, u);
  const local = (P: Vec3): Vec3 => { const d = sub(P, ciW); return [dot(d, u), dot(d, v), dot(d, w)]; };

  const innerL = innerW.map(local);
  const outerL = outerW.map(local);
  const z0 = innerL.reduce((s, q) => s + q[2], 0) / n; // inner ring is planar; flatten it to z=0

  const cavityBase = innerL.map((q): Vec3 => [q[0], q[1], 0]);
  const cavityTop = outerL.map((q): Vec3 => [q[0], q[1], q[2] - z0]);
  const outerBase = cavityBase.map((q) => radialOut(q, p.wallMm));
  const outerTop = cavityTop.map((q) => radialOut(q, p.wallMm));
  const flange = outerBase.map((q) => radialOut(q, p.flangeMm));

  const pos: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // cavity wall (brick side)
    tri(cavityBase[i], cavityBase[j], cavityTop[j]); tri(cavityBase[i], cavityTop[j], cavityTop[i]);
    // outer wall (reverse winding)
    tri(outerBase[i], outerTop[j], outerBase[j]); tri(outerBase[i], outerTop[i], outerTop[j]);
    // top rim joining cavity to outer
    tri(cavityTop[i], cavityTop[j], outerTop[j]); tri(cavityTop[i], outerTop[j], outerTop[i]);
    // base flange lip on z=0
    tri(outerBase[i], outerBase[j], flange[j]); tri(outerBase[i], flange[j], flange[i]);
  }

  return { cavityBase, cavityTop, outerBase, outerTop, flange, positions: pos };
}
