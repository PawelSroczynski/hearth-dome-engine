import * as THREE from 'three';
import type { GoldbergFace } from '../core/goldberg/dual';
import { classifyFace, type Classification } from '../core/goldberg/hemisphere';
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

    const positions: number[] = [];
    const c = face.center;
    const n = face.corners.length;
    for (let i = 0; i < n; i++) {
      const a = face.corners[i];
      const b = face.corners[(i + 1) % n];
      positions.push(c[0] * r, c[1] * r, c[2] * r);
      positions.push(a[0] * r, a[1] * r, a[2] * r);
      positions.push(b[0] * r, b[1] * r, b[2] * r);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: colorFor(face, kind),
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData = { sides: face.sides, kind };
    group.add(mesh);
  }
  return group;
}

/** Orient the dome so the cut axis points to +Y (apex up) for the scene. */
export function alignUpToY(group: THREE.Group, up: Vec3): void {
  const from = new THREE.Vector3(up[0], up[1], up[2]).normalize();
  const to = new THREE.Vector3(0, 1, 0);
  group.quaternion.setFromUnitVectors(from, to);
}
