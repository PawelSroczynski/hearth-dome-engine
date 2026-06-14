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

  it('every face is EXACTLY planar: corners lie on the tangent plane center·x = 1', () => {
    for (const b of bases) {
      for (let f = 1; f <= 6; f++) {
        for (const face of dualFor(b, f)) {
          for (const c of face.corners) {
            const onPlane = c[0] * face.center[0] + c[1] * face.center[1] + c[2] * face.center[2];
            expect(onPlane).toBeCloseTo(1, 9); // perfectly coplanar by construction
          }
        }
      }
    }
  });

  it('shared corners are bit-exact across neighbouring faces (watertight, zero gap)', () => {
    const faces = dualFor('icosa', 4);
    const seen = new Map<string, [number, number, number]>();
    let maxSpread = 0;
    for (const face of faces) {
      for (const c of face.corners) {
        const key = `${c[0].toFixed(6)},${c[1].toFixed(6)},${c[2].toFixed(6)}`;
        const prev = seen.get(key);
        if (prev) maxSpread = Math.max(maxSpread, Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]));
        else seen.set(key, [c[0], c[1], c[2]]);
      }
    }
    expect(maxSpread).toBe(0); // same polar point reused — no per-face divergence
  });
});
