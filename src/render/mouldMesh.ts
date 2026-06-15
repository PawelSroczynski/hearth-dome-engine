import * as THREE from 'three';
import { mouldShell, type MouldParams } from '../core/bricks/mould';
import type { BrickShape } from '../core/bricks/schedule';

/**
 * Lay the unique mould shells out in a row on the floor (Y up) — the "mould
 * tray" you'd 3D-print. Local frame (z = height) maps to scene (X, Y=height, Z).
 */
export function buildMouldGroup(shapes: BrickShape[], params: MouldParams): THREE.Group {
  const group = new THREE.Group();
  const gap = 0.04;
  let xOff = 0;

  for (const s of shapes) {
    const m = mouldShell(s.face, params);
    const arr = new Float32Array(m.positions.length);
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < m.positions.length; i += 3) {
      const x = m.positions[i] / 1000, y = m.positions[i + 1] / 1000, z = m.positions[i + 2] / 1000;
      arr[i] = x; arr[i + 1] = z; arr[i + 2] = y; // local (x,y,z) -> scene (x, height, depth)
      if (x < minX) minX = x; if (x > maxX) maxX = x;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
      color: 0xb9ad97, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
    }));
    mesh.userData = { shapeLabel: s.label, baseColor: 0xb9ad97 };
    const width = maxX - minX;
    mesh.position.x = xOff - minX;
    group.add(mesh);
    xOff += width + gap;
  }
  group.position.x = -xOff / 2; // centre the row
  return group;
}
