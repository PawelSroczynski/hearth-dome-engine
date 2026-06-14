import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subdivideGeodesic } from '../solids/geodesic';
import { goldbergDual, classifyFaces } from './dual';
import { goldbergCounts, type BaseSolid } from './formulas';

const ORACLE_DIR = join(__dirname, '../../../fixtures/oracle');
const num = (s?: string) => (s == null ? NaN : Number(s.replace(/[^0-9.]/g, '')));
const bases: BaseSolid[] = ['icosa', 'octa', 'tetra'];

interface Fixture {
  params: { symmetry: BaseSolid; pattern: string; frequency: number };
  outputs: Record<string, string>;
}
const goldbergFixtures = (): Fixture[] =>
  readdirSync(ORACLE_DIR)
    .filter((f) => f.includes('_goldberg_'))
    .map((f) => JSON.parse(readFileSync(join(ORACLE_DIR, f), 'utf8')) as Fixture);

const dualFor = (b: BaseSolid, f: number) => goldbergDual(subdivideGeodesic(b, f));

describe('goldbergDual — face composition matches formulas & oracle', () => {
  it('total dual faces equal sphere face formula for all bases/frequencies', () => {
    fc.assert(
      fc.property(fc.constantFrom(...bases), fc.integer({ min: 1, max: 10 }), (b, f) => {
        expect(dualFor(b, f).length).toBe(goldbergCounts(b, f).sphereFaces);
      }),
    );
  });

  it('hexagon + corner counts match the derived formula', () => {
    for (const b of bases) {
      for (let f = 1; f <= 8; f++) {
        const counts = classifyFaces(dualFor(b, f));
        const { cornerFaces, hexFaces } = goldbergCounts(b, f);
        const corner = { icosa: 5, octa: 4, tetra: 3 }[b];
        expect(counts[corner] ?? 0, `${b} f${f} corners`).toBe(cornerFaces);
        expect(counts[6] ?? 0, `${b} f${f} hex`).toBe(hexFaces);
      }
    }
  });

  it('icosa: exactly 12 pentagons and 150 hexagons at GP(4,0) (oracle)', () => {
    const counts = classifyFaces(dualFor('icosa', 4));
    expect(counts[5]).toBe(12);
    expect(counts[6]).toBe(150);
  });

  it('matches oracle PENTAGONS/HEXAGONS where reported', () => {
    for (const fx of goldbergFixtures()) {
      const counts = classifyFaces(dualFor(fx.params.symmetry, fx.params.frequency));
      if (fx.outputs['PENTAGONS'] != null) expect(counts[5] ?? 0).toBe(num(fx.outputs['PENTAGONS']));
      if (fx.outputs['HEXAGONS'] != null) expect(counts[6] ?? 0).toBe(num(fx.outputs['HEXAGONS']));
    }
  });

  it('every corner lies on the unit sphere and faces are non-degenerate', () => {
    for (const face of dualFor('icosa', 3)) {
      expect(face.sides).toBeGreaterThanOrEqual(5);
      for (const c of face.corners) expect(Math.hypot(...c)).toBeCloseTo(1, 9);
    }
  });
});
