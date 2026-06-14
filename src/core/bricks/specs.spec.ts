import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { domeSpecs, inchRound, ft2Round, ft3Round, mmToIn } from './specs';

const DIR = join(__dirname, '../../../fixtures/oracle/specs');
const num = (s?: string) => (s == null ? NaN : Number((s.match(/-?\d+(\.\d+)?/) ?? ['NaN'])[0]));

interface SpecFixture {
  params: { interior_mm: number; thickness_mm: number; angle: number; mortar_mm: number };
  outputs: Record<string, string>;
}
const fixtures = (): SpecFixture[] =>
  readdirSync(DIR).map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as SpecFixture);

describe('domeSpecs — oracle (v1 specs sweep)', () => {
  const fx = fixtures();

  it('has the specs oracle', () => expect(fx.length).toBeGreaterThanOrEqual(20));

  it('outer Ø, inner Ø, wall, footprint Ø (inches) match v1', () => {
    for (const f of fx) {
      const s = domeSpecs({ interiorMm: f.params.interior_mm, thicknessMm: f.params.thickness_mm, cutAngleDeg: f.params.angle });
      const tag = JSON.stringify(f.params);
      expect(inchRound(s.outerDiaMm), `OUTER ${tag}`).toBe(num(f.outputs['OUTER Ø']));
      expect(inchRound(s.innerDiaMm), `INNER ${tag}`).toBe(num(f.outputs['INNER Ø']));
      expect(inchRound(s.wallMm), `WALL ${tag}`).toBe(num(f.outputs['WALL THICKNESS']));
      expect(inchRound(s.footprintDiaMm), `FOOTPRINT ${tag}`).toBe(num(f.outputs['FOOTPRINT Ø']));
    }
  });

  it('dome height (inches) matches v1 across cut angles', () => {
    for (const f of fx) {
      const s = domeSpecs({ interiorMm: f.params.interior_mm, thicknessMm: f.params.thickness_mm, cutAngleDeg: f.params.angle });
      // allow ±1" for rounding-boundary cases (e.g. exact .5)
      expect(Math.abs(inchRound(s.heightMm) - num(f.outputs['DOME HEIGHT'])), JSON.stringify(f.params)).toBeLessThanOrEqual(1);
    }
  });

  it('floor area (ft²) and cook volume (ft³) match v1', () => {
    for (const f of fx) {
      const s = domeSpecs({ interiorMm: f.params.interior_mm, thicknessMm: f.params.thickness_mm, cutAngleDeg: f.params.angle });
      expect(Math.abs(ft2Round(s.floorAreaM2) - num(f.outputs['FLOOR AREA'])), `AREA ${JSON.stringify(f.params)}`).toBeLessThanOrEqual(0.15);
      expect(Math.abs(ft3Round(s.cookVolumeM3) - num(f.outputs['COOK VOLUME'])), `VOL ${JSON.stringify(f.params)}`).toBeLessThanOrEqual(0.2);
    }
  });

  it('floor area is independent of cut angle (max floor)', () => {
    const base = { interiorMm: 1020, thicknessMm: 100 };
    const a40 = domeSpecs({ ...base, cutAngleDeg: 40 }).floorAreaM2;
    const a90 = domeSpecs({ ...base, cutAngleDeg: 90 }).floorAreaM2;
    expect(a40).toBeCloseTo(a90, 9);
  });

  it('hemisphere height equals inner radius', () => {
    const s = domeSpecs({ interiorMm: 1000, thicknessMm: 100, cutAngleDeg: 90 });
    expect(mmToIn(s.heightMm)).toBeCloseTo(mmToIn(500), 6);
  });
});
