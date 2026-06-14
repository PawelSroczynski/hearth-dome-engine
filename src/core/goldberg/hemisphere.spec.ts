import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subdivideGeodesic } from '../solids/geodesic';
import { goldbergDual } from './dual';
import { domeAxis, domeCounts } from './hemisphere';
import type { BaseSolid } from './formulas';

const DOME_DIR = join(__dirname, '../../../fixtures/oracle/dome');
const num = (s?: string) => (s == null ? NaN : Number(s.replace(/[^0-9.]/g, '')));

interface DomeFixture {
  params: { symmetry: BaseSolid; frequency: number; arch: boolean };
  outputs: Record<string, string>;
}
const domeFixtures = (): DomeFixture[] =>
  readdirSync(DOME_DIR).map((f) => JSON.parse(readFileSync(join(DOME_DIR, f), 'utf8')) as DomeFixture);

describe('domeCounts — arch-off hemisphere oracle', () => {
  const fixtures = domeFixtures();

  it('has the arch-off dome oracle', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  // icosa + octa are centrally symmetric -> a centre cut is a true hemisphere.
  it('FULL/CUT/TOTAL match v1 (arch off) for icosa & octa, all frequencies', () => {
    for (const fx of fixtures.filter((f) => f.params.symmetry !== 'tetra')) {
      const faces = goldbergDual(subdivideGeodesic(fx.params.symmetry, fx.params.frequency));
      const { full, cut, total } = domeCounts(faces, domeAxis(fx.params.symmetry));
      const tag = `${fx.params.symmetry} f${fx.params.frequency}`;
      expect(full, `${tag} FULL`).toBe(num(fx.outputs['FULL BRICKS']));
      expect(cut, `${tag} CUT`).toBe(num(fx.outputs['CUT BRICKS']));
      expect(total, `${tag} TOTAL`).toBe(num(fx.outputs['TOTAL BRICKS']));
    }
  });

  // Tetrahedron is NOT centrally symmetric, so v1's "hemisphere" uses a
  // non-centre cut we have not yet calibrated. Tracked as a known gap.
  it.todo('calibrate tetra non-centre dome cut against v1');

  it('dome total never exceeds the full sphere face count', () => {
    for (const fx of fixtures) {
      const faces = goldbergDual(subdivideGeodesic(fx.params.symmetry, fx.params.frequency));
      expect(domeCounts(faces, domeAxis(fx.params.symmetry)).total).toBeLessThanOrEqual(faces.length);
    }
  });
});
