import { describe, it, expect } from 'vitest';
import { subdivideGeodesic } from '../solids/geodesic';
import { goldbergDual } from '../goldberg/dual';
import { domeAxis, classifyFace } from '../goldberg/hemisphere';
import { innerCorner, outerCorner } from './brick';
import type { BaseSolid } from '../goldberg/formulas';
import type { Vec3 } from '../solids/base';

const spread = (pts: Vec3[]) => {
  let m = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++)
    m = Math.max(m, Math.hypot(pts[i][0]-pts[j][0], pts[i][1]-pts[j][1], pts[i][2]-pts[j][2]));
  return m;
};

const bases: BaseSolid[] = ['icosa', 'octa'];

describe('brick shell — watertight inner AND outer', () => {
  it('is a pure function of the corner (shared corners -> shared offsets)', () => {
    const c: Vec3 = [0.3, 0.9, 0.2];
    expect(outerCorner(c, 510, 100)).toEqual(outerCorner([...c] as Vec3, 510, 100));
  });

  it('shared inner corner yields IDENTICAL outer corner across all bricks (zero gap)', () => {
    for (const b of bases) {
      for (const f of [4, 5]) {
        const faces = goldbergDual(subdivideGeodesic(b, f));
        const up = domeAxis(b);
        const innerByKey = new Map<string, Vec3[]>();
        const outerByKey = new Map<string, Vec3[]>();
        for (const face of faces) {
          if (classifyFace(face, up) === 'below') continue;
          for (const corner of face.corners) {
            const key = `${corner[0].toFixed(6)},${corner[1].toFixed(6)},${corner[2].toFixed(6)}`;
            (innerByKey.get(key) ?? innerByKey.set(key, []).get(key)!).push(innerCorner(corner, 510));
            (outerByKey.get(key) ?? outerByKey.set(key, []).get(key)!).push(outerCorner(corner, 510, 100));
          }
        }
        for (const pts of innerByKey.values()) expect(spread(pts), `${b} f${f} inner`).toBe(0);
        for (const pts of outerByKey.values()) expect(spread(pts), `${b} f${f} outer`).toBe(0);
      }
    }
  });

  it('outer corner sits exactly `thickness` beyond the inner corner, radially', () => {
    const c: Vec3 = [0, 1.02, 0];
    const inner = innerCorner(c, 510);
    const outer = outerCorner(c, 510, 100);
    const gap = Math.hypot(outer[0]-inner[0], outer[1]-inner[1], outer[2]-inner[2]);
    expect(gap).toBeCloseTo(0.1, 9); // 100 mm = 0.1 m
  });
});
