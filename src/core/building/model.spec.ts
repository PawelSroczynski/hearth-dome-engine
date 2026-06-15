import { describe, it, expect } from 'vitest';
import { rectangleFootprint, wallSurfaces, footprintAreaMm2, type BuildingModel } from './model';
import { panelize, panelizeSurface } from '../wall/panelize';

const model: BuildingModel = {
  footprint: rectangleFootprint(6000, 4000),
  wallHeightMm: 2700,
  wallThicknessMm: 400,
  targetWidthMm: 800,
  openingsByEdge: [[{ x: 800, w: 1000, sillH: 0, headH: 2100 }], [], [], []],
  roof: { type: 'gable', pitchDeg: 30, ridgeAxis: 'x' },
  floor: { moduleWidthMm: 800, thicknessMm: 240, spanAxis: 'y' },
};

describe('panelizeSurface = panelize (regression)', () => {
  it('a wall and the equivalent surface panelize identically', () => {
    const wall = { lengthMm: 6000, heightMm: 2700, thicknessMm: 400, targetWidthMm: 800,
      openings: [{ x: 800, w: 1000, sillH: 0, headH: 2100 }] };
    const a = panelize(wall);
    const b = panelizeSurface({ widthMm: 6000, heightMm: 2700, thicknessMm: 400, targetWidthMm: 800, openings: wall.openings });
    expect(b).toEqual(a);
  });
});

describe('building model', () => {
  it('rectangle footprint yields 4 wall surfaces with edge-length widths', () => {
    const s = wallSurfaces(model);
    expect(s.map((x) => x.widthMm)).toEqual([6000, 4000, 6000, 4000]);
    expect(s.every((x) => x.heightMm === 2700)).toBe(true);
  });

  it('openings attach to the right edge', () => {
    const s = wallSurfaces(model);
    expect(s[0].openings.length).toBe(1);
    expect(s[1].openings.length).toBe(0);
  });

  it('footprint area = length × width for a rectangle', () => {
    expect(footprintAreaMm2(model.footprint)).toBe(6000 * 4000);
  });

  it('every wall surface panelizes (tiles to its own area)', () => {
    for (const surf of wallSurfaces(model)) {
      const area = panelizeSurface(surf).reduce((acc, p) => acc + p.w * p.h, 0);
      expect(area).toBeCloseTo(surf.widthMm * surf.heightMm, 3);
    }
  });
});
