import { describe, it, expect } from 'vitest';
import { panelize, wallBom, type WallSpec } from './panelize';

const base: WallSpec = {
  lengthMm: 6000, heightMm: 2700, thicknessMm: 400, targetWidthMm: 800, openings: [],
};
const area = (ps: { w: number; h: number }[]) => ps.reduce((s, p) => s + p.w * p.h, 0);

describe('panelize', () => {
  it('blank wall: only standard panels, each ≤ 850 mm wide, tiling the whole wall', () => {
    const ps = panelize(base);
    expect(ps.every((p) => p.type === 'standard')).toBe(true);
    expect(ps.every((p) => p.w <= 850 + 0.5)).toBe(true);
    expect(area(ps)).toBeCloseTo(6000 * 2700, 3);
  });

  it('panels + voids tile the wall exactly with a door and a window', () => {
    const ps = panelize({
      ...base,
      openings: [
        { x: 800, w: 1000, sillH: 0, headH: 2100 },    // door
        { x: 3500, w: 1500, sillH: 900, headH: 2100 }, // window
      ],
    });
    expect(area(ps)).toBeCloseTo(6000 * 2700, 3);
  });

  it('a window yields a void, a sill below and a lintel above (same x/width)', () => {
    const ps = panelize({ ...base, openings: [{ x: 3500, w: 1500, sillH: 900, headH: 2100 }] });
    const win = ps.filter((p) => p.x === 3500 && p.w === 1500);
    const types = win.map((p) => p.type).sort();
    expect(types).toEqual(['lintel', 'sill', 'void']);
    expect(win.find((p) => p.type === 'sill')!.h).toBe(900);
    expect(win.find((p) => p.type === 'void')!.h).toBe(1200);
    expect(win.find((p) => p.type === 'lintel')!.h).toBe(600);
  });

  it('a door has no sill (sillH = 0)', () => {
    const ps = panelize({ ...base, openings: [{ x: 800, w: 1000, sillH: 0, headH: 2100 }] });
    const door = ps.filter((p) => p.x === 800 && p.w === 1000);
    expect(door.some((p) => p.type === 'sill')).toBe(false);
    expect(door.some((p) => p.type === 'void')).toBe(true);
  });

  it('flags out-of-range panels (lintel taller than 850 mm)', () => {
    const ps = panelize({ ...base, openings: [{ x: 2000, w: 1500, sillH: 0, headH: 1000 }] });
    const lintel = ps.find((p) => p.type === 'lintel')!;
    expect(lintel.h).toBe(1700); // 2700 - 1000
    expect(lintel.ok).toBe(false); // > 850 max
  });

  it('BOM groups identical panels and excludes voids', () => {
    const bom = wallBom(panelize(base));
    expect(bom.every((r) => r.type !== 'void')).toBe(true);
    expect(bom.reduce((s, r) => s + r.count, 0)).toBe(panelize(base).length);
  });
});
