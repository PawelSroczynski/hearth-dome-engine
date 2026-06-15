import type { OvenParams, OvenResult } from '../core/engine';
import { domeToSTL, domeToJSON, bricksToZip, mouldsToZip, download } from '../render/exporters';
import { makeSpecImages } from '../render/snapshot';
import { useOven } from '../store';

export function ExportBar({ params, result }: { params: OvenParams; result: OvenResult }) {
  const slug = `dome_${params.base}_f${params.frequency}`;
  const view = useOven((s) => s.view);
  const mouldWallMm = useOven((s) => s.mouldWallMm);
  const mouldFlangeMm = useOven((s) => s.mouldFlangeMm);
  const setSpecImages = useOven((s) => s.setSpecImages);

  const printSpec = () => {
    const images = makeSpecImages(result, view, {
      innerRMm: result.specs.innerDiaMm / 2, thicknessMm: result.specs.wallMm,
      wallMm: mouldWallMm, flangeMm: mouldFlangeMm,
    });
    setSpecImages(images);
    // let the spec sheet render the images before opening the print dialog
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };
  const zip = view === 'mould'
    ? { name: `${slug}_mould-types.zip`, bytes: () => mouldsToZip(result, mouldWallMm, mouldFlangeMm), label: 'Mould types .zip' }
    : { name: `${slug}_brick-types.zip`, bytes: () => bricksToZip(result), label: 'Brick types .zip' };
  return (
    <section className="panel exportbar">
      <button onClick={() => download(`${slug}.stl`, domeToSTL(result), 'model/stl')}>STL</button>
      <button onClick={() => download(zip.name, zip.bytes(), 'application/zip')}>{zip.label}</button>
      <button onClick={() => download(`${slug}.json`, domeToJSON(params, result), 'application/json')}>JSON</button>
      <button onClick={printSpec}>Spec PDF</button>
    </section>
  );
}
