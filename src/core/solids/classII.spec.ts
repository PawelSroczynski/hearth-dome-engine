import { describe, it, expect } from 'vitest';
import { subdivideGoldbergCoxeter, eulerCharacteristic } from './geodesic';
import { goldbergDual } from '../goldberg/dual';
import { domeAxis } from '../goldberg/hemisphere';
import type { Vec3 } from './base';

const dot = (a: Vec3, b: Vec3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

describe('subdivideGoldbergCoxeter (m,n)', () => {
  it('Class I (f,0) matches plain Class-I face count F0*f^2', () => {
    const m = subdivideGoldbergCoxeter('icosa', 3, 0);
    expect(m.faces.length).toBe(20 * 9);
    expect(eulerCharacteristic(m)).toBe(2);
  });

  it('Class II (f,f) is a closed watertight sphere (Euler = 2), faces = F0*3f^2', () => {
    for (const f of [1, 2, 3]) {
      const m = subdivideGoldbergCoxeter('icosa', f, f);
      expect(eulerCharacteristic(m)).toBe(2);
      expect(m.faces.length).toBe(20 * 3 * f * f); // T = 3f^2 per face
    }
  });

  it('Goldberg dual of Class II still has exactly 12 pentagons', () => {
    const faces = goldbergDual(subdivideGoldbergCoxeter('icosa', 2, 2));
    expect(faces.filter((x) => x.sides === 5).length).toBe(12);
  });

  it('Class II at pentad: every visible (kept) pentagon is EDGE-down', () => {
    const faces = goldbergDual(subdivideGoldbergCoxeter('icosa', 2, 2));
    const up = domeAxis('icosa');
    let vDown = 0, eDown = 0;
    for (const f of faces) {
      if (f.sides !== 5) continue;
      const cen = f.corners.reduce((s, c): Vec3 => [s[0]+c[0], s[1]+c[1], s[2]+c[2]], [0,0,0]);
      if (dot([cen[0]/5, cen[1]/5, cen[2]/5], up) <= 1e-6) continue; // only kept (upper) pentagons
      const hs = f.corners.map((c) => dot(c, up));
      const min = Math.min(...hs);
      const lows = hs.filter((h) => Math.abs(h - min) < 1e-6).length;
      if (lows === 1) vDown++; else if (lows === 2) eDown++;
    }
    expect(vDown).toBe(0);
    expect(eDown).toBeGreaterThan(0);
  });
});
