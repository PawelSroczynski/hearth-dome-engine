import { describe, it, expect } from 'vitest';
import { heatingEstimate, wallUFromThickness, HEATING_DEFAULTS } from './heating';

describe('wallUFromThickness', () => {
  it('400 mm straw panel ≈ 0.16 W/m²K', () => {
    expect(wallUFromThickness(400, 0.065)).toBeCloseTo(0.158, 2);
  });
  it('thicker wall → lower U', () => {
    expect(wallUFromThickness(300, 0.065)).toBeGreaterThan(wallUFromThickness(400, 0.065));
  });
});

describe('heatingEstimate', () => {
  const base = {
    floorAreaM2: 24, heightM: 2.7, netWallM2: 40, openingM2: 4, roofM2: 28,
    wallU: wallUFromThickness(400, 0.065), a: HEATING_DEFAULTS,
  };
  it('produces positive demand, firewood and cost', () => {
    const r = heatingEstimate(base);
    expect(r.demandKWh).toBeGreaterThan(0);
    expect(r.firewoodMp).toBeCloseTo(r.demandKWh / HEATING_DEFAULTS.firewoodKWhPerMp, 6);
    expect(r.seasonCostEur).toBeCloseTo(r.firewoodMp * HEATING_DEFAULTS.firewoodPricePerMp, 6);
  });
  it('demand scales linearly with degree-days', () => {
    const a1 = heatingEstimate({ ...base, a: { ...HEATING_DEFAULTS, hddKd: 2000 } }).demandKWh;
    const a2 = heatingEstimate({ ...base, a: { ...HEATING_DEFAULTS, hddKd: 4000 } }).demandKWh;
    expect(a2 / a1).toBeCloseTo(2, 5);
  });
  it('ventilation loss = 0.34 · ach · volume', () => {
    const r = heatingEstimate(base);
    expect(r.hvWperK).toBeCloseTo(0.34 * HEATING_DEFAULTS.achNat * 24 * 2.7, 6);
  });
});
