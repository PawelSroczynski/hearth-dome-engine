import { useOven } from '../store';
import { wallBom, THICKNESS_MIN, THICKNESS_MAX } from '../core/wall/panelize';
import { buildingFromWall, allWallPanels } from '../core/building/model';

/** Printable build document for the StrawPanel wall (hidden on screen, @media print). */
export function WallSpecSheet() {
  const wall = useOven((s) => s.wall);
  const rate = useOven((s) => s.wallRateEur);
  const images = useOven((s) => s.specImages);
  const depth = wall.depthMm ?? 4000;
  const date = new Date().toISOString().slice(0, 10);

  const panels = allWallPanels(buildingFromWall(wall, depth));
  const bom = wallBom(panels);
  const solid = panels.filter((p) => p.type !== 'void');
  const panelAreaM2 = solid.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
  const wallAreaM2 = (2 * (wall.lengthMm + depth) * wall.heightMm) / 1e6;
  const cost = panelAreaM2 * rate;
  const flagged = solid.filter((p) => !p.ok).length;
  const thicknessOk = wall.thicknessMm >= THICKNESS_MIN && wall.thicknessMm <= THICKNESS_MAX;

  return (
    <div className="specsheet">
      <header className="ss-title">
        <h1>StrawPanel Wall — Build Document</h1>
        <p className="ss-sub">
          {wall.lengthMm}×{depth} mm footprint · {wall.heightMm} mm high · {solid.length} panels · {bom.length} types · generated {date}
        </p>
      </header>

      {images?.dome && <figure className="ss-hero"><img src={images.dome} alt="Building 3D view" /></figure>}

      <nav className="ss-toc">
        <h2>Contents</h2>
        <ol>
          <li>Parameters</li>
          <li>Building specifications</li>
          <li>Method</li>
          <li>Panel schedule</li>
          <li>Cost estimate</li>
        </ol>
      </nav>

      <section className="ss-sec">
        <h2>1 · Parameters</h2>
        <table><tbody>
          <tr><td>Footprint length</td><td>{wall.lengthMm} mm</td></tr>
          <tr><td>Footprint depth</td><td>{depth} mm</td></tr>
          <tr><td>Wall height</td><td>{wall.heightMm} mm</td></tr>
          <tr><td>Panel thickness</td><td>{wall.thicknessMm} mm{thicknessOk ? '' : ' ⚠ out of 300–400'}</td></tr>
          <tr><td>Target panel width</td><td>{wall.targetWidthMm} mm</td></tr>
          <tr><td>Openings (front)</td><td>{wall.openings.length}</td></tr>
        </tbody></table>
      </section>

      <section className="ss-sec">
        <h2>2 · Building specifications</h2>
        <table><tbody>
          <tr><td>Wall area (4-wall shell)</td><td>{wallAreaM2.toFixed(1)} m²</td></tr>
          <tr><td>Net panel area</td><td>{panelAreaM2.toFixed(1)} m²</td></tr>
          <tr><td>Panels</td><td>{solid.length}</td></tr>
          <tr><td>Unique types</td><td>{bom.length}</td></tr>
          <tr><td>Out of range</td><td>{flagged}</td></tr>
        </tbody></table>
      </section>

      <section className="ss-sec">
        <h2>3 · Method</h2>
        <p>
          Each wall is filled with EcoCocon straw panels: solid stretches become vertical
          STANDARD panels (≤ 850 mm wide), each opening gets a LINTEL band above and, for
          windows, a SILL band below; the opening itself is a void. Panels tile each wall
          exactly and are checked against EcoCocon size ranges (standard 400–850 × 400–3000 mm;
          lintel/sill height 424–850 mm). Out-of-range panels are flagged.
        </p>
        <p className="ss-note">
          Scope: walls only (the 4-wall shell). Floor and roof panelization are planned but
          not part of this document. Corners are butt joints (node detailing pending).
        </p>
      </section>

      <section className="ss-sec ss-break">
        <h2>4 · Panel schedule</h2>
        <table className="ss-shape">
          <thead><tr><th>View</th><th>Type</th><th>Count</th><th>Size (mm)</th><th>Status</th></tr></thead>
          <tbody>
            {bom.map((r) => {
              const key = `${r.type}:${r.w}x${r.h}`;
              return (
                <tr key={key}>
                  <td>{images?.shapes[key] ? <img className="ss-thumb" src={images.shapes[key]} alt={r.label} /> : null}</td>
                  <td>{r.label}</td>
                  <td>×{r.count}</td>
                  <td>{r.w} × {r.h}</td>
                  <td>{r.ok ? 'ok' : 'out of range'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="ss-sec">
        <h2>5 · Cost estimate</h2>
        <table><tbody>
          <tr><td>Rate (assumption)</td><td>€{rate}/m²</td></tr>
          <tr><td>Net panel area</td><td>{panelAreaM2.toFixed(1)} m²</td></tr>
          <tr><td><b>Total (panels)</b></td><td><b>€{Math.round(cost).toLocaleString()}</b></td></tr>
        </tbody></table>
        <p className="ss-note">
          Estimate = panel area × rate. Rate is an editable assumption (EcoCocon prices by
          exterior wall area excluding openings); set your supplier’s rate.
        </p>
      </section>

      <footer className="ss-foot">StrawPanel Wall · panelizer · {date}</footer>
    </div>
  );
}
