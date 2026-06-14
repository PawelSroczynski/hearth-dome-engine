/**
 * Face-count formulas for a Goldberg polyhedron GP(f,0) over a base solid.
 *
 * A Goldberg polyhedron is the dual of a Class-I geodesic sphere. For a base
 * Platonic solid with V0 vertices and F0 triangular faces, subdivided at
 * frequency f, the Goldberg dual has:
 *   - corner faces (one per base vertex): V0   -> pentagons (icosa), squares (octa), triangles (tetra)
 *   - hexagon faces: (F0 / 2) * (f^2 - 1)
 *   - total = V0 + (F0/2)*(f^2 - 1)
 *
 * Verified against the v1 oracle across all bases and f = 1..8
 * (e.g. icosa GP(4,0): 12 + 10*(16-1) = 162 faces, 12 pentagons, 150 hexagons).
 */

export type BaseSolid = "icosa" | "octa" | "tetra";

interface BaseSpec {
  /** Base vertices -> number of corner (non-hex) faces in the Goldberg dual. */
  vertices: number;
  /** Base triangular faces. */
  faces: number;
  /** Sides of each corner face. */
  cornerSides: 5 | 4 | 3;
}

export const BASE: Record<BaseSolid, BaseSpec> = {
  icosa: { vertices: 12, faces: 20, cornerSides: 5 },
  octa: { vertices: 6, faces: 8, cornerSides: 4 },
  tetra: { vertices: 4, faces: 4, cornerSides: 3 },
};

export interface GoldbergCounts {
  cornerFaces: number; // pentagons / squares / triangles
  hexFaces: number;
  sphereFaces: number; // total faces on the full sphere
}

/** Goldberg face counts for the full sphere at frequency f (f >= 1). */
export function goldbergCounts(base: BaseSolid, f: number): GoldbergCounts {
  if (!Number.isInteger(f) || f < 1) throw new RangeError(`frequency must be integer >= 1, got ${f}`);
  const { vertices, faces } = BASE[base];
  const cornerFaces = vertices;
  const hexFaces = (faces / 2) * (f * f - 1);
  return { cornerFaces, hexFaces, sphereFaces: cornerFaces + hexFaces };
}
