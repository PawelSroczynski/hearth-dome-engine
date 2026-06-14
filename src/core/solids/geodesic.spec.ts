import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subdivideGeodesic, eulerCharacteristic } from './geodesic';
import { BASE_MESH } from './base';
import type { BaseSolid } from '../goldberg/formulas';

const ORACLE_DIR = join(__dirname, '../../../fixtures/oracle');
const num = (s?: string) => (s == null ? NaN : Number(s.replace(/[^0-9.]/g, '')));
const bases: BaseSolid[] = ['icosa', 'octa', 'tetra'];

interface Fixture {
  params: { symmetry: BaseSolid; pattern: string; frequency: number };
  outputs: Record<string, string>;
}
const geodesicFixtures = (): Fixture[] =>
  readdirSync(ORACLE_DIR)
    .filter((f) => f.includes('_geodesic_'))
    .map((f) => JSON.parse(readFileSync(join(ORACLE_DIR, f), 'utf8')) as Fixture);

describe('subdivideGeodesic — oracle-driven', () => {
  it('triangle face count = F0*f^2 matches v1 for every geodesic fixture', () => {
    for (const fx of geodesicFixtures()) {
      const m = subdivideGeodesic(fx.params.symmetry, fx.params.frequency);
      expect(m.faces.length, `${fx.params.symmetry} f${fx.params.frequency}`).toBe(
        num(fx.outputs['SPHERE FACES']),
      );
    }
  });
});

describe('subdivideGeodesic — invariants', () => {
  it('Euler characteristic is 2 (valid closed sphere) for all bases/frequencies', () => {
    fc.assert(
      fc.property(fc.constantFrom(...bases), fc.integer({ min: 1, max: 12 }), (b, f) => {
        expect(eulerCharacteristic(subdivideGeodesic(b, f))).toBe(2);
      }),
      { numRuns: 30 },
    );
  });

  it('face count equals F0*f^2; vertex count equals F0/2*f^2 + 2', () => {
    fc.assert(
      fc.property(fc.constantFrom(...bases), fc.integer({ min: 1, max: 12 }), (b, f) => {
        const F0 = BASE_MESH[b].faces.length;
        const m = subdivideGeodesic(b, f);
        expect(m.faces.length).toBe(F0 * f * f);
        expect(m.vertices.length).toBe((F0 / 2) * f * f + 2);
      }),
    );
  });

  it('all vertices lie on the unit sphere', () => {
    const m = subdivideGeodesic('icosa', 5);
    for (const [x, y, z] of m.vertices) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
    }
  });

  it('f=1 reproduces the base solid face count', () => {
    for (const b of bases) {
      expect(subdivideGeodesic(b, 1).faces.length).toBe(BASE_MESH[b].faces.length);
    }
  });

  it('rejects invalid frequency', () => {
    expect(() => subdivideGeodesic('icosa', 0)).toThrow();
    expect(() => subdivideGeodesic('octa', 2.5)).toThrow();
  });
});
