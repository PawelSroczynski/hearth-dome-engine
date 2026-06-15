/**
 * Permalink state (like the original geohack `#s=…`): the configuration packed into
 * the URL hash so a link reproduces the scene. Packed as a compact little-endian
 * binary blob → base64url (NOT JSON — that made the token ~300 chars). Only the
 * ACTIVE construction's parameters are stored; the other mode falls back to defaults
 * (sharing a dome link doesn't carry wall edits and vice-versa). Dome links are tiny;
 * wall links are longer only because they describe a whole building.
 */
import type { OvenParams, SubdivisionClass } from './engine';
import type { BaseSolid } from './goldberg/formulas';
import type { WallSpec } from './wall/panelize';

export interface Snapshot extends OvenParams {
  construction: 'dome' | 'wall';
  view: 'brick' | 'mould';
  wall: WallSpec;
  wallRateEur: number;
  floorModuleMm: number;
  floorThicknessMm: number;
  floorSpanAxis: 'x' | 'y';
  floorRateEur: number;
  roofType: 'flat' | 'gable' | 'mono';
  roofPitchDeg: number;
  roofModuleMm: number;
  roofRateEur: number;
  frameView: boolean;
}

const VERSION = 2;
const BASES: BaseSolid[] = ['icosa', 'octa', 'tetra'];
const CLASSES: SubdivisionClass[] = ['I', 'II', 'III'];
const ROOFS: Snapshot['roofType'][] = ['flat', 'gable', 'mono'];

const DEF_DOME: OvenParams = {
  base: 'icosa', frequency: 4, subdivisionClass: 'I', classIIIn: 1,
  interiorMm: 1020, thicknessMm: 100, cutAngleDeg: 90,
};
const DEF_WALL: WallSpec = {
  lengthMm: 6000, heightMm: 2700, thicknessMm: 400, targetWidthMm: 800, depthMm: 4000,
  openings: [{ x: 800, w: 1000, sillH: 0, headH: 2100 }, { x: 3600, w: 1600, sillH: 800, headH: 2100 }],
};
const DEF_BUILD = {
  wallRateEur: 100, floorModuleMm: 800, floorThicknessMm: 240,
  floorRateEur: 120, roofType: 'gable' as const, roofPitchDeg: 30, roofModuleMm: 800, roofRateEur: 160,
};

const bytesToB64url = (b: number[]) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlToBytes = (t: string) => {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/'));
  return Array.from({ length: s.length }, (_, i) => s.charCodeAt(i));
};

/** Pack a snapshot into a URL-hash token (no leading `#` or `s=`). */
export function encodeState(s: Snapshot): string {
  const b: number[] = [];
  const u8 = (v: number) => b.push(v & 0xff);
  const u16 = (v: number) => { const n = Math.round(v) & 0xffff; b.push(n & 0xff, (n >> 8) & 0xff); };
  u8(VERSION);
  u8((s.construction === 'wall' ? 1 : 0) | (s.view === 'mould' ? 2 : 0) |
     (s.frameView ? 4 : 0) | (s.floorSpanAxis === 'x' ? 8 : 0));
  if (s.construction === 'wall') {
    u16(s.wall.lengthMm); u16(s.wall.depthMm ?? 4000); u16(s.wall.heightMm);
    u16(s.wall.thicknessMm); u16(s.wall.targetWidthMm);
    u16(s.wallRateEur); u16(s.floorModuleMm); u16(s.floorThicknessMm); u16(s.floorRateEur);
    u8(Math.max(0, ROOFS.indexOf(s.roofType))); u8(s.roofPitchDeg); u16(s.roofModuleMm); u16(s.roofRateEur);
    u8(s.wall.openings.length);
    for (const o of s.wall.openings) { u16(o.x); u16(o.w); u16(o.sillH); u16(o.headH); }
  } else {
    u8(Math.max(0, BASES.indexOf(s.base))); u8(s.frequency);
    u8(Math.max(0, CLASSES.indexOf(s.subdivisionClass))); u8(s.classIIIn);
    u16(s.interiorMm); u16(s.thicknessMm); u8(s.cutAngleDeg);
  }
  return bytesToB64url(b);
}

/** Parse a token back into a snapshot, or null if malformed / wrong version. */
export function decodeState(token: string): Snapshot | null {
  try {
    const b = b64urlToBytes(token.trim());
    let i = 0;
    const u8 = () => b[i++];
    const u16 = () => { const v = b[i] | (b[i + 1] << 8); i += 2; return v; };
    if (u8() !== VERSION) return null;
    const f = u8();
    const construction = f & 1 ? 'wall' : 'dome';
    const view = f & 2 ? 'mould' : 'brick';
    const frameView = !!(f & 4);
    const floorSpanAxis = f & 8 ? 'x' : 'y';
    const base: Snapshot = {
      ...DEF_DOME, construction, view, frameView, floorSpanAxis,
      wall: { ...DEF_WALL, openings: DEF_WALL.openings.map((o) => ({ ...o })) }, ...DEF_BUILD,
    };
    if (construction === 'wall') {
      const lengthMm = u16(), depthMm = u16(), heightMm = u16(), thicknessMm = u16(), targetWidthMm = u16();
      base.wallRateEur = u16(); base.floorModuleMm = u16(); base.floorThicknessMm = u16(); base.floorRateEur = u16();
      base.roofType = ROOFS[u8()] ?? 'gable'; base.roofPitchDeg = u8(); base.roofModuleMm = u16(); base.roofRateEur = u16();
      const n = u8();
      const openings = Array.from({ length: n }, () => ({ x: u16(), w: u16(), sillH: u16(), headH: u16() }));
      base.wall = { lengthMm, heightMm, thicknessMm, targetWidthMm, depthMm, openings };
    } else {
      base.base = BASES[u8()] ?? 'icosa'; base.frequency = u8();
      base.subdivisionClass = CLASSES[u8()] ?? 'I'; base.classIIIn = u8();
      base.interiorMm = u16(); base.thicknessMm = u16(); base.cutAngleDeg = u8();
    }
    if (i > b.length) return null;
    return base;
  } catch {
    return null;
  }
}

/** Read the `#s=…` token from a URL hash (accepts the raw `location.hash`). */
export function tokenFromHash(hash: string): string | null {
  const m = /[#&]s=([^&]+)/.exec(hash);
  return m ? m[1] : null;
}
