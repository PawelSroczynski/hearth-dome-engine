import type { OvenParams, OvenResult } from '../core/engine';
import { domeToSTL, domeToJSON, download } from '../render/exporters';

export function ExportBar({ params, result }: { params: OvenParams; result: OvenResult }) {
  const slug = `dome_${params.base}_f${params.frequency}`;
  return (
    <section className="panel exportbar">
      <button onClick={() => download(`${slug}.stl`, domeToSTL(result), 'model/stl')}>STL</button>
      <button onClick={() => download(`${slug}.json`, domeToJSON(params, result), 'application/json')}>JSON</button>
      <button onClick={() => window.print()}>Spec PDF</button>
    </section>
  );
}
