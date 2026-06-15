import type { Vec3 } from '../solids/base';

/**
 * Interior angles (degrees) at each corner of a (near-)planar polygon ring,
 * in corner order. For a simple n-gon they sum to (n-2)*180.
 */
export function cornerAnglesDeg(ring: Vec3[]): number[] {
  const n = ring.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = ring[(i - 1 + n) % n], c = ring[i], q = ring[(i + 1) % n];
    const a: Vec3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    const b: Vec3 = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const la = Math.hypot(a[0], a[1], a[2]) || 1;
    const lb = Math.hypot(b[0], b[1], b[2]) || 1;
    out.push((Math.acos(Math.max(-1, Math.min(1, dot / (la * lb)))) * 180) / Math.PI);
  }
  return out;
}

/** Edge lengths (same units as ring) in corner order: edge i = ring[i]->ring[i+1]. */
export function edgeLengths(ring: Vec3[]): number[] {
  const n = ring.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    out.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  return out;
}
