import type { Panel } from '../wall/panelize';
import { PANEL_LIMITS } from '../wall/panelize';

/**
 * Modular floor (posadzka) MVP: tile a rectangular footprint with floor cassettes.
 * Cassettes run along `spanAxis`; across the other axis they sit in strips of
 * `moduleWidthMm` (≤ cassette max). Long spans split into ≤ 6000 mm segments.
 * Returned as Panel[] (type 'cassette') in PLAN coords: x along length, y along depth.
 */
export function floorize(lengthMm: number, depthMm: number, moduleWidthMm: number, spanAxis: 'x' | 'y'): Panel[] {
  const L = PANEL_LIMITS.cassette;
  const mod = Math.min(Math.max(moduleWidthMm, L.wMin), L.wMax);
  const out: Panel[] = [];

  // cross = direction we lay strips across; span = direction cassettes run/length
  const crossLen = spanAxis === 'y' ? lengthMm : depthMm;
  const spanLen = spanAxis === 'y' ? depthMm : lengthMm;
  const nStrips = Math.max(1, Math.ceil(crossLen / mod));
  const stripW = crossLen / nStrips;
  const nSeg = Math.max(1, Math.ceil(spanLen / L.hMax));
  const segLen = spanLen / nSeg;

  for (let i = 0; i < nStrips; i++) {
    for (let j = 0; j < nSeg; j++) {
      const cross = i * stripW, span = j * segLen;
      // width (module dir) = stripW; length (span dir) = segLen
      const ok = stripW >= L.wMin - 0.5 && stripW <= L.wMax + 0.5 && segLen >= L.hMin - 0.5 && segLen <= L.hMax + 0.5;
      const cell = spanAxis === 'y'
        ? { x: cross, y: span, w: stripW, h: segLen }   // strips across x, run along y
        : { x: span, y: cross, w: segLen, h: stripW };  // strips across y, run along x
      out.push({ type: 'cassette', ...cell, ok });
    }
  }
  return out;
}
