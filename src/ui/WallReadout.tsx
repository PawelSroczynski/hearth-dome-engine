import { useState } from 'react';
import { useOven } from '../store';
import { wallBom, THICKNESS_MIN, THICKNESS_MAX } from '../core/wall/panelize';
import { buildingFromWall, allWallPanels, floorCassettes, roofPanels } from '../core/building/model';
import { roofAreaMm2 } from '../core/roof/roofize';
import { heatingEstimate, wallUFromThickness, HEATING_DEFAULTS as HD } from '../core/energy/heating';
import { panelColor } from '../render/wallMesh';
import { CollapseToggle } from './CollapseToggle';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function Row({ k, v }: { k: string; v: string | number }) {
  return <div className="ro-row"><span>{k}</span><b>{v}</b></div>;
}

export function WallReadout() {
  const wall = useOven((s) => s.wall);
  const rate = useOven((s) => s.wallRateEur);
  const floorRate = useOven((s) => s.floorRateEur);
  const floorModuleMm = useOven((s) => s.floorModuleMm);
  const floorThicknessMm = useOven((s) => s.floorThicknessMm);
  const floorSpanAxis = useOven((s) => s.floorSpanAxis);
  const roofType = useOven((s) => s.roofType);
  const roofPitchDeg = useOven((s) => s.roofPitchDeg);
  const roofModuleMm = useOven((s) => s.roofModuleMm);
  const roofRate = useOven((s) => s.roofRateEur);
  const selected = useOven((s) => s.selected);
  const setSelected = useOven((s) => s.setSelected);
  const [open, setOpen] = useState(true);
  const depth = wall.depthMm ?? 4000;
  const model = buildingFromWall(wall, depth,
    { moduleWidthMm: floorModuleMm, thicknessMm: floorThicknessMm, spanAxis: floorSpanAxis },
    { type: roofType, pitchDeg: roofPitchDeg, ridgeAxis: 'x', moduleWidthMm: roofModuleMm });
  const wpanels = allWallPanels(model).filter((p) => p.type !== 'void');
  const fpanels = floorCassettes(model);
  const rpanels = roofPanels(model);
  const bom = wallBom([...wpanels, ...fpanels, ...rpanels]);
  const solid = [...wpanels, ...fpanels, ...rpanels];
  const flagged = solid.filter((p) => !p.ok).length;
  const wallPanelM2 = wpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
  const floorM2 = (wall.lengthMm * depth) / 1e6; // nominal building footprint (length × depth)
  const roofM2 = roofAreaMm2(wall.lengthMm, depth, roofPitchDeg, roofType) / 1e6;
  const wallCost = wallPanelM2 * rate, floorCost = floorM2 * floorRate, roofCost = roofM2 * roofRate;
  const cost = wallCost + floorCost + roofCost;
  const thicknessOk = wall.thicknessMm >= THICKNESS_MIN && wall.thicknessMm <= THICKNESS_MAX;

  // indicative heating estimate (central PL, no MVHR)
  const floorAreaM2 = (wall.lengthMm * depth) / 1e6;
  const openingM2 = wall.openings.reduce((s, o) => s + o.w * Math.max(0, o.headH - o.sillH), 0) / 1e6;
  const wallU = wallUFromThickness(wall.thicknessMm, HD.lambdaWmK);
  const energy = heatingEstimate({ floorAreaM2, heightM: wall.heightMm / 1000, netWallM2: wallPanelM2, openingM2, roofM2, wallU, a: HD });

  return (
    <section className="panel readout">
      <div className="panel-title">
        Parts List
        <CollapseToggle open={open} onToggle={() => setOpen((o) => !o)} />
      </div>
      {!open ? null : <>
        <Row k="Panels" v={solid.length} />
        <Row k="Unique types (BOM)" v={bom.length} />
        <Row k="Out of range" v={flagged} />
        <div className="ro-sep" />
        {bom.map((r) => {
          const key = `${r.type}:${r.w}x${r.h}`;
          return (
            <div className={`ro-brick${selected === key ? ' sel' : ''}`} key={key}
              onClick={() => setSelected(key)}>
              <div className="ro-brick-line">
                <span className="ro-brick-name">
                  <i className="ro-swatch" style={{ background: r.ok ? hex(panelColor(key)) : '#9c3b2c' }} />
                  {r.label}
                </span>
                <b>×{r.count}</b>
              </div>
              <span className="ro-brick-meta">{r.w} × {r.h} mm {r.ok ? '' : '· out of range'}</span>
            </div>
          );
        })}
        <div className="ro-note">StrawPanel system · L over openings · S under windows</div>
        <div className="ro-sep" />
        <Row k="Wall panel area" v={`${wallPanelM2.toFixed(1)} m²`} />
        <Row k="Floor area" v={`${floorM2.toFixed(1)} m²`} />
        <Row k="Roof area" v={`${roofM2.toFixed(1)} m²`} />
        <Row k="Thickness" v={`${wall.thicknessMm} mm ${thicknessOk ? '' : '⚠'}`} />
        <div className="panel-title mt">Estimated cost</div>
        <Row k={`Walls · €${rate}/m²`} v={`€${Math.round(wallCost).toLocaleString()}`} />
        <Row k={`Floor · €${floorRate}/m²`} v={`€${Math.round(floorCost).toLocaleString()}`} />
        <Row k={`Roof · €${roofRate}/m²`} v={`€${Math.round(roofCost).toLocaleString()}`} />
        <div className="ro-row"><span>Total</span><b style={{ color: 'var(--accent)', fontSize: '15px' }}>€{Math.round(cost).toLocaleString()}</b></div>
        <div className="ro-note">Estimate = area × rate. Rates are editable assumptions; set your supplier’s rates.</div>

        <div className="panel-title mt">Energy · heating</div>
        <Row k="Heated volume" v={`${Math.round(energy.volumeM3)} m³`} />
        <Row k="Wall U" v={`${wallU.toFixed(2)} W/m²K`} />
        <Row k="Heat loss" v={`${Math.round(energy.hWperK)} W/K`} />
        <Row k="Heating need" v={`${Math.round(energy.demandKWh).toLocaleString()} kWh/yr`} />
        <Row k="Firewood" v={`${energy.firewoodMp.toFixed(1)} mp/yr`} />
        <div className="ro-row"><span>Season cost</span><b style={{ color: 'var(--accent)', fontSize: '15px' }}>€{Math.round(energy.seasonCostEur).toLocaleString()}</b></div>
        <div className="ro-note">
          Indicative · central PL ~{HD.hddKd} Kd · no MVHR (n={HD.achNat}/h) · straw λ={HD.lambdaWmK} W/mK ·
          firewood ~{HD.firewoodKWhPerMp} kWh/mp @ €{HD.firewoodPricePerMp}/mp · gross (no solar/internal gains).
        </div>
      </>}
    </section>
  );
}
