import type { BaseSolid } from '../goldberg/formulas';
import { BASE_MESH, normalize, type Mesh, type Vec3, type Tri } from './base';

/**
 * Class-I geodesic subdivision: split every base triangle into f^2 smaller
 * triangles, project all points onto the unit sphere, and merge vertices
 * shared between triangles.
 *
 * Resulting counts (verified vs v1 oracle "geodesic" pattern):
 *   faces    = F0 * f^2
 *   vertices = F0/2 * f^2 + 2     (Euler: V - E + F = 2, E = 3F/2)
 */

const KEY_PRECISION = 1e6; // round coords to merge shared vertices

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function subdivideGeodesic(base: BaseSolid, f: number): Mesh {
  if (!Number.isInteger(f) || f < 1) throw new RangeError(`frequency must be integer >= 1, got ${f}`);
  const src = BASE_MESH[base];
  const vertices: Vec3[] = [];
  const faces: Tri[] = [];
  const index = new Map<string, number>();

  const addVertex = (v: Vec3): number => {
    const n = normalize(v);
    const key = `${Math.round(n[0] * KEY_PRECISION)},${Math.round(n[1] * KEY_PRECISION)},${Math.round(n[2] * KEY_PRECISION)}`;
    const hit = index.get(key);
    if (hit !== undefined) return hit;
    const id = vertices.length;
    vertices.push(n);
    index.set(key, id);
    return id;
  };

  for (const [ia, ib, ic] of src.faces) {
    const A = src.vertices[ia], B = src.vertices[ib], C = src.vertices[ic];
    // Triangular barycentric grid: row i (i = 0..f) holds i+1 points,
    // from A (apex, i=0) down to the B–C edge (i=f). f^2 small triangles total.
    const grid: number[][] = [];
    for (let i = 0; i <= f; i++) {
      const left = lerp(A, B, i / f);
      const right = lerp(A, C, i / f);
      const row: number[] = [];
      for (let j = 0; j <= i; j++) {
        const p = i === 0 ? A : lerp(left, right, j / i);
        row.push(addVertex(p));
      }
      grid.push(row);
    }
    // Each band between row i and i+1 has (i+1) upward + i downward triangles.
    for (let i = 0; i < f; i++) {
      for (let j = 0; j <= i; j++) {
        faces.push([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1]]); // up
      }
      for (let j = 0; j < i; j++) {
        faces.push([grid[i][j], grid[i + 1][j + 1], grid[i][j + 1]]); // down
      }
    }
  }
  return { vertices, faces };
}

export function eulerCharacteristic(m: Mesh): number {
  const edges = new Set<string>();
  for (const [a, b, c] of m.faces) {
    for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
      edges.add(u < v ? `${u}_${v}` : `${v}_${u}`);
    }
  }
  return m.vertices.length - edges.size + m.faces.length;
}
