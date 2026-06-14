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
