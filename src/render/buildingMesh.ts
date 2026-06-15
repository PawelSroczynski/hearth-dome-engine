import * as THREE from 'three';
import { panelizeSurface } from '../core/wall/panelize';
import { wallPlacements, footprintCenter, footprintBBox, floorCassettes, type BuildingModel } from '../core/building/model';
import { roofGeom, tileRect } from '../core/roof/roofize';
import { wallPanelFrame } from '../core/panel/wallPanel';
import { PANEL_COLORS } from './wallMesh';

const ROOF_T = 0.18; // roof slab thickness (m)
const STUD_D = 0.045; // stud depth across thickness (m)

/** Render a standard wall panel as its internal frame (twin studs + top/bottom plates). */
function addPanelFrame(group: THREE.Group, p: { w: number; h: number; type: string; ok: boolean }, cx: number, cy: number, cz: number, theta: number, tM: number) {
  const pg = new THREE.Group();
  pg.position.set(cx, cy, cz); pg.rotation.y = theta;
  const Wm = p.w / 1000, Hm = p.h / 1000;
  const zoff = tM / 2 - STUD_D / 2;
  const tag = { shapeLabel: `${p.type}:${Math.round(p.w)}x${Math.round(p.h)}`, panelType: p.type, w: p.w, h: p.h, ok: p.ok };
  for (const mbr of wallPanelFrame({ widthMm: p.w, heightMm: p.h, studPitchMm: 600, studWidthMm: 45, plateMm: 45 })) {
    const mw = mbr.w / 1000, mh = mbr.h / 1000;
    const lx = (mbr.x + mbr.w / 2) / 1000 - Wm / 2;
    const ly = (mbr.y + mbr.h / 2) / 1000 - Hm / 2;
    const isPlate = mbr.el === 'plate';
    const color = isPlate ? 0xcdb38a : 0xb9935f;
    const geo = new THREE.BoxGeometry(mw, mh, isPlate ? tM : STUD_D);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 }));
    mesh.position.set(lx, ly, isPlate ? 0 : (mbr.branch === 'interior' ? zoff : -zoff));
    mesh.userData = { ...tag, baseColor: color };
    pg.add(mesh);
  }
  group.add(pg);
}

function addSlope(group: THREE.Group, origin: THREE.Vector3, uDir: THREE.Vector3, vDir: THREE.Vector3, widthMm: number, rafterMm: number, moduleMm: number) {
  const sg = new THREE.Group();
  // right-handed basis (local x=uDir, y=normal, z=vDir): normal = vDir × uDir so the
  // matrix is a proper rotation (uDir × vDir would be a reflection → bad quaternion).
  const normal = new THREE.Vector3().copy(vDir).cross(uDir).normalize();
  sg.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(uDir, normal, vDir));
  sg.position.copy(origin);
  for (const p of tileRect(widthMm, rafterMm, moduleMm, 'roof')) {
    const w = p.w / 1000, len = p.h / 1000;
    const geo = new THREE.BoxGeometry(w * 0.985, ROOF_T, len * 0.985);
    const color = p.ok ? PANEL_COLORS.roof : PANEL_COLORS.bad;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
    mesh.position.set(p.x / 1000 + w / 2, ROOF_T / 2, p.y / 1000 + len / 2);
    mesh.userData = { shapeLabel: `roof:${Math.round(p.w)}x${Math.round(p.h)}`, panelType: 'roof', w: p.w, h: p.h, ok: p.ok, baseColor: color };
    sg.add(mesh);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.4 }));
    line.position.copy(mesh.position); sg.add(line);
  }
  group.add(sg);
}

function addTriangle(group: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, baseMm: number, heightMm: number, ok: boolean) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 3));
  geo.computeVertexNormals();
  const color = ok ? PANEL_COLORS.gable : PANEL_COLORS.bad;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  mesh.userData = { shapeLabel: `gable:${Math.round(baseMm)}x${Math.round(heightMm)}`, panelType: 'gable', w: baseMm, h: heightMm, ok };
  group.add(mesh);
}

