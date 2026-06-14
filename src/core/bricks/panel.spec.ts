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
    let maxShift = 0;
    for (const f of faces) {
      const p = flattenFace(f);
      f.corners.forEach((orig, i) => {
        maxShift = Math.max(maxShift, Math.hypot(
          orig[0] - p.corners[i][0], orig[1] - p.corners[i][1], orig[2] - p.corners[i][2]));
      });
    }
    expect(maxShift).toBeLessThan(0.05); // < 5% of unit radius
  });
});
