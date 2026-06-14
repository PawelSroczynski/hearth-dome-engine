import type { GoldbergFace } from '../goldberg/dual';
import type { Vec3 } from '../solids/base';

/**
 * A real brick is a FLAT panel. The dual's corners sit on the sphere and are
 * only near-coplanar, so we project them onto the face's best-fit plane to get
 * a genuinely planar polygon (matching the original tool's flat bricks).
 */
export interface FlatPanel {
  centroid: Vec3; // planar centroid (mean of corners)
  normal: Vec3; // outward unit normal of the panel plane
  corners: Vec3[]; // corners projected onto the plane (coplanar)
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function flattenFace(face: GoldbergFace): FlatPanel {
  const c = face.corners;
  const n = c.length;
  let cx = 0, cy = 0, cz = 0;
  for (const p of c) { cx += p[0]; cy += p[1]; cz += p[2]; }
  const centroid: Vec3 = [cx / n, cy / n, cz / n];

  // best-fit normal = sum of triangle-fan cross products (Newell-style)
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < n; i++) {
    const x = cross(sub(c[i], centroid), sub(c[(i + 1) % n], centroid));
    nx += x[0]; ny += x[1]; nz += x[2];
  }
  let normal = norm([nx, ny, nz]);
  // ensure outward (point away from sphere centre / toward face centre)
  if (dot(normal, face.center) < 0) normal = [-normal[0], -normal[1], -normal[2]];

  const corners = c.map((p): Vec3 => {
    const d = dot(sub(p, centroid), normal);
    return [p[0] - d * normal[0], p[1] - d * normal[1], p[2] - d * normal[2]];
  });
  return { centroid, normal, corners };
}