function addRoof(group: THREE.Group, m: BuildingModel) {
  const { L, D } = footprintBBox(m.footprint);
  const Lm = L / 1000, Dm = D / 1000, Hm = m.wallHeightMm / 1000;
  if (m.roof.type === 'flat') {
    // horizontal roof deck on top of the walls
    for (const p of tileRect(L, D, m.roof.moduleWidthMm, 'roof')) {
      const w = p.w / 1000, h = p.h / 1000;
      const geo = new THREE.BoxGeometry(w * 0.985, ROOF_T, h * 0.985);
      const color = p.ok ? PANEL_COLORS.roof : PANEL_COLORS.bad;
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
      mesh.position.set((p.x + p.w / 2 - L / 2) / 1000, Hm + ROOF_T / 2, (p.y + p.h / 2 - D / 2) / 1000);
      mesh.userData = { shapeLabel: `roof:${Math.round(p.w)}x${Math.round(p.h)}`, panelType: 'roof', w: p.w, h: p.h, ok: p.ok, baseColor: color };
      group.add(mesh);
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.4 }));
      line.position.copy(mesh.position); group.add(line);
    }
    return;
  }
  const g = roofGeom(L, D, m.roof.pitchDeg, m.roof.type);
  const riseM = g.riseMm / 1000;
  const mod = m.roof.moduleWidthMm;
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  if (m.roof.type === 'gable') {
    const rafter = Math.hypot(Dm / 2, riseM);
    // front slope, and back slope = front rotated 180° about the vertical ridge axis
    // (proper rotation realising the mirror → symmetric slopes, consistent outward normals)
    addSlope(group, V(-Lm / 2, Hm, -Dm / 2), V(1, 0, 0), V(0, riseM, Dm / 2).normalize(), L, rafter * 1000, mod);
    addSlope(group, V(Lm / 2, Hm, Dm / 2), V(-1, 0, 0), V(0, riseM, -Dm / 2).normalize(), L, rafter * 1000, mod);
    for (const sx of [-Lm / 2, Lm / 2])
      addTriangle(group, V(sx, Hm, -Dm / 2), V(sx, Hm, Dm / 2), V(sx, Hm + riseM, 0), g.gableBaseMm, g.gableHeightMm, g.gableHeightMm <= 4000.5);
  } else {
    const rafter = Math.hypot(Dm, riseM);
    addSlope(group, V(-Lm / 2, Hm, -Dm / 2), V(1, 0, 0), V(0, riseM, Dm).normalize(), L, rafter * 1000, mod);
    for (const sx of [-Lm / 2, Lm / 2])
      addTriangle(group, V(sx, Hm, -Dm / 2), V(sx, Hm, Dm / 2), V(sx, Hm + riseM, Dm / 2), g.gableBaseMm, g.gableHeightMm, g.gableHeightMm <= 4000.5);
  }
}

/**
 * Build the whole StrawPanel building shell: every footprint edge becomes a wall,
 * each wall panelized and placed in 3D (panel width along the edge, height up,
 * thickness along the edge normal). Centred on the footprint, standing on y = 0.
 */
export function buildBuildingGroup(m: BuildingModel, frameView = false): THREE.Group {
  const group = new THREE.Group();
  const c = footprintCenter(m.footprint);
  const t = m.wallThicknessMm / 1000;

  for (const pl of wallPlacements(m)) {
    const theta = Math.atan2(-pl.dir.y, pl.dir.x); // rotate box +x to the (plan→world XZ) edge dir
    for (const p of panelizeSurface(pl.surface)) {
      if (p.type === 'void') continue;
      const u = p.x + p.w / 2;
      const planX = pl.a.x + pl.dir.x * u, planY = pl.a.y + pl.dir.y * u;
      if (frameView && p.type === 'standard') {
        addPanelFrame(group, p, (planX - c.x) / 1000, (p.y + p.h / 2) / 1000, (planY - c.y) / 1000, theta, t);
        continue;
      }
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

  // floor cassettes (flat slabs, top flush at y = 0, sitting below the walls)
  const { L, D } = footprintBBox(m.footprint);
  const ft = m.floor.thicknessMm / 1000;
  for (const cz of floorCassettes(m)) {
    const w = cz.w / 1000, h = cz.h / 1000;
    const geo = new THREE.BoxGeometry(w * 0.985, ft, h * 0.985);
    const color = cz.ok ? PANEL_COLORS.cassette : PANEL_COLORS.bad;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }));
    mesh.position.set((cz.x + cz.w / 2 - L / 2) / 1000, -ft / 2, (cz.y + cz.h / 2 - D / 2) / 1000);
    mesh.userData = { shapeLabel: `cassette:${Math.round(cz.w)}x${Math.round(cz.h)}`, panelType: 'cassette', w: cz.w, h: cz.h, ok: cz.ok, baseColor: color };
    group.add(mesh);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1),
      new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.4 }));
    line.position.copy(mesh.position);
    group.add(line);
  }

  addRoof(group, m);
  return group;
}
