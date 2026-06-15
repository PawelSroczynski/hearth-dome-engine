import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subdivideGeodesic } from '../solids/geodesic';
import { goldbergDual } from '../goldberg/dual';
import { domeAxis } from '../goldberg/hemisphere';
import { fullBrickShapes } from './schedule';
import type { BaseSolid } from '../goldberg/formulas';

const DIR = join(__dirname, '../../../fixtures/oracle/schedule');

interface OracleBrick { label: string; sides: number; count: number; source?: string }
interface SchedFixture { params: { symmetry: BaseSolid; frequency: number }; bricks: OracleBrick[] }
const fixtures = (): SchedFixture[] =>
  readdirSync(DIR).map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as SchedFixture);

// full bricks = oracle entries without a "clipped" source (those are CUT bricks)
const fullOnly = (bricks: OracleBrick[]) => bricks.filter((b) => !b.source);

describe('fullBrickShapes — unique-shape clustering vs v1 counts', () => {
  for (const fx of fixtures()) {
    it(`${fx.params.symmetry} f${fx.params.frequency}: full-brick shapes & counts match`, () => {
      const faces = goldbergDual(subdivideGeodesic(fx.params.symmetry, fx.params.frequency));
      const mine = fullBrickShapes(faces, domeAxis(fx.params.symmetry));
      const oracle = fullOnly(fx.bricks);

      // same set of {sides -> sorted counts} (labels A/B/C ordering can differ, the multiset must match)
      const mineCounts = mine.map((b) => b.count).sort((a, b) => a - b);
      const oracleCounts = oracle.map((b) => b.count).sort((a, b) => a - b);
      expect(mineCounts).toEqual(oracleCounts);

      // total full bricks match
      const mineTotal = mine.reduce((s, b) => s + b.count, 0);
      const oracleTotal = oracle.reduce((s, b) => s + b.count, 0);
      expect(mineTotal).toBe(oracleTotal);

      // number of distinct full shapes matches
      expect(mine.length).toBe(oracle.length);
    });
  }

  it('icosa GP(4,0): pentagon present with count 6', () => {
    const faces = goldbergDual(subdivideGeodesic('icosa', 4));
    const shapes = fullBrickShapes(faces, domeAxis('icosa'));
    const pent = shapes.find((s) => s.sides === 5);
    expect(pent?.count).toBe(6);
  });
});

describe('fullBrickShapes — real metric dimensions (mm)', () => {
  const faces = goldbergDual(subdivideGeodesic('icosa', 4));
  const up = domeAxis('icosa');

  it('edgeMm / spanMm are the unit chords scaled by innerR', () => {
    const scale = 510; // innerR for interior Ø 1020 mm
    for (const s of fullBrickShapes(faces, up, scale)) {
      expect(s.edgeMm.length).toBe(s.edgeUnits.length);
      s.edgeUnits.forEach((u, i) => expect(s.edgeMm[i]).toBeCloseTo(u * scale, 6));
      expect(s.spanMm).toBeCloseTo(s.spanUnit * scale, 6);
    }
  });

  it('metric dimensions scale linearly with innerR', () => {
    const a = fullBrickShapes(faces, up, 300);
    const b = fullBrickShapes(faces, up, 600);
    a.forEach((sa, i) => {
      expect(b[i].spanMm).toBeCloseTo(sa.spanMm * 2, 6);
      sa.edgeMm.forEach((e, j) => expect(b[i].edgeMm[j]).toBeCloseTo(e * 2, 6));
    });
  });

  it('default dome pentagon has equal edges within a sane mm range', () => {
    const pent = fullBrickShapes(faces, up, 510).find((s) => s.sides === 5)!;
    const min = Math.min(...pent.edgeMm), max = Math.max(...pent.edgeMm);
    expect(max - min).toBeLessThan(1e-6); // regular pentagon
    expect(min).toBeGreaterThan(0);
    expect(max).toBeLessThan(510); // an edge cannot exceed the inner radius
  });
});
