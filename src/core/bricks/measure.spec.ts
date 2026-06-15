import { describe, it, expect } from 'vitest';
import { subdivideGeodesic } from '../solids/geodesic';
import { goldbergDual } from '../goldberg/dual';
import { domeAxis } from '../goldberg/hemisphere';
import { fullBrickShapes } from './schedule';
import { flattenFace } from './panel';
import { cornerAnglesDeg, edgeLengths } from './measure';
import type { Vec3 } from '../solids/base';

describe('cornerAnglesDeg', () => {
  it('a unit square has four 90° corners', () => {
    const sq: Vec3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
    expect(cornerAnglesDeg(sq)).toEqual([90, 90, 90, 90]);
  });

  it('interior angles of each brick sum to (n-2)*180', () => {
    const faces = goldbergDual(subdivideGeodesic('icosa', 4));
    for (const s of fullBrickShapes(faces, domeAxis('icosa'), 510)) {
      const ring = flattenFace(s.face).corners;
      const sum = cornerAnglesDeg(ring).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo((s.sides - 2) * 180, 4);
    }
  });

  it('pentagon corners are all ~108°', () => {
    const faces = goldbergDual(subdivideGeodesic('icosa', 4));
    const pent = fullBrickShapes(faces, domeAxis('icosa'), 510).find((s) => s.sides === 5)!;
    for (const a of cornerAnglesDeg(flattenFace(pent.face).corners)) expect(a).toBeCloseTo(108, 0);
  });
});

describe('edgeLengths', () => {
  it('unit square edges are all length 1', () => {
    const sq: Vec3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
    expect(edgeLengths(sq)).toEqual([1, 1, 1, 1]);
  });
});
