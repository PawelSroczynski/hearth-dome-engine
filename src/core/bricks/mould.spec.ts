import { describe, it, expect } from 'vitest';
import { subdivideGeodesic } from '../solids/geodesic';
import { goldbergDual } from '../goldberg/dual';
import { domeAxis } from '../goldberg/hemisphere';
import { fullBrickShapes } from './schedule';
import { mouldShell, type MouldParams } from './mould';

const faces = goldbergDual(subdivideGeodesic('icosa', 4));
const up = domeAxis('icosa');
const shapes = fullBrickShapes(faces, up, 510);
const pent = shapes.find((s) => s.sides === 5)!;
const P: MouldParams = { innerRMm: 510, thicknessMm: 100, wallMm: 8, flangeMm: 6 };
const hyp = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('mouldShell', () => {
  const m = mouldShell(pent.face, P);

  it('base rim is flat on z=0 (cavity floor + outer base + flange)', () => {
    for (const ring of [m.cavityBase, m.outerBase, m.flange])
      for (const q of ring) expect(Math.abs(q[2])).toBeLessThan(1e-9);
  });

  it('wall has constant thickness (cavity -> outer)', () => {
    m.cavityBase.forEach((c, i) => expect(hyp(c, m.outerBase[i])).toBeCloseTo(P.wallMm, 6));
  });

  it('flange extends outward by flangeMm', () => {
    m.outerBase.forEach((c, i) => expect(hyp(c, m.flange[i])).toBeCloseTo(P.flangeMm, 6));
  });

  it('brick flares upward — cavity top sits above the floor', () => {
    expect(Math.max(...m.cavityTop.map((q) => q[2]))).toBeGreaterThan(0);
  });

  it('emits a triangle soup (8 quads per edge = 8*2 tris)', () => {
    expect(m.positions.length % 9).toBe(0);
    expect(m.positions.length).toBe(pent.sides * 8 * 9);
  });

  it('xy extent scales linearly with innerR', () => {
    const a = mouldShell(pent.face, { ...P, innerRMm: 300 });
    const b = mouldShell(pent.face, { ...P, innerRMm: 600 });
    const ext = (m2: ReturnType<typeof mouldShell>) =>
      Math.max(...m2.cavityBase.map((q) => Math.hypot(q[0], q[1])));
    // wall/flange are absolute offsets, so compare the cavity ring only
    expect(ext(b) / ext(a)).toBeCloseTo(2, 1);
  });
});
