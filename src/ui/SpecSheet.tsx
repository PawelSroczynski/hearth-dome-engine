import type { OvenParams, OvenResult } from '../core/engine';
import { mmRound, m2Round, m3Round } from '../core/bricks/specs';
import { flattenFace } from '../core/bricks/panel';
import { cornerAnglesDeg, edgeLengths } from '../core/bricks/measure';
import { useOven } from '../store';

/** Printable, self-contained build document (hidden on screen, shown via @media print). */
export function SpecSheet({ params, result: r }: { params: OvenParams; result: OvenResult }) {
  const mouldWallMm = useOven((s) => s.mouldWallMm);
  const mouldFlangeMm = useOven((s) => s.mouldFlangeMm);
  const images = useOven((s) => s.specImages);
  const innerR = r.specs.innerDiaMm / 2;
  const date = new Date().toISOString().slice(0, 10);

  const perShape = r.shapes.map((s) => {
    const ring = flattenFace(s.face).corners;
    return {
      ...s,
      edgesOrdered: edgeLengths(ring).map((e) => Math.round(e * innerR)),
      angles: cornerAnglesDeg(ring).map((a) => Math.round(a)),
    };
  });

  return (
    <div className="specsheet">
      <header className="ss-title">
        <h1>Hearth Dome Engine — Build Document</h1>
        <p className="ss-sub">
          {params.base} · GP({params.frequency},0) · {r.total} bricks · {r.uniqueShapes} unique full shapes · generated {date}
        </p>
      </header>

      {images?.dome && (
        <figure className="ss-hero">
          <img src={images.dome} alt="Dome 3D view" />
        </figure>
      )}

      <nav className="ss-toc">
        <h2>Contents</h2>
        <ol>
          <li>Parameters</li>
          <li>Dome specifications</li>
          <li>Geometry &amp; method</li>
          <li>Brick schedule (full bricks)</li>
          <li>Mould specifications</li>
          <li>Sphere composition</li>
        </ol>
      </nav>

      <section className="ss-sec">
        <h2>1 · Parameters</h2>
        <table>
          <tbody>
            <tr><td>Symmetry base</td><td>{params.base}</td></tr>
            <tr><td>Frequency</td><td>GP({params.frequency},0)</td></tr>
            <tr><td>Interior Ø</td><td>{mmRound(params.interiorMm)} mm</td></tr>
            <tr><td>Brick thickness (wall)</td><td>{mmRound(params.thicknessMm)} mm</td></tr>
            <tr><td>Cut angle</td><td>{params.cutAngleDeg}° (90° = hemisphere)</td></tr>
          </tbody>
        </table>
      </section>

      <section className="ss-sec">
        <h2>2 · Dome specifications</h2>
        <table>
          <tbody>
            <tr><td>Outer Ø</td><td>{mmRound(r.specs.outerDiaMm)} mm</td></tr>
            <tr><td>Inner Ø (clear interior)</td><td>{mmRound(r.specs.innerDiaMm)} mm</td></tr>
            <tr><td>Inner radius</td><td>{mmRound(innerR)} mm</td></tr>
            <tr><td>Wall thickness</td><td>{mmRound(r.specs.wallMm)} mm</td></tr>
            <tr><td>Footprint Ø</td><td>{mmRound(r.specs.footprintDiaMm)} mm</td></tr>
            <tr><td>Dome height</td><td>{mmRound(r.specs.heightMm)} mm</td></tr>
            <tr><td>Floor area</td><td>{m2Round(r.specs.floorAreaM2)} m²</td></tr>
            <tr><td>Cook volume</td><td>{m3Round(r.specs.cookVolumeM3)} m³</td></tr>
          </tbody>
        </table>
      </section>

      <section className="ss-sec">
        <h2>3 · Geometry &amp; method</h2>
        <p>
          The dome is a Goldberg polyhedron GP({params.frequency},0), built as the polar (reciprocal)
          dual of a Class-I geodesic sphere on the {params.base}. Each geodesic vertex maps to one flat
          Goldberg face whose corners lie exactly on the tangent plane at that vertex — so faces are
          exactly planar and corners are shared watertight between neighbours (no per-face fitting).
        </p>
        <p>
          The full sphere is cut to a dome at the {params.cutAngleDeg}° plane; faces below are dropped,
          faces above are kept as full bricks (bricks straddling the plane will be clipped into cut
          bricks — a later schedule group). Every brick is an extruded panel: the inner face sits on a
          sphere of radius {mmRound(innerR)} mm; the outer face is offset radially by the wall thickness,
          so the outer shell follows the dome's spherical curvature and stays watertight at shared corners.
        </p>
        <p>
          Brick face dimensions below are real millimetres = unit-sphere chord × inner radius. Corner
          angles are the interior angles of each (planar) face. All exported STL geometry is in millimetres.
        </p>
      </section>

      <section className="ss-sec ss-break">
        <h2>4 · Brick schedule — full bricks</h2>
        <p className="ss-note">
          Totals: {r.total} bricks ({r.full} full, {r.cut} cut) · {r.uniqueShapes} unique full shapes.
          Cast each shape its count number of times.
        </p>
        <table className="ss-shape">
          <thead>
            <tr><th>View</th><th>Shape</th><th>Sides</th><th>Count</th><th>Max span</th><th>Edges (mm, in order)</th><th>Corner angles</th></tr>
          </thead>
          <tbody>
            {perShape.map((s) => (
              <tr key={s.label}>
                <td>{images?.shapes[s.label] ? <img className="ss-thumb" src={images.shapes[s.label]} alt={s.label} /> : null}</td>
                <td>{s.label}</td>
                <td>{s.sides}</td>
                <td>×{s.count}</td>
                <td>{mmRound(s.spanMm)} mm</td>
                <td>{s.edgesOrdered.join(' / ')}</td>
                <td>{s.angles.map((a) => `${a}°`).join(' / ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ss-sec">
        <h2>5 · Mould specifications</h2>
        <p>
          Casting moulds are thin-walled shells matching each brick's perimeter — laid flat with the
          cavity floor on the bed, open top and bottom, tapered to flare outward, with a base flange so
          the rim sits flush. Print without supports; cast on melamine. One mould per unique shape.
        </p>
        <table>
          <tbody>
            <tr><td>Mould wall thickness</td><td>{mmRound(mouldWallMm)} mm</td></tr>
            <tr><td>Base flange width</td><td>{mmRound(mouldFlangeMm)} mm</td></tr>
            <tr><td>Unique moulds</td><td>{r.uniqueShapes}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="ss-sec">
        <h2>6 · Sphere composition</h2>
        <table>
          <tbody>
            <tr><td>Total sphere faces</td><td>{r.sphereFaces}</td></tr>
            <tr><td>Pentagons</td><td>{r.pentagons}</td></tr>
            <tr><td>Hexagons</td><td>{r.hexagons}</td></tr>
            <tr><td>Full bricks (kept)</td><td>{r.full}</td></tr>
            <tr><td>Cut bricks</td><td>{r.cut}</td></tr>
            <tr><td>Total bricks</td><td>{r.total}</td></tr>
          </tbody>
        </table>
      </section>

      <footer className="ss-foot">
        hearth-dome-engine · clean-room reimplementation · github.com/PawelSroczynski/hearth-dome-engine · {date}
      </footer>
    </div>
  );
}
