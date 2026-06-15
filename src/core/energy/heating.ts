/**
 * Simple steady-state seasonal heating estimate (MVP, transparent).
 * Q_annual = H · HDD · 24 / 1000  [kWh/yr],  H = transmission + ventilation loss.
 * All coefficients are stated assumptions (central Poland climate, NO mechanical
 * ventilation). Not a certified energy calc — an indicative figure.
 */

export interface HeatingAssumptions {
  lambdaWmK: number;   // effective panel conductivity (straw+timber)
  roofU: number;       // W/m²K
  floorU: number;      // W/m²K
  openingU: number;    // windows/doors W/m²K
  achNat: number;      // air changes/hour (natural, no MVHR)
  hddKd: number;       // heating degree-days [K·day], central PL
  firewoodKWhPerMp: number; // usable heat per stacked m³ (mp) of seasoned hardwood
  firewoodPricePerMp: number; // € per mp
}

// Defaults — central Poland, natural ventilation, seasoned hardwood. Editable assumptions.
export const HEATING_DEFAULTS: HeatingAssumptions = {
  lambdaWmK: 0.065,   // straw ~0.057 + ~10% timber → ~0.065 effective
  roofU: 0.15,
  floorU: 0.20,
  openingU: 1.1,
  achNat: 0.5,        // no mechanical ventilation → natural infiltration/airing
  hddKd: 3600,        // central PL, base ~15 °C (assumption)
  firewoodKWhPerMp: 1900, // ≈ seasoned hardwood at ~70% stove efficiency
  firewoodPricePerMp: 70,
};

/** Opaque wall U from thickness (mm) and conductivity; surface resistances ~0.17. */
export function wallUFromThickness(thicknessMm: number, lambdaWmK: number): number {
  return 1 / (0.17 + (thicknessMm / 1000) / lambdaWmK);
}

export interface HeatingInput {
  floorAreaM2: number;
  heightM: number;
  netWallM2: number;   // opaque wall (excl. openings)
  openingM2: number;
  roofM2: number;
  wallU: number;
  a: HeatingAssumptions;
}

export interface HeatingResult {
  volumeM3: number;
  htWperK: number;     // transmission loss coefficient
  hvWperK: number;     // ventilation loss coefficient
  hWperK: number;      // total
  demandKWh: number;   // annual heating demand
  firewoodMp: number;  // stacked m³/season
  seasonCostEur: number;
}

export function heatingEstimate(i: HeatingInput): HeatingResult {
  const v = i.floorAreaM2 * i.heightM;
  const ht = i.wallU * i.netWallM2 + i.a.roofU * i.roofM2 + i.a.floorU * i.floorAreaM2 + i.a.openingU * i.openingM2;
  const hv = 0.34 * i.a.achNat * v; // 0.34 Wh/(m³·K) = ρ·c_p of air
  const h = ht + hv;
  const demandKWh = (h * i.a.hddKd * 24) / 1000;
  const firewoodMp = demandKWh / i.a.firewoodKWhPerMp;
  return {
    volumeM3: v, htWperK: ht, hvWperK: hv, hWperK: h,
    demandKWh, firewoodMp, seasonCostEur: firewoodMp * i.a.firewoodPricePerMp,
  };
}
