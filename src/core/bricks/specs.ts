/**
 * Dome shell specifications from the continuous parameters. Internals are metric
 * (mm); helpers convert to the inch / ft² / ft³ figures the UI shows.
 *
 * Derived from and verified against the v1 specs oracle:
 *   outer Ø     = interior + 2 * brick thickness
 *   wall        = brick thickness
 *   dome height = innerR * (1 - cos θ)         (θ = cut angle; 90° = hemisphere)
 *   floor area  = π * innerR²                  (full oven floor, independent of cut)
 *   cook volume = spherical cap (π h²/3)(3 innerR - h)
 *   footprint Ø = outer Ø * 1.017              (empirical +1.7% brick overhang)
 */

export interface DomeParams {
  interiorMm: number;
  thicknessMm: number;
  cutAngleDeg: number; // 30..90, 90 = hemisphere
}

export interface DomeSpecs {
  innerDiaMm: number;
  outerDiaMm: number;
  footprintDiaMm: number;
  wallMm: number;
  heightMm: number;
  floorAreaM2: number;
  cookVolumeM3: number;
}

const FOOTPRINT_FACTOR = 1.017;

export function domeSpecs(p: DomeParams): DomeSpecs {
  const innerR = p.interiorMm / 2;
  const theta = (p.cutAngleDeg * Math.PI) / 180;
  const h = innerR * (1 - Math.cos(theta));
  const innerR_m = innerR / 1000;
  const h_m = h / 1000;
  return {
    innerDiaMm: p.interiorMm,
    outerDiaMm: p.interiorMm + 2 * p.thicknessMm,
    footprintDiaMm: (p.interiorMm + 2 * p.thicknessMm) * FOOTPRINT_FACTOR,
    wallMm: p.thicknessMm,
    heightMm: h,
    floorAreaM2: Math.PI * innerR_m * innerR_m,
    cookVolumeM3: ((Math.PI * h_m * h_m) / 3) * (3 * innerR_m - h_m),
  };
}

// --- unit helpers / display formatting (match v1) ---
export const mmToIn = (mm: number) => mm / 25.4;
export const m2ToFt2 = (m2: number) => m2 * 10.7639;
export const m3ToFt3 = (m3: number) => m3 * 35.3147;

export const inchRound = (mm: number) => Math.round(mmToIn(mm));
export const ft2Round = (m2: number) => Math.round(m2ToFt2(m2) * 10) / 10;
export const ft3Round = (m3: number) => Math.round(m3ToFt3(m3) * 10) / 10;
