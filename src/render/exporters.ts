import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { buildDomeGroup } from './domeMesh';
import type { OvenParams, OvenResult } from '../core/engine';
import { inchRound, ft2Round, ft3Round } from '../core/bricks/specs';

/** ASCII STL of the dome mesh (mm units) for 3D printing / fabrication. */
export function domeToSTL(result: OvenResult): string {
  const group = buildDomeGroup(result.faces, result.up, result.specs.innerDiaMm / 2);
  group.scale.setScalar(1000); // metres back to mm
  group.updateMatrixWorld(true);
  return new STLExporter().parse(group);
}

/** Portable project file (params + computed summary). */
export function domeToJSON(params: OvenParams, result: OvenResult): string {
  return JSON.stringify(
    {
      tool: 'hearth-dome-engine',
      version: 2,
      params,
      schedule: { total: result.total, full: result.full, cut: result.cut,
        sphereFaces: result.sphereFaces, pentagons: result.pentagons, hexagons: result.hexagons },
      specs: {
        outerIn: inchRound(result.specs.outerDiaMm),
        innerIn: inchRound(result.specs.innerDiaMm),
        wallIn: inchRound(result.specs.wallMm),
        heightIn: inchRound(result.specs.heightMm),
        floorFt2: ft2Round(result.specs.floorAreaM2),
        cookFt3: ft3Round(result.specs.cookVolumeM3),
      },
    },
    null,
    2,
  );
}

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
