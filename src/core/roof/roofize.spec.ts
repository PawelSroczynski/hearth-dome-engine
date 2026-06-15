import { describe, it, expect } from 'vitest';
import { roofGeom, roofTiles, gableInfills, roofAreaMm2 } from './roofize';

describe('roofGeom', () => {
  it('gable: two slopes, rise = (D/2)·tan(pitch)', () => {
    const g = roofGeom(6000, 4000, 30, 'gable');
    expect(g.slopes.length).toBe(2);
    expect(g.riseMm).toBeCloseTo(2000 * Math.tan(Math.PI / 6), 3);
    expect(g.gableCount).toBe(2);
    expect(g.slopes[0].rafterMm).toBeCloseTo(Math.hypot(2000, g.riseMm), 3);
  });

  it('mono: one slope, rise = D·tan(pitch)', () => {
    const g = roofGeom(6000, 4000, 20, 'mono');
    expect(g.slopes.length).toBe(1);
    expect(g.riseMm).toBeCloseTo(4000 * Math.tan((20 * Math.PI) / 180), 3);
  });

  it('flat: no slopes', () => {
    expect(roofGeom(6000, 4000, 0, 'flat').slopes.length).toBe(0);
  });
});

describe('roofTiles + area', () => {
  it('gable tiles cover both slope rectangles exactly', () => {
    const g = roofGeom(6000, 4000, 30, 'gable');
    const tiles = roofTiles(6000, 4000, 30, 'gable', 800);
    const tileArea = tiles.reduce((s, p) => s + p.w * p.h, 0);
    const slopeArea = g.slopes.reduce((s, x) => s + x.widthMm * x.rafterMm, 0);
    expect(tiles.every((p) => p.type === 'roof')).toBe(true);
    expect(tileArea).toBeCloseTo(slopeArea, 2);
  });

  it('gable infills: two triangles of height = rise', () => {
    const g = roofGeom(6000, 4000, 30, 'gable');
    const inf = gableInfills(6000, 4000, 30, 'gable');
    expect(inf.length).toBe(2);
    expect(inf[0].h).toBeCloseTo(g.riseMm, 3);
  });

  it('roof area = slopes + ½·base·height·count', () => {
    const a = roofAreaMm2(6000, 4000, 30, 'gable');
    const g = roofGeom(6000, 4000, 30, 'gable');
    const expected = g.slopes.reduce((s, x) => s + x.widthMm * x.rafterMm, 0) + 0.5 * g.gableBaseMm * g.gableHeightMm * 2;
    expect(a).toBeCloseTo(expected, 2);
  });
});
