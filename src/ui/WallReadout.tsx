import { useState } from 'react';
import { useOven } from '../store';
import { panelize, wallBom, THICKNESS_MIN, THICKNESS_MAX } from '../core/wall/panelize';
import { CollapseToggle } from './CollapseToggle';

function Row({ k, v }: { k: string; v: string | number }) {
  return <div className="ro-row"><span>{k}</span><b>{v}</b></div>;
}
const m2 = (mm2: number) => `${(mm2 / 1e6).toFixed(1)} m²`;

export function WallReadout() {
  const wall = useOven((s) => s.wall);
  const rate = useOven((s) => s.wallRateEur);
  const selected = useOven((s) => s.selected);
  const setSelected = useOven((s) => s.setSelected);
  const [open, setOpen] = useState(true);
  const panels = panelize(wall);
  const bom = wallBom(panels);
  const solid = panels.filter((p) => p.type !== 'void');
  const flagged = solid.filter((p) => !p.ok).length;
  const wallArea = wall.lengthMm * wall.heightMm;
  const openArea = wall.openings.reduce((s, o) => s + o.w * Math.max(0, o.headH - o.sillH), 0);
  const panelAreaM2 = solid.reduce((s, p) => s + p.w * p.h, 0) / 1e6; // exactly what's on screen
  const cost = panelAreaM2 * rate;
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
                <span className="ro-brick-name">{r.type}</span>
                <b>×{r.count}</b>
              </div>
              <span className="ro-brick-meta">{r.w} × {r.h} mm {r.ok ? '' : '· out of range'}</span>
            </div>
          );
        })}
        <div className="ro-note">EcoCocon straw panels · L over openings · S under windows</div>
        <div className="ro-sep" />
        <Row k="Wall area" v={m2(wallArea)} />
        <Row k="Openings" v={m2(openArea)} />
        <Row k="Panel area (3D)" v={`${panelAreaM2.toFixed(1)} m²`} />
        <Row k="Thickness" v={`${wall.thicknessMm} mm ${thicknessOk ? '' : '⚠'}`} />
        <div className="panel-title mt">Estimated cost</div>
        <Row k="Rate" v={`€${rate}/m²`} />
        <div className="ro-row"><span>Total (panels)</span><b style={{ color: 'var(--accent)', fontSize: '15px' }}>€{Math.round(cost).toLocaleString()}</b></div>
        <div className="ro-note">Estimate = panel area × rate. Rate is an editable assumption (EcoCocon prices by exterior wall area excl. openings); set your supplier’s rate.</div>
      </>}
    </section>
  );
}
