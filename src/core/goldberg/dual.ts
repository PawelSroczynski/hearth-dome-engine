import { normalize, type Mesh, type Vec3 } from '../solids/base';

/**
 * Goldberg polyhedron as the POLAR (reciprocal) dual of a geodesic sphere:
 *   - each geodesic FACE  -> a Goldberg VERTEX = polar point of the face plane (n/d)
 *   - each geodesic VERTEX v -> a Goldberg FACE lying exactly on the tangent
 *     plane v·x = 1, so its corners are EXACTLY coplanar and EXACTLY shared with
 *     the neighbouring faces. This makes the surface a clean, watertight,
 *     planar-faced model (no per-face flattening / tape needed).
 *
 * Why coplanar: a geodesic triangle through vertex v has plane n·x = d with
 * n·v = d, so its polar point n/d satisfies (n/d)·v = 1 — i.e. it lies on the
 * tangent plane at v, together with every other polar point around v.
 */

export interface GoldbergFace {
  /** The originating geodesic vertex, on the unit sphere (face "center" & plane normal). */
  center: Vec3;
  /** Polygon corners (polar points), exactly coplanar on the tangent plane at center. */
  corners: Vec3[];
  sides: number;
}

/** Polar point of a geodesic triangle's plane: n / d, n outward unit normal, d = n·A. */
function polarPoint(m: Mesh, [a, b, c]: readonly [number, number, number]): Vec3 {
  const A = m.vertices[a], B = m.vertices[b], C = m.vertices[c];
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
  const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
  let n = normalize([uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]);
  let d = n[0] * A[0] + n[1] * A[1] + n[2] * A[2];
  if (d < 0) { n = [-n[0], -n[1], -n[2]]; d = -d; } // outward
  return [n[0] / d, n[1] / d, n[2] / d];
}

export function goldbergDual(mesh: Mesh): GoldbergFace[] {
  const nV = mesh.vertices.length;
  // incident faces per geodesic vertex
  const incident: number[][] = Array.from({ length: nV }, () => []);
  mesh.faces.forEach((f, fi) => {
    incident[f[0]].push(fi);
    incident[f[1]].push(fi);
    incident[f[2]].push(fi);
  });
  const centroids = mesh.faces.map((f) => polarPoint(mesh, f));

  // For a vertex v, the "other two" vertices of an incident face define an edge.
  // Walk faces by shared neighbor vertex to order them cyclically (umbrella).
  const others = (fi: number, v: number): [number, number] => {
    const [a, b, c] = mesh.faces[fi];
    const o = [a, b, c].filter((x) => x !== v);
    return [o[0], o[1]];
  };

  const result: GoldbergFace[] = [];
  for (let v = 0; v < nV; v++) {
    const fan = incident[v];
    if (fan.length < 3) continue; // degenerate (shouldn't happen on closed sphere)

    const ordered: number[] = [fan[0]];
    const used = new Set([fan[0]]);
    let [, endpoint] = others(fan[0], v); // follow this neighbor vertex
    while (ordered.length < fan.length) {
      const next = fan.find((fi) => {
        if (used.has(fi)) return false;
        const [o1, o2] = others(fi, v);
        return o1 === endpoint || o2 === endpoint;
      });
      if (next === undefined) break; // open fan; orientation calibration handles edges
      used.add(next);
      ordered.push(next);
      const [o1, o2] = others(next, v);
      endpoint = o1 === endpoint ? o2 : o1;
    }
    result.push({
      center: mesh.vertices[v],
      corners: ordered.map((fi) => centroids[fi]),
      sides: ordered.length,
    });
  }
  return result;
}

export function classifyFaces(faces: GoldbergFace[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const f of faces) counts[f.sides] = (counts[f.sides] ?? 0) + 1;
  return counts;
}
