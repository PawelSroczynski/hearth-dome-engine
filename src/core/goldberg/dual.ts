import { normalize, type Mesh, type Vec3 } from '../solids/base';

/**
 * Goldberg polyhedron as the dual of a geodesic (triangulated) sphere:
 *   - each geodesic FACE  -> a Goldberg VERTEX (face centroid on the sphere)
 *   - each geodesic VERTEX -> a Goldberg FACE (polygon of surrounding centroids)
 * A geodesic vertex of degree d yields a d-sided Goldberg face:
 * degree 6 -> hexagon, degree 5/4/3 -> pentagon/square/triangle (the corners).
 */

export interface GoldbergFace {
  /** The originating geodesic vertex, on the unit sphere (face "center"). */
  center: Vec3;
  /** Polygon corners (geodesic face centroids), ordered around the center. */
  corners: Vec3[];
  sides: number;
}

function centroid(m: Mesh, [a, b, c]: readonly [number, number, number]): Vec3 {
  const A = m.vertices[a], B = m.vertices[b], C = m.vertices[c];
  return normalize([(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3]);
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
  const centroids = mesh.faces.map((f) => centroid(mesh, f));

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
