import { describe, it, expect } from 'vitest';
import { floorize } from './floorize';
import { wallBom } from '../wall/panelize';

const area = (ps: { w: number; h: number }[]) => ps.reduce((s, p) => s + p.w * p.h, 0);

describe('floorize', () => {
  it('cassettes tile the footprint exactly (y-span)', () => {
    const c = floorize(6000, 4000, 800, 'y');
    expect(c.every((p) => p.type === 'cassette')).toBe(true);
    expect(area(c)).toBeCloseTo(6000 * 4000, 3);
  });

  it('cassettes tile the footprint exactly (x-span)', () => {
    expect(area(floorize(6000, 4000, 800, 'x'))).toBeCloseTo(6000 * 4000, 3);
  });

  it('module width is respected (strip width ≤ module ≤ 1200)', () => {
    const c = floorize(6000, 4000, 800, 'y'); // strips across x of ≤800
    expect(c.every((p) => p.w <= 800 + 0.5)).toBe(true);
  });

  it('long span splits into ≤ 6000 mm cassettes', () => {
    const c = floorize(3000, 9000, 800, 'y'); // depth 9000 → 2 segments of 4500
    expect(c.every((p) => p.h <= 6000 + 0.5)).toBe(true);
    expect(c.some((p) => Math.abs(p.h - 4500) < 1)).toBe(true);
  });

  it('groups into a cassette BOM with typological labels', () => {
    const bom = wallBom(floorize(6000, 4000, 800, 'y'));
    expect(bom.every((r) => r.type === 'cassette')).toBe(true);
    expect(bom[0].label.startsWith('Cassette')).toBe(true);
  });
});
