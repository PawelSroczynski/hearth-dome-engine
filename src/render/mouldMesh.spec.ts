import { describe, it, expect } from 'vitest';
import { Mesh } from 'three';
import { computeOven, DEFAULT_PARAMS } from '../core/engine';
import { buildMouldGroup } from './mouldMesh';

describe('buildMouldGroup', () => {
  it('emits one mesh per unique shape, all sitting on the floor (Y>=0)', () => {
    const r = computeOven(DEFAULT_PARAMS);
    const group = buildMouldGroup(r.shapes, {
      innerRMm: r.specs.innerDiaMm / 2, thicknessMm: r.specs.wallMm, wallMm: 8, flangeMm: 6,
    });
    const meshes = group.children.filter((o): o is Mesh => o instanceof Mesh);
    expect(meshes.length).toBe(r.shapes.length);
    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position');
      let minY = Infinity;
      for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
      expect(minY).toBeGreaterThanOrEqual(-1e-6); // floor at Y=0
    }
  });
});
