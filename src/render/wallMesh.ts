import * as THREE from 'three';
import { panelize, type WallSpec, type Panel } from '../core/wall/panelize';

export const PANEL_COLORS: Record<string, number> = {
  standard: 0xd9b27a, // straw clay
  lintel: 0xc24d2c,   // terracotta (over openings)
  sill: 0x8a9a5b,     // olive (under windows)
  cassette: 0x9c7b52, // floor cassette (timber)
  bad: 0x9c3b2c,      // out-of-range flag
};

/**
 * Build the EcoCocon wall: one extruded box per panel (voids skipped), coloured
 * by type. Wall lies in the XY plane (x = length, y = height), thickness along
 * +Z; centred on X, standing on the floor (y = 0). Scene units = metres.
 */
export function buildWallGroup(spec: WallSpec): { group: THREE.Group; panels: Panel[] } {
  const group = new THREE.Group();
  const panels = panelize(spec);
  const t = spec.thicknessMm / 1000;
  const L = spec.lengthMm;

  for (const p of panels) {
    if (p.type === 'void') continue;
    const w = p.w / 1000, h = p.h / 1000;
    const geo = new THREE.BoxGeometry(w * 0.985, h * 0.985, t); // small gap to read seams
    const color = p.ok ? PANEL_COLORS[p.type] : PANEL_COLORS.bad;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
    mesh.position.set((p.x + p.w / 2 - L / 2) / 1000, (p.y + p.h / 2) / 1000, 0);
    // shapeLabel = BOM key so the dome's picking + highlight effects work for panels too
    mesh.userData = { shapeLabel: `${p.type}:${Math.round(p.w)}x${Math.round(p.h)}`, panelType: p.type, w: p.w, h: p.h, ok: p.ok, baseColor: color };
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geo, 1);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.5 }));
    line.position.copy(mesh.position);
    group.add(line);
  }
  return { group, panels };
}
