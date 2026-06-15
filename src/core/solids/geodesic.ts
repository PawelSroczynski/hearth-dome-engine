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

/**
 * General Goldberg–Coxeter subdivision GP(m,n) of a base solid, projected to the
 * unit sphere. n = 0 → Class I (same lattice as subdivideGeodesic); n = m → Class
 * II ("triacon", e.g. soccer-ball GP(1,1)); n ≠ m,0 → Class III (chiral).
 *
 * Ported from the acidome scheme: a barycentric (m,n) lattice tiles each base
 * triangle into S = m²+mn+n² sub-triangles. Lattice points that fall outside a
 * face (one negative barycentric coord) are re-expressed in the neighbouring
 * face's basis via the shared edge, so the result is watertight after merging
 * vertices by position.
 */
type Bary = readonly [number, number, number];

function gcScheme(M: number, N: number, S: number): Bary[] {
  const b0 = [-M - N, N, M], b1 = [-M, M + N, -N];
  const a2b = (x: number, y: number): Bary => {
    const r = [1, 0, 0];
    for (let k = 0; k < 3; k++) r[k] += (b0[k] * x) / S + (b1[k] * y) / S;
    return [r[0], r[1], r[2]];
  };
  const neg = (c: number) => c < -1e-9;
  const scheme: Bary[] = [];
  const tri = (A: number[], B: number[], C: number[]) => {
    const verts = [a2b(A[0], A[1]), a2b(B[0], B[1]), a2b(C[0], C[1])];
    const center = [0, 1, 2].map((k) => (verts[0][k] + verts[1][k] + verts[2][k]) / 3);
    // keep every sub-triangle whose centroid is inside the closed face (no
    // strictly-negative bary). Over-generates edge-straddling triangles for the
    // symmetric (m=m) case; duplicates are removed globally by vertex-set later.
    if (!center.some(neg)) for (const v of verts) scheme.push(v);
  };
  for (let y = -N; y < M; y++) {
    for (let x = 0; x < M + N; x++) {
      tri([x, y], [x, y + 1], [x + 1, y]);
      tri([x + 1, y + 1], [x + 1, y], [x, y + 1]);
    }
  }
  return scheme; // flat: groups of 3 barys = one triangle
}

export function subdivideGoldbergCoxeter(base: BaseSolid, m: number, n: number): Mesh {
  if (!Number.isInteger(m) || m < 1) throw new RangeError(`m must be integer >= 1, got ${m}`);
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be integer >= 0, got ${n}`);
  const src = BASE_MESH[base];
  const S = m * m + m * n + n * n;
  const scheme = gcScheme(m, n, S);

  // edge "a_b" -> the third vertices of the (two) incident base faces
  const edgeThird = new Map<string, number[]>();
  for (const f of src.faces) {
    for (const [a, b, c] of [[f[0], f[1], f[2]], [f[1], f[2], f[0]], [f[2], f[0], f[1]]] as const) {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      (edgeThird.get(key) ?? edgeThird.set(key, []).get(key)!).push(c);
    }
  }

  const vertices: Vec3[] = [];
  const faces: Tri[] = [];
  const seenTri = new Set<string>();
  const index = new Map<string, number>();
  const addVertex = (v: Vec3): number => {
    const u = normalize(v);
    const key = `${Math.round(u[0] * KEY_PRECISION)},${Math.round(u[1] * KEY_PRECISION)},${Math.round(u[2] * KEY_PRECISION)}`;
    const hit = index.get(key);
    if (hit !== undefined) return hit;
    const id = vertices.length;
    vertices.push(u);
    index.set(key, id);
    return id;
  };
  const comb = (P: Vec3[], w: number[]): Vec3 => [
    P[0][0] * w[0] + P[1][0] * w[1] + P[2][0] * w[2],
    P[0][1] * w[0] + P[1][1] * w[1] + P[2][1] * w[2],
    P[0][2] * w[0] + P[1][2] * w[1] + P[2][2] * w[2],
  ];

  for (const f of src.faces) {
    const P: Vec3[] = [src.vertices[f[0]], src.vertices[f[1]], src.vertices[f[2]]];
    for (let s = 0; s < scheme.length; s += 3) {
      const ids: number[] = [];
      for (let t = 0; t < 3; t++) {
        const bary = scheme[s + t];
        const one = [0, 1, 2].find((k) => Math.abs(bary[k] - 1) < 1e-9);
        if (one !== undefined) { ids.push(addVertex(P[one])); continue; }
        const k = [0, 1, 2].find((q) => bary[q] < -1e-9);
        if (k !== undefined) {
          const i = (k + 1) % 3, j = (k + 2) % 3;
          const gi = f[i], gj = f[j];
          const ekey = gi < gj ? `${gi}_${gj}` : `${gj}_${gi}`;
          const thirds = edgeThird.get(ekey) ?? [];
          const dIdx = thirds.find((tv) => tv !== f[k]);
          if (dIdx === undefined) throw new Error('GC: open edge on base solid');
          const D = src.vertices[dIdx];
          const ck = bary[k];
          // (Pi,Pj,Pk)·(ci,cj,ck) = (Pi,Pj,D)·(ci+ck, cj+ck, -ck)
          const pt: Vec3 = [
            P[i][0] * (bary[i] + ck) + P[j][0] * (bary[j] + ck) + D[0] * (-ck),
            P[i][1] * (bary[i] + ck) + P[j][1] * (bary[j] + ck) + D[1] * (-ck),
            P[i][2] * (bary[i] + ck) + P[j][2] * (bary[j] + ck) + D[2] * (-ck),
          ];
          ids.push(addVertex(pt));
          continue;
        }
        ids.push(addVertex(comb(P, [bary[0], bary[1], bary[2]])));
      }
      const key = [...ids].sort((a, b) => a - b).join('_');
      if (!seenTri.has(key) && ids[0] !== ids[1] && ids[1] !== ids[2] && ids[0] !== ids[2]) {
        seenTri.add(key);
        faces.push([ids[0], ids[1], ids[2]]);
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
