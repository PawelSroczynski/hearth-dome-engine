import { describe, it, expect } from 'vitest';
import { crc32, makeZip } from './zip';

const enc = (s: string) => new TextEncoder().encode(s);
const u32le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);

describe('crc32', () => {
  it('matches known IEEE CRC-32 vectors', () => {
    expect(crc32(enc(''))).toBe(0x00000000);
    expect(crc32(enc('abc'))).toBe(0x352441c2);
    expect(crc32(enc('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
});

describe('makeZip', () => {
  it('writes a valid store-only archive with local + central + end records', () => {
    const zip = makeZip([
      { name: 'a.stl', content: 'solid a\nendsolid a\n' },
      { name: 'b.stl', content: 'solid b\nendsolid b\n' },
    ]);
    // first local header signature
    expect(u32le(zip, 0) >>> 0).toBe(0x04034b50);
    // End Of Central Directory present near the tail
    const eocd = zip.lastIndexOf(0x50);
    expect(eocd).toBeGreaterThan(0);
    // entry count in EOCD (offset +10 holds total entries)
    const tail = zip.subarray(zip.length - 22);
    expect(u32le(tail, 0) >>> 0).toBe(0x06054b50);
    expect(tail[10] | (tail[11] << 8)).toBe(2);
  });
});
