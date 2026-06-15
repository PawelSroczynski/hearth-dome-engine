import { describe, it, expect } from 'vitest';
import { computeOven, DEFAULT_PARAMS } from '../core/engine';
import { brickToSTL, bricksToZip, mouldToSTL, mouldsToZip } from './exporters';

const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);

describe('brickToSTL', () => {
  it('emits a valid ASCII STL for a single brick', () => {
    const r = computeOven(DEFAULT_PARAMS);
    const stl = brickToSTL(r.shapes[0].face, r.specs.innerDiaMm, r.specs.wallMm);
    expect(stl).toMatch(/^solid/);
    expect(stl).toContain('facet normal');
    expect(stl.trimEnd()).toMatch(/endsolid/);
  });
});

describe('bricksToZip', () => {
  it('bundles exactly one STL per unique shape', () => {
    const r = computeOven(DEFAULT_PARAMS);
    const zip = bricksToZip(r);
    expect(zip[0]).toBe(0x50); // 'P'
    expect(zip[1]).toBe(0x4b); // 'K'
    const tail = zip.subarray(zip.length - 22);
    expect(u16le(tail, 10)).toBe(r.shapes.length); // EOCD total entries
  });
});

describe('mould export', () => {
  it('mouldToSTL emits a valid ASCII STL', () => {
    const r = computeOven(DEFAULT_PARAMS);
    const stl = mouldToSTL(r.shapes[0].face, {
      innerRMm: r.specs.innerDiaMm / 2, thicknessMm: r.specs.wallMm, wallMm: 8, flangeMm: 6,
    });
    expect(stl).toMatch(/^solid/);
    expect(stl).toContain('facet normal');
  });

  it('mouldsToZip bundles one mould STL per shape', () => {
    const r = computeOven(DEFAULT_PARAMS);
    const zip = mouldsToZip(r, 8, 6);
    const tail = zip.subarray(zip.length - 22);
    expect(u16le(tail, 10)).toBe(r.shapes.length);
  });
});
