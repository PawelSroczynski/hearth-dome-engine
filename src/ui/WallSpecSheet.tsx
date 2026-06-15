import { useOven } from '../store';
import { wallBom, THICKNESS_MIN, THICKNESS_MAX } from '../core/wall/panelize';
import { buildingFromWall, allWallPanels, floorCassettes, roofPanels } from '../core/building/model';
import { roofAreaMm2 } from '../core/roof/roofize';

/** Printable build document for the StrawPanel building (hidden on screen, @media print). */
export function WallSpecSheet() {
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
  const images = useOven((s) => s.specImages);
  const depth = wall.depthMm ?? 4000;
  const date = new Date().toISOString().slice(0, 10);

  const model = buildingFromWall(wall, depth,
    { moduleWidthMm: floorModuleMm, thicknessMm: floorThicknessMm, spanAxis: floorSpanAxis },
    { type: roofType, pitchDeg: roofPitchDeg, ridgeAxis: 'x', moduleWidthMm: roofModuleMm });
  const wpanels = allWallPanels(model).filter((p) => p.type !== 'void');
  const fpanels = floorCassettes(model);
  const rpanels = roofPanels(model);
  const bom = wallBom([...wpanels, ...fpanels, ...rpanels]);
  const solid = [...wpanels, ...fpanels, ...rpanels];
  const wallPanelM2 = wpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
  const floorM2 = fpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
  const roofM2 = roofAreaMm2(wall.lengthMm, depth, roofPitchDeg, roofType) / 1e6;
  const wallAreaM2 = (2 * (wall.lengthMm + depth) * wall.heightMm) / 1e6;
  const wallCost = wallPanelM2 * rate, floorCost = floorM2 * floorRate, roofCost = roofM2 * roofRate;
  const cost = wallCost + floorCost + roofCost;
  const flagged = solid.filter((p) => !p.ok).length;
  const thicknessOk = wall.thicknessMm >= THICKNESS_MIN && wall.thicknessMm <= THICKNESS_MAX;

  return (
    <div className="specsheet">
      <header className="ss-title">
        <h1>StrawPanel Building — Build Document</h1>
        <p className="ss-sub">
          {wall.lengthMm}×{depth} mm footprint · {wall.heightMm} mm high · {solid.length} panels (walls + floor) · {bom.length} types · generated {date}
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
          <tr><td>Wall shell area</td><td>{wallAreaM2.toFixed(1)} m²</td></tr>
          <tr><td>Wall panel area</td><td>{wallPanelM2.toFixed(1)} m²</td></tr>
          <tr><td>Floor area</td><td>{floorM2.toFixed(1)} m²</td></tr>
          <tr><td>Roof area ({roofType})</td><td>{roofM2.toFixed(1)} m²</td></tr>
          <tr><td>Panels (walls + floor + roof)</td><td>{solid.length}</td></tr>
          <tr><td>Unique types</td><td>{bom.length}</td></tr>
          <tr><td>Out of range</td><td>{flagged}</td></tr>
        </tbody></table>
      </section>

      <section className="ss-sec">
        <h2>3 · Method</h2>
        <p>
          Each wall is filled with StrawPanel modules: solid stretches become vertical
          STANDARD panels (≤ 850 mm wide), each opening gets a LINTEL band above and, for
          windows, a SILL band below; the opening itself is a void. Panels tile each wall
          exactly and are checked against the panel size ranges (standard 400–850 × 400–3000 mm;
          lintel/sill height 424–850 mm). Out-of-range panels are flagged.
        </p>
        <p>
          The floor (posadzka) is tiled with modular cassettes ({floorModuleMm} mm module,
          {floorThicknessMm} mm thick) covering the footprint.
        </p>
        <p className="ss-note">
          Scope: 4-wall shell + floor. Roof panelization is planned. Corners are butt
          joints (node detailing pending). Floor &amp; roof use our own modular catalog.
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
          <tr><td>Walls — {wallPanelM2.toFixed(1)} m² × €{rate}/m²</td><td>€{Math.round(wallCost).toLocaleString()}</td></tr>
          <tr><td>Floor — {floorM2.toFixed(1)} m² × €{floorRate}/m²</td><td>€{Math.round(floorCost).toLocaleString()}</td></tr>
          <tr><td>Roof — {roofM2.toFixed(1)} m² × €{roofRate}/m²</td><td>€{Math.round(roofCost).toLocaleString()}</td></tr>
          <tr><td><b>Total</b></td><td><b>€{Math.round(cost).toLocaleString()}</b></td></tr>
        </tbody></table>
        <p className="ss-note">
          Estimate = panel area × rate. Rates are editable assumptions (by exterior wall
          area excluding openings); set your supplier’s rates.
        </p>
      </section>

      <footer className="ss-foot">StrawPanel Wall · panelizer · {date}</footer>
    </div>
  );
}
