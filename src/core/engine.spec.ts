import { describe, it, expect } from 'vitest';
import { computeOven, DEFAULT_PARAMS } from './engine';
import { inchRound, ft2Round } from './bricks/specs';

describe('computeOven — integration', () => {
  it('reproduces the v1 reference dome (icosa GP(4,0), default dims)', () => {
    const r = computeOven(DEFAULT_PARAMS);
    expect(r.total).toBe(91); // 71 full + 20 cut
    expect(r.full).toBe(71);
    expect(r.cut).toBe(20);
    expect(r.sphereFaces).toBe(162);
    expect(r.pentagons).toBe(12);
    expect(r.hexagons).toBe(150);
    expect(inchRound(r.specs.outerDiaMm)).toBe(48);
    expect(inchRound(r.specs.heightMm)).toBe(20);
    expect(ft2Round(r.specs.floorAreaM2)).toBeCloseTo(8.8, 1);
  });

  it('reacts to parameter changes', () => {
    const a = computeOven({ ...DEFAULT_PARAMS, frequency: 6 });
    expect(a.sphereFaces).toBe(362);
    const b = computeOven({ ...DEFAULT_PARAMS, thicknessMm: 150 });
    expect(inchRound(b.specs.outerDiaMm)).toBe(52);
  });
});
