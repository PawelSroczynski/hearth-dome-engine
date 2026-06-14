import type { Vec3 } from '../solids/base';

/**
 * Outer-shell corner for a brick corner.
 *
 * The inner corner is a shared polar-dual vertex. To keep the OUTER shell
 * watertight, every brick that shares this corner must produce the SAME outer
 * point — so the offset direction must depend only on the corner (radial),
 * never on the per-face normal. Radial offset also matches the original tool's
 * "outer surface follows the dome's spherical curvature".
 *
 * @param corner inner corner (polar point, unit-ish)
 * @param rMm    inner dome radius (mm)
 * @param tMm    brick thickness (mm)
 * @returns outer corner in scene units (metres)
 */
export function outerCorner(corner: Vec3, rMm: number, tMm: number): Vec3 {
  const r = rMm / 1000;
  const t = tMm / 1000;
  const m = Math.hypot(corner[0], corner[1], corner[2]) || 1;
  return [
    corner[0] * r + (corner[0] / m) * t,
    corner[1] * r + (corner[1] / m) * t,
    corner[2] * r + (corner[2] / m) * t,
  ];
}

export function innerCorner(corner: Vec3, rMm: number): Vec3 {
  const r = rMm / 1000;
  return [corner[0] * r, corner[1] * r, corner[2] * r];
}
