import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBuildingGroup } from './buildingMesh';
import { buildingFromWall } from '../core/building/model';
import type { WallSpec } from '../core/wall/panelize';

// Label textures are drawn on a <canvas>; stub the DOM so the renderer runs in node.
// (Module scope: must exist before the group is built at collection time.)
{
  const ctx = {
    font: '', fillStyle: '', textAlign: '', textBaseline: '',
    measureText: (t: string) => ({ width: t.length * 20 }),
    beginPath() {}, roundRect() {}, fill() {}, fillText() {},
  };
  const canvas = () => ({ width: 96, height: 32, getContext: () => ctx });
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => (tag === 'canvas' ? canvas() : {}),
  };
}

const WALL: WallSpec = {
  lengthMm: 6000, heightMm: 2700, thicknessMm: 400, targetWidthMm: 800, depthMm: 4000,
  openings: [{ x: 800, w: 1000, sillH: 0, headH: 2100 }, { x: 3600, w: 1600, sillH: 800, headH: 2100 }],
};
const HM = 2.7; // wall height in m

function buildLabels() {
  const m = buildingFromWall(WALL, 4000,
    { moduleWidthMm: 800, thicknessMm: 240, spanAxis: 'y' },
    { type: 'gable', pitchDeg: 30, ridgeAxis: 'x', moduleWidthMm: 800 });
  const g = buildBuildingGroup(m, false);
  g.updateMatrixWorld(true);
  const labels: THREE.Object3D[] = [];
  g.traverse((o) => { if (o.userData?.isLabel) labels.push(o); });
  return labels;
}
const worldNormal = (o: THREE.Object3D) =>
  new THREE.Vector3(0, 0, 1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion())).normalize();
const worldPos = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

describe('panel labels lie IN each panel surface (not facing the camera)', () => {
  const labels = buildLabels();
  const floor = labels.filter((l) => worldPos(l).y < 0.1);                                   // slab top y≈0.006
  const wall = labels.filter((l) => { const y = worldPos(l).y; return y >= 0.1 && y <= HM + 0.05; });
  const roof = labels.filter((l) => worldPos(l).y > HM + 0.05);

  it('produces labels on floor, walls and roof', () => {
    expect(labels.length).toBeGreaterThan(8);
    expect(floor.length).toBeGreaterThan(0);
    expect(wall.length).toBeGreaterThan(0);
    expect(roof.length).toBeGreaterThan(0);
  });

  it('floor labels lie flat (normal vertical)', () => {
    for (const l of floor) expect(Math.abs(worldNormal(l).y)).toBeGreaterThan(0.99);
  });

  it('wall labels lie in a vertical face, axis-aligned, normal pointing outward', () => {
    for (const l of wall) {
      const n = worldNormal(l), p = worldPos(l);
      expect(Math.abs(n.y)).toBeLessThan(1e-3);                          // vertical plane
      expect(Math.max(Math.abs(n.x), Math.abs(n.z))).toBeGreaterThan(0.99); // ⟂ to a rect wall
      expect(n.x * p.x + n.z * p.z).toBeGreaterThan(0);                  // faces away from centre
    }
  });

  it('roof labels lie in the slope (tilted, pointing up) on BOTH slopes', () => {
    let up = 0, down = 0;
    for (const l of roof) {
      const n = worldNormal(l);
      expect(n.y).toBeGreaterThan(0.2);                  // generally upward
      expect(Math.hypot(n.x, n.z)).toBeGreaterThan(0.1); // tilted, not flat → lies in slope
      if (n.z > 0.1) up++; if (n.z < -0.1) down++;
    }
    expect(up).toBeGreaterThan(0);
    expect(down).toBeGreaterThan(0);
  });
});
