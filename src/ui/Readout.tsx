import { useState } from 'react';
import type { OvenResult } from '../core/engine';
import { mmRound, m2Round, m3Round } from '../core/bricks/specs';
import { brickToSTL, mouldToSTL, download } from '../render/exporters';
import { useOven } from '../store';
import { CollapseToggle } from './CollapseToggle';

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="ro-row">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

export function Readout({ r }: { r: OvenResult }) {
  const [open, setOpen] = useState(true);
  const [fullOpen, setFullOpen] = useState(true);
  const view = useOven((s) => s.view);
  const mouldWallMm = useOven((s) => s.mouldWallMm);
  const mouldFlangeMm = useOven((s) => s.mouldFlangeMm);
  const selected = useOven((s) => s.selected);
  const setSelected = useOven((s) => s.setSelected);
  const exportBrick = (label: string) => {
    const shape = r.shapes.find((s) => s.label === label);
    if (!shape) return;
    const slug = label.toLowerCase().replace(/\s+/g, '-');
    if (view === 'mould') {
      download(`${slug}-mould.stl`, mouldToSTL(shape.face, {
        innerRMm: r.specs.innerDiaMm / 2, thicknessMm: r.specs.wallMm,
        wallMm: mouldWallMm, flangeMm: mouldFlangeMm,
      }), 'model/stl');
    } else {
      download(`${slug}.stl`, brickToSTL(shape.face, r.specs.innerDiaMm, r.specs.wallMm), 'model/stl');
    }
  };
  return (
    <section className="panel readout">
      <div className="panel-title">
        Brick Schedule
        <CollapseToggle open={open} onToggle={() => setOpen((o) => !o)} />
      </div>
      {!open ? null : <>
      <Row k="Total bricks" v={r.total} />
      <Row k="Full bricks" v={r.full} />
      <Row k="Cut bricks" v={r.cut} />
      <Row k="Unique shapes" v={r.uniqueShapes} />
      <div className="ro-sep" />
      <div className="ro-group" onClick={() => setFullOpen((o) => !o)}>
        <span>{fullOpen ? '▼' : '▸'} FULL BRICKS</span><b>{r.full}</b>
      </div>
      {!fullOpen ? null : r.shapes.map((s) => (
        <div className={`ro-brick${selected === s.label ? ' sel' : ''}`} key={s.label}
          onClick={() => setSelected(s.label)}>
          <div className="ro-brick-line">
            <span className="ro-brick-name">{s.label}</span>
            <b>×{s.count}</b>
          </div>
          <span className="ro-brick-meta">{s.sides}-sided · span {mmRound(s.spanMm)} mm</span>
          <span className="ro-brick-meta">edges {s.edgeMm.map(mmRound).join('/')} mm</span>
          <button className="ro-brick-stl" onClick={() => exportBrick(s.label)}>
            ↓ {view === 'mould' ? 'Mould' : 'Brick'} STL
          </button>
        </div>
      ))}
      <div className="ro-note">Full bricks · cut + arch bricks next</div>
      <div className="ro-sep" />
      <Row k="Sphere faces" v={r.sphereFaces} />
      <Row k="Pentagons" v={r.pentagons} />
      <Row k="Hexagons" v={r.hexagons} />

      <div className="panel-title mt">Dome Specifications</div>
      <Row k="Outer Ø" v={`${mmRound(r.specs.outerDiaMm)} mm`} />
      <Row k="Inner Ø" v={`${mmRound(r.specs.innerDiaMm)} mm`} />
      <Row k="Wall" v={`${mmRound(r.specs.wallMm)} mm`} />
      <Row k="Dome height" v={`${mmRound(r.specs.heightMm)} mm`} />
      <Row k="Floor area" v={`${m2Round(r.specs.floorAreaM2)} m²`} />
      <Row k="Cook volume" v={`${m3Round(r.specs.cookVolumeM3)} m³`} />
      </>}
    </section>
  );
}
