import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, tokenFromHash, type Snapshot } from './share';
import { DEFAULT_PARAMS } from './engine';

const snap: Snapshot = {
  ...DEFAULT_PARAMS,
  construction: 'wall',
  view: 'brick',
  wall: { lengthMm: 6000, heightMm: 2700, thicknessMm: 400, targetWidthMm: 800, depthMm: 4000,
    openings: [{ x: 800, w: 1000, sillH: 0, headH: 2100 }, { x: 3600, w: 1600, sillH: 800, headH: 2100 }] },
  wallRateEur: 100,
  floorModuleMm: 800, floorThicknessMm: 240, floorSpanAxis: 'y', floorRateEur: 120,
  roofType: 'gable', roofPitchDeg: 30, roofModuleMm: 800, roofRateEur: 160,
  frameView: false,
};

describe('share state', () => {
  it('round-trips a full snapshot exactly', () => {
    expect(decodeState(encodeState(snap))).toEqual(snap);
  });

  it('round-trips dome mode', () => {
    const d: Snapshot = { ...snap, construction: 'dome', view: 'mould', frameView: true };
    expect(decodeState(encodeState(d))).toEqual(d);
  });

  it('produces a URL-safe token (no + / = #)', () => {
    expect(encodeState(snap)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('tokens are compact (binary-packed, not JSON)', () => {
    expect(encodeState(snap).length).toBeLessThan(80);              // whole building
    const dome: Snapshot = { ...snap, construction: 'dome' };
    expect(encodeState(dome).length).toBeLessThan(24);             // dome ≈ original short hash
  });

  it('rejects malformed / wrong-version tokens', () => {
    expect(decodeState('not-base64!!')).toBeNull();
    expect(decodeState(btoa(JSON.stringify({ v: 99, s: snap })))).toBeNull();
    expect(decodeState(btoa(JSON.stringify({ v: 1 })))).toBeNull();
  });

  it('extracts the token from a location.hash', () => {
    const tok = encodeState(snap);
    expect(tokenFromHash(`#s=${tok}`)).toBe(tok);
    expect(tokenFromHash('#other=1&s=' + tok)).toBe(tok);
    expect(tokenFromHash('')).toBeNull();
  });
});
