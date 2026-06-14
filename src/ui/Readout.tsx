import type { OvenResult } from '../core/engine';
import { inchRound, ft2Round, ft3Round } from '../core/bricks/specs';

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="ro-row">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

export function Readout({ r }: { r: OvenResult }) {
  return (
    <section className="panel readout">
      <div className="panel-title">Brick Schedule</div>
      <Row k="Total bricks" v={r.total} />
      <Row k="Full bricks" v={r.full} />
      <Row k="Cut bricks" v={r.cut} />
      <Row k="Unique shapes" v={r.uniqueShapes} />
      <div className="ro-sep" />
      {r.shapes.map((s) => (
        <div className="ro-brick" key={s.label}>
          <span className="ro-brick-name">{s.label}</span>
          <span className="ro-brick-meta">{s.sides}-sided</span>
          <b>×{s.count}</b>
        </div>
      ))}
      <div className="ro-note">Full bricks · cut-brick molds next</div>
      <div className="ro-sep" />
      <Row k="Sphere faces" v={r.sphereFaces} />
      <Row k="Pentagons" v={r.pentagons} />
      <Row k="Hexagons" v={r.hexagons} />

      <div className="panel-title mt">Dome Specifications</div>
      <Row k="Outer Ø" v={`${inchRound(r.specs.outerDiaMm)}″`} />
      <Row k="Inner Ø" v={`${inchRound(r.specs.innerDiaMm)}″`} />
      <Row k="Wall" v={`${inchRound(r.specs.wallMm)}″`} />
      <Row k="Dome height" v={`${inchRound(r.specs.heightMm)}″`} />
      <Row k="Floor area" v={`${ft2Round(r.specs.floorAreaM2)} ft²`} />
      <Row k="Cook volume" v={`${ft3Round(r.specs.cookVolumeM3)} ft³`} />
    </section>
  );
}
