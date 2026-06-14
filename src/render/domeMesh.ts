import * as THREE from 'three';
import type { GoldbergFace } from '../core/goldberg/dual';
import { classifyFace, type Classification } from '../core/goldberg/hemisphere';
import { flattenFace } from '../core/bricks/panel';
import type { Vec3 } from '../core/solids/base';

export const BRICK_COLORS: Record<string, number> = {
  pentagon: 0xc24d2c, // terracotta
  hexagon: 0xd98e5a, // warm clay
  cut: 0x9c6b4a, // darker rim
};

function colorFor(face: GoldbergFace, kind: Classification): number {
  if (kind === 'cut') return BRICK_COLORS.cut;
  return face.sides === 5 ? BRICK_COLORS.pentagon : BRICK_COLORS.hexagon;
}

/**
 * Build a Three.js group for the dome: one filled polygon mesh per kept brick
 * (fan-triangulated from the face centre), scaled to the inner radius.
 * `below` faces are dropped. Pure geometry — no renderer/DOM needed.
 */
export function buildDomeGroup(
  faces: GoldbergFace[],
  up: Vec3,
  radiusMm: number,
  cut = 0,
): THREE.Group {
  const group = new THREE.Group();
  const r = radiusMm / 1000; // metres for sane scene units

  for (const face of faces) {
    const kind = classifyFace(face, up, cut);
    if (kind === 'below') continue;

    // FLAT brick: project corners to the face plane so the panel is genuinely
    // planar (not a fan bulging to a sphere-point that merely looks flat).
    const panel = flattenFace(face);
    const positions: number[] = [];
    const normals: number[] = [];
    const ctr = panel.centroid;
    const pn = panel.normal;
    const n = panel.corners.length;
    for (let i = 0; i < n; i++) {
      const a = panel.corners[i];
      const b = panel.corners[(i + 1) % n];
      positions.push(ctr[0] * r, ctr[1] * r, ctr[2] * r);
      positions.push(a[0] * r, a[1] * r, a[2] * r);
      positions.push(b[0] * r, b[1] * r, b[2] * r);
      for (let k = 0; k < 3; k++) normals.push(pn[0], pn[1], pn[2]);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    const mat = new THREE.MeshStandardMaterial({
      color: colorFor(face, kind),
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData = { sides: face.sides, kind };
    group.add(mesh);

    // brick outline (planar face boundary), nudged out to avoid z-fighting
    const edgePts: number[] = [];
    const o = 1.002;
    for (let i = 0; i < n; i++) {
      const a = panel.corners[i];
      const b = panel.corners[(i + 1) % n];
      edgePts.push(a[0] * r * o, a[1] * r * o, a[2] * r * o);
      edgePts.push(b[0] * r * o, b[1] * r * o, b[2] * r * o);
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
    group.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.55 })));
  }
  return group;
}

/** Orient the dome so the cut axis points to +Y (apex up) for the scene. */
export function alignUpToY(group: THREE.Group, up: Vec3): void {
  const from = new THREE.Vector3(up[0], up[1], up[2]).normalize();
  const to = new THREE.Vector3(0, 1, 0);
  group.quaternion.setFromUnitVectors(from, to);
}
