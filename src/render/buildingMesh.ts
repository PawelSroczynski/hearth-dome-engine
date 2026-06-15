import * as THREE from 'three';
import { panelizeSurface } from '../core/wall/panelize';
import { wallPlacements, footprintCenter, type BuildingModel } from '../core/building/model';
import { PANEL_COLORS } from './wallMesh';

/**
 * Build the whole StrawPanel building shell: every footprint edge becomes a wall,
 * each wall panelized and placed in 3D (panel width along the edge, height up,
 * thickness along the edge normal). Centred on the footprint, standing on y = 0.
 */
export function buildBuildingGroup(m: BuildingModel): THREE.Group {
  const group = new THREE.Group();
  const c = footprintCenter(m.footprint);
  const t = m.wallThicknessMm / 1000;

  for (const pl of wallPlacements(m)) {
    const theta = Math.atan2(-pl.dir.y, pl.dir.x); // rotate box +x to the (plan→world XZ) edge dir
    for (const p of panelizeSurface(pl.surface)) {
      if (p.type === 'void') continue;
      const u = p.x + p.w / 2;
      const planX = pl.a.x + pl.dir.x * u, planY = pl.a.y + pl.dir.y * u;
      const w = p.w / 1000, h = p.h / 1000;
      const geo = new THREE.BoxGeometry(w * 0.985, h * 0.985, t);
      const color = p.ok ? PANEL_COLORS[p.type] : PANEL_COLORS.bad;
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
      mesh.position.set((planX - c.x) / 1000, (p.y + p.h / 2) / 1000, (planY - c.y) / 1000);
      mesh.rotation.y = theta;
      mesh.userData = { shapeLabel: `${p.type}:${Math.round(p.w)}x${Math.round(p.h)}`, panelType: p.type, w: p.w, h: p.h, ok: p.ok, baseColor: color };
      group.add(mesh);

      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1),
        new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.5 }));
      line.position.copy(mesh.position); line.rotation.y = theta;
      group.add(line);
    }
  }
  return group;
}
