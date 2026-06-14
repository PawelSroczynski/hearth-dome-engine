import type { BaseSolid } from '../goldberg/formulas';

export type Vec3 = readonly [number, number, number];
export type Tri = readonly [number, number, number]; // indices into vertices

export interface Mesh {
  vertices: Vec3[];
  faces: Tri[]; // triangles
}

export function normalize([x, y, z]: Vec3): Vec3 {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

const PHI = (1 + Math.sqrt(5)) / 2;

/** Icosahedron — 12 vertices, 20 triangular faces. */
const ICOSA: Mesh = {
  vertices: [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ].map((v) => normalize(v as Vec3)),
  faces: [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ],
};

/** Octahedron — 6 vertices, 8 triangular faces. */
const OCTA: Mesh = {
  vertices: [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ],
  faces: [
    [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
    [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5],
  ],
};

/** Tetrahedron — 4 vertices, 4 triangular faces. */
const TETRA: Mesh = {
  vertices: [
    [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
  ].map((v) => normalize(v as Vec3)),
  faces: [
    [0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2],
  ],
};

export const BASE_MESH: Record<BaseSolid, Mesh> = { icosa: ICOSA, octa: OCTA, tetra: TETRA };
