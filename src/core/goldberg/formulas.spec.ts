import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { goldbergCounts, BASE, type BaseSolid } from './formulas';

const ORACLE_DIR = join(__dirname, '../../../fixtures/oracle');

interface Fixture {
  params: { symmetry: BaseSolid; pattern: string; frequency: number };
  outputs: Record<string, string>;
}

function loadGoldbergFixtures(): Fixture[] {
  return readdirSync(ORACLE_DIR)
    .filter((f) => f.includes('_goldberg_'))
    .map((f) => JSON.parse(readFileSync(join(ORACLE_DIR, f), 'utf8')) as Fixture);
}

const num = (s?: string) => (s == null ? NaN : Number(s.replace(/[^0-9.]/g, '')));

describe('goldbergCounts — oracle-driven (v1 golden fixtures)', () => {
  const fixtures = loadGoldbergFixtures();

  it('has a usable oracle dataset', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  it('sphere face count matches v1 for every goldberg fixture', () => {
    for (const fx of fixtures) {
      const expected = num(fx.outputs['SPHERE FACES']);
      const got = goldbergCounts(fx.params.symmetry, fx.params.frequency).sphereFaces;
      expect(got, `${fx.params.symmetry} f${fx.params.frequency}`).toBe(expected);
    }
  });

  it('hexagon count matches v1 where reported', () => {
    for (const fx of fixtures) {
      if (fx.outputs['HEXAGONS'] == null) continue;
      const got = goldbergCounts(fx.params.symmetry, fx.params.frequency).hexFaces;
      expect(got, `${fx.params.symmetry} f${fx.params.frequency}`).toBe(num(fx.outputs['HEXAGONS']));
    }
  });

  it('icosa pentagon count is always 12 (Goldberg invariant)', () => {
    for (const fx of fixtures) {
      if (fx.params.symmetry !== 'icosa' || fx.outputs['PENTAGONS'] == null) continue;
      expect(num(fx.outputs['PENTAGONS'])).toBe(12);
      expect(goldbergCounts('icosa', fx.params.frequency).cornerFaces).toBe(12);
    }
  });
});

describe('goldbergCounts — invariants (property-based)', () => {
  const bases: BaseSolid[] = ['icosa', 'octa', 'tetra'];

  it('corner faces equal base vertex count, independent of frequency', () => {
    fc.assert(
      fc.property(fc.constantFrom(...bases), fc.integer({ min: 1, max: 50 }), (b, f) => {
        expect(goldbergCounts(b, f).cornerFaces).toBe(BASE[b].vertices);
      }),
    );
  });

  it('sphere faces grow strictly with frequency', () => {
    fc.assert(
      fc.property(fc.constantFrom(...bases), fc.integer({ min: 1, max: 49 }), (b, f) => {
        expect(goldbergCounts(b, f + 1).sphereFaces).toBeGreaterThan(goldbergCounts(b, f).sphereFaces);
      }),
    );
  });

  it('rejects invalid frequency', () => {
    expect(() => goldbergCounts('icosa', 0)).toThrow();
    expect(() => goldbergCounts('icosa', 1.5)).toThrow();
  });
});
