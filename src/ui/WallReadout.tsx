import { useState } from 'react';
import { useOven } from '../store';
import { wallBom, THICKNESS_MIN, THICKNESS_MAX } from '../core/wall/panelize';
import { buildingFromWall, allWallPanels, floorCassettes } from '../core/building/model';
import { CollapseToggle } from './CollapseToggle';

function Row({ k, v }: { k: string; v: string | number }) {
  return <div className="ro-row"><span>{k}</span><b>{v}</b></div>;
}
const m2 = (mm2: number) => `${(mm2 / 1e6).toFixed(1)} m²`;

export function WallReadout() {
  const wall = useOven((s) => s.wall);
  const rate = useOven((s) => s.wallRateEur);
  const floorRate = useOven((s) => s.floorRateEur);
  const floorModuleMm = useOven((s) => s.floorModuleMm);
  const floorThicknessMm = useOven((s) => s.floorThicknessMm);
  const floorSpanAxis = useOven((s) => s.floorSpanAxis);
  const selected = useOven((s) => s.selected);
  const setSelected = useOven((s) => s.setSelected);
  const [open, setOpen] = useState(true);
  const depth = wall.depthMm ?? 4000;
  const model = buildingFromWall(wall, depth, { moduleWidthMm: floorModuleMm, thicknessMm: floorThicknessMm, spanAxis: floorSpanAxis });
  const wpanels = allWallPanels(model).filter((p) => p.type !== 'void');
  const fpanels = floorCassettes(model);
  const bom = wallBom([...wpanels, ...fpanels]);
  const solid = [...wpanels, ...fpanels];
  const flagged = solid.filter((p) => !p.ok).length;
  const wallArea = 2 * (wall.lengthMm + depth) * wall.heightMm; // 4-wall shell
  const wallPanelM2 = wpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
  const floorM2 = fpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
  const wallCost = wallPanelM2 * rate, floorCost = floorM2 * floorRate;
  const cost = wallCost + floorCost;
  const thicknessOk = wall.thicknessMm >= THICKNESS_MIN && wall.thicknessMm <= THICKNESS_MAX;

  return (
    <section className="panel readout">
      <div className="panel-title">
        Panel Schedule
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
                <span className="ro-brick-name">{r.label}</span>
                <b>×{r.count}</b>
              </div>
              <span className="ro-brick-meta">{r.w} × {r.h} mm {r.ok ? '' : '· out of range'}</span>
            </div>
          );
        })}
        <div className="ro-note">EcoCocon straw panels · L over openings · S under windows</div>
        <div className="ro-sep" />
        <Row k="Wall shell area" v={m2(wallArea)} />
        <Row k="Wall panel area" v={`${wallPanelM2.toFixed(1)} m²`} />
        <Row k="Floor area" v={`${floorM2.toFixed(1)} m²`} />
        <Row k="Thickness" v={`${wall.thicknessMm} mm ${thicknessOk ? '' : '⚠'}`} />
        <div className="panel-title mt">Estimated cost</div>
        <Row k={`Walls · €${rate}/m²`} v={`€${Math.round(wallCost).toLocaleString()}`} />
        <Row k={`Floor · €${floorRate}/m²`} v={`€${Math.round(floorCost).toLocaleString()}`} />
        <div className="ro-row"><span>Total</span><b style={{ color: 'var(--accent)', fontSize: '15px' }}>€{Math.round(cost).toLocaleString()}</b></div>
        <div className="ro-note">Estimate = area × rate. Rates are editable assumptions; set your supplier’s rates.</div>
      </>}
    </section>
  );
}
