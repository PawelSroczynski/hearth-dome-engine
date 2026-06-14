import { BASE_MESH, normalize, type Vec3 } from '../solids/base';
import type { BaseSolid } from './formulas';
import type { GoldbergFace } from './dual';

/**
 * Cut a Goldberg sphere into a dome with a horizontal plane through the centre.
 * The dome's "up" axis runs through a base-solid corner vertex (a 5/4/3-fold
 * symmetry axis), giving a corner face at the apex — matching v1's orientation.
 *
 *   - FULL brick: every corner on/above the plane (does not cross)
 *   - CUT brick:  corners straddle the plane (clipped into a partial shape)
 *   - dropped:    entirely below
 *
 * Verified vs the arch-off v1 oracle (e.g. icosa GP(4,0): 71 full + 20 cut = 91).
 */

export type Classification = 'full' | 'cut' | 'below';
const EPS = 1e-9;

/**
 * Apex axis = first corner vertex of the base solid (all are symmetry-equivalent).
 * Exact vs v1 for icosa & octa (centrally symmetric -> true hemisphere at a centre cut).
 * Tetra is not centrally symmetric; v1's tetra dome uses a non-centre cut not yet calibrated.
 */
export function domeAxis(base: BaseSolid): Vec3 {
  return normalize(BASE_MESH[base].vertices[0]);
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function classifyFace(face: GoldbergFace, up: Vec3, cut = 0): Classification {
  let min = Infinity, max = -Infinity;
  for (const c of face.corners) {
    const h = dot(c, up);
    if (h < min) min = h;
    if (h > max) max = h;
  }
  if (min >= cut - EPS) return 'full';
  if (max > cut + EPS) return 'cut';
  return 'below';
}

export interface DomeCounts {
  full: number;
  cut: number;
  total: number; // bricks in the dome = full + cut
}

export function domeCounts(faces: GoldbergFace[], up: Vec3, cut = 0): DomeCounts {
  let full = 0, cutb = 0;
  for (const f of faces) {
    const k = classifyFace(f, up, cut);
    if (k === 'full') full++;
    else if (k === 'cut') cutb++;
  }
  return { full, cut: cutb, total: full + cutb };
}
