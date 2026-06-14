import type { OvenParams, OvenResult } from '../core/engine';
import { inchRound, ft2Round, ft3Round } from '../core/bricks/specs';

/** Printable one-page spec sheet (hidden on screen, shown via @media print). */
export function SpecSheet({ params, result: r }: { params: OvenParams; result: OvenResult }) {
  return (
    <div className="specsheet">
      <h1>Hearth Dome Engine — Build Sheet</h1>
      <p className="ss-sub">
        {params.base} · GP({params.frequency},0) · generated {new Date().toISOString().slice(0, 10)}
      </p>

      <div className="ss-cols">
        <div>
          <h2>Parameters</h2>
          <table>
            <tbody>
              <tr><td>Symmetry</td><td>{params.base}</td></tr>
              <tr><td>Frequency</td><td>GP({params.frequency},0)</td></tr>
              <tr><td>Interior Ø</td><td>{inchRound(params.interiorMm)}″</td></tr>
              <tr><td>Brick thickness</td><td>{inchRound(params.thicknessMm)}″</td></tr>
              <tr><td>Cut angle</td><td>{params.cutAngleDeg}°</td></tr>
            </tbody>
          </table>

          <h2>Dome specifications</h2>
          <table>
            <tbody>
              <tr><td>Outer Ø</td><td>{inchRound(r.specs.outerDiaMm)}″</td></tr>
              <tr><td>Inner Ø</td><td>{inchRound(r.specs.innerDiaMm)}″</td></tr>
              <tr><td>Wall</td><td>{inchRound(r.specs.wallMm)}″</td></tr>
              <tr><td>Dome height</td><td>{inchRound(r.specs.heightMm)}″</td></tr>
              <tr><td>Floor area</td><td>{ft2Round(r.specs.floorAreaM2)} ft²</td></tr>
              <tr><td>Cook volume</td><td>{ft3Round(r.specs.cookVolumeM3)} ft³</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h2>Brick schedule</h2>
          <table>
            <tbody>
              <tr><td>Total bricks</td><td><b>{r.total}</b></td></tr>
              <tr><td>Full bricks</td><td>{r.full}</td></tr>
              <tr><td>Cut bricks</td><td>{r.cut}</td></tr>
              <tr><td>Sphere faces</td><td>{r.sphereFaces}</td></tr>
              <tr><td>Pentagons</td><td>{r.pentagons}</td></tr>
              <tr><td>Hexagons</td><td>{r.hexagons}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="ss-foot">
        hearth-dome-engine · clean-room reimplementation · github.com/PawelSroczynski/hearth-dome-engine
      </p>
    </div>
  );
}
