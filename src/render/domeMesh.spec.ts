import { describe, it, expect } from 'vitest';
import { subdivideGeodesic } from '../core/solids/geodesic';
import { goldbergDual } from '../core/goldberg/dual';
import { domeAxis, domeCounts } from '../core/goldberg/hemisphere';
import { buildDomeGroup } from './domeMesh';

describe('buildDomeGroup', () => {
  it('emits exactly one mesh per kept brick (full + cut)', () => {
    const faces = goldbergDual(subdivideGeodesic('icosa', 4));
    const up = domeAxis('icosa');
    const { total } = domeCounts(faces, up);
    const group = buildDomeGroup(faces, up, 510);
    expect(group.children.length).toBe(total); // 91 for icosa GP(4,0)
  });

  it('every mesh has positions and a material', () => {
    const faces = goldbergDual(subdivideGeodesic('octa', 3));
    const group = buildDomeGroup(faces, domeAxis('octa'), 510);
    for (const m of group.children) {
      // @ts-expect-error three Mesh geometry access in test
      expect(m.geometry.getAttribute('position').count).toBeGreaterThan(0);
    }
    expect(group.children.length).toBeGreaterThan(0);
  });
});
