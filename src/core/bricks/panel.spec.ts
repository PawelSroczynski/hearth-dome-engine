import { describe, it, expect } from 'vitest';
import { subdivideGeodesic } from '../solids/geodesic';
import { goldbergDual } from '../goldberg/dual';
import { flattenFace } from './panel';
import type { Vec3 } from '../solids/base';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

describe('flattenFace — bricks are genuinely planar', () => {
  it('all projected corners lie in the panel plane (coplanar) for every dome face', () => {
    const faces = goldbergDual(subdivideGeodesic('icosa', 5));
    for (const f of faces) {
      const p = flattenFace(f);
      for (const c of p.corners) {
        // signed distance to plane must be ~0
        expect(Math.abs(dot(sub(c, p.centroid), p.normal))).toBeLessThan(1e-9);
      }
    }
  });

  it('normal points outward (same hemisphere as the face centre)', () => {
    const faces = goldbergDual(subdivideGeodesic('octa', 4));
    for (const f of faces) {
      const p = flattenFace(f);
      expect(dot(p.normal, f.center)).toBeGreaterThan(0);
    }
  });

  it('projection moves corners only slightly (faces were near-planar)', () => {
    const faces = goldbergDual(subdivideGeodesic('icosa', 4));
    let maxOffPlane = 0;
    for (const f of faces) {
      const p = flattenFace(f);
      // order-independent: perpendicular distance of each ORIGINAL corner to the plane
      for (const orig of f.corners) {
        maxOffPlane = Math.max(maxOffPlane, Math.abs(dot(sub(orig, p.centroid), p.normal)));
      }
    }
    expect(maxOffPlane).toBeLessThan(0.05); // faces were near-planar (< 5% of unit radius)
  });
});
