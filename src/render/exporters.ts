import { BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { buildDomeGroup, buildBrickGeometry } from './domeMesh';
import type { OvenParams, OvenResult } from '../core/engine';
import type { GoldbergFace } from '../core/goldberg/dual';
import { mouldShell, type MouldParams } from '../core/bricks/mould';
import { mmRound, m2Round, m3Round } from '../core/bricks/specs';
import { makeZip } from './zip';

/** ASCII STL of the dome mesh (mm units) for 3D printing / fabrication. */
export function domeToSTL(result: OvenResult): string {
  const group = buildDomeGroup(result.faces, result.up, result.specs.innerDiaMm / 2);
  group.scale.setScalar(1000); // metres back to mm
  group.updateMatrixWorld(true);
  return new STLExporter().parse(group);
}

/** ASCII STL (mm) of a SINGLE brick — the exact piece shown in the schedule. */
export function brickToSTL(face: GoldbergFace, innerDiaMm: number, wallMm: number): string {
  const geom = buildBrickGeometry(face, innerDiaMm / 2, wallMm);
  const group = new Group();
  group.add(new Mesh(geom, new MeshBasicMaterial()));
  group.scale.setScalar(1000); // metres back to mm
  group.updateMatrixWorld(true);
  return new STLExporter().parse(group);
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** ZIP of one STL per unique brick type (mm), like the original's brick-types archive. */
export function bricksToZip(result: OvenResult): Uint8Array {
  const entries = result.shapes.map((s) => ({
    name: `${slugify(s.label)}_x${s.count}.stl`,
    content: brickToSTL(s.face, result.specs.innerDiaMm, result.specs.wallMm),
  }));
  return makeZip(entries);
}

/** ASCII STL (mm) of a single brick's casting MOULD. */
export function mouldToSTL(face: GoldbergFace, p: MouldParams): string {
  const m = mouldShell(face, p);
  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(new Float32Array(m.positions), 3));
  geom.computeVertexNormals();
  const group = new Group();
  group.add(new Mesh(geom, new MeshBasicMaterial())); // already in mm
  group.updateMatrixWorld(true);
  return new STLExporter().parse(group);
}

/** ZIP of one MOULD STL per unique brick type (mm). */
export function mouldsToZip(result: OvenResult, wallMm: number, flangeMm: number): Uint8Array {
  const base = { innerRMm: result.specs.innerDiaMm / 2, thicknessMm: result.specs.wallMm, wallMm, flangeMm };
  const entries = result.shapes.map((s) => ({
    name: `${slugify(s.label)}_mould_x${s.count}.stl`,
    content: mouldToSTL(s.face, base),
  }));
  return makeZip(entries);
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
      shapes: result.shapes.map((s) => ({
        label: s.label, sides: s.sides, count: s.count,
        edgeMm: s.edgeMm.map(mmRound), spanMm: mmRound(s.spanMm),
      })),
      specs: {
        outerDiaMm: mmRound(result.specs.outerDiaMm),
        innerDiaMm: mmRound(result.specs.innerDiaMm),
        wallMm: mmRound(result.specs.wallMm),
        heightMm: mmRound(result.specs.heightMm),
        floorAreaM2: m2Round(result.specs.floorAreaM2),
        cookVolumeM3: m3Round(result.specs.cookVolumeM3),
      },
    },
    null,
    2,
  );
}

export function download(filename: string, content: string | Uint8Array, mime: string): void {
  const blob = new Blob([content as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
