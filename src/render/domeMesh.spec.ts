import { describe, it, expect } from 'vitest';
import { Mesh } from 'three';
import { subdivideGeodesic } from '../core/solids/geodesic';
import { goldbergDual } from '../core/goldberg/dual';
import { domeAxis, domeCounts } from '../core/goldberg/hemisphere';
import { buildDomeGroup } from './domeMesh';

describe('buildDomeGroup', () => {
  it('emits exactly one filled mesh per kept brick (full + cut)', () => {
    const faces = goldbergDual(subdivideGeodesic('icosa', 4));
    const up = domeAxis('icosa');
    const { total } = domeCounts(faces, up);
    const group = buildDomeGroup(faces, up, 510);
    const meshes = group.children.filter((o) => o instanceof Mesh);
    expect(meshes.length).toBe(total); // 91 for icosa GP(4,0)
  });

  it('each brick mesh has a uniform per-face normal (flat panel)', () => {
    const faces = goldbergDual(subdivideGeodesic('octa', 3));
    const group = buildDomeGroup(faces, domeAxis('octa'), 510);
    const meshes = group.children.filter((o): o is Mesh => o instanceof Mesh);
    expect(meshes.length).toBeGreaterThan(0);
    for (const m of meshes) {
      const norm = (m.geometry.getAttribute('normal'));
      expect(norm.count).toBeGreaterThan(0);
      // all normals within a face identical (uniform)
      const x0 = norm.getX(0), y0 = norm.getY(0), z0 = norm.getZ(0);
      for (let i = 1; i < norm.count; i++) {
        expect(Math.abs(norm.getX(i) - x0) + Math.abs(norm.getY(i) - y0) + Math.abs(norm.getZ(i) - z0)).toBeLessThan(1e-9);
      }
    }
  });
});
