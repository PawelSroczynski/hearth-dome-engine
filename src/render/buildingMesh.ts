import * as THREE from 'three';
import { panelizeSurface, wallBom } from '../core/wall/panelize';
import { wallPlacements, footprintCenter, footprintBBox, platformBBox, floorCassettes, allWallPanels, roofPanels, type BuildingModel } from '../core/building/model';
import { roofGeom, tileRect } from '../core/roof/roofize';
import { wallPanelFrame } from '../core/panel/wallPanel';
import { PANEL_COLORS, panelColor } from './wallMesh';

const ROOF_T = 0.18; // roof slab thickness (m)
const STUD_D = 0.045; // stud depth across thickness (m)

/** Per-build label context: maps a panel key to its typological name (Standard A…),
 *  with a material cache so identical labels share one canvas texture. */
interface LabelCtx { labelFor: (key: string) => string; cache: Map<string, THREE.MeshBasicMaterial> }

/** Orient a label flat in a roof plane (local +Y = outward normal) with text-up along
 *  the up-slope (+Z) — a proper rotation, so the text isn't upside-down or mirrored. */
function orientRoofLabel(lb: THREE.Object3D) {
  lb.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
}

/** A flat stamp with the panel's identification name, lying IN the panel surface
 *  (a textured plane; caller orients/positions it on the face). Factory feel. */
function panelLabel(ctx: LabelCtx, key: string): THREE.Mesh {
  const text = ctx.labelFor(key);
  let mat = ctx.cache.get(text);
  if (!mat) {
    const fs = 44, pad = 12;
    const meas = document.createElement('canvas').getContext('2d')!;
    meas.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
    const tw = Math.ceil(meas.measureText(text).width);
    const cv = document.createElement('canvas');
    cv.width = tw + pad * 2; cv.height = fs + pad * 2;
    const cx = cv.getContext('2d')!;
    cx.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
    cx.fillStyle = 'rgba(24,18,12,0.72)';
    cx.beginPath(); cx.roundRect(0, 0, cv.width, cv.height, 12); cx.fill();
    cx.fillStyle = '#f4e8d4'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(text, cv.width / 2, cv.height / 2 + 2);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    ctx.cache.set(text, mat);
  }
  const img = (mat.map as THREE.CanvasTexture).image as HTMLCanvasElement;
  const hM = 0.12, aspect = img.width / img.height;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(hM * aspect, hM), mat);
  mesh.userData.isLabel = true; // plane normal = local +Z; caller orients it onto the face
  return mesh;
}

/** Render a standard wall panel as its internal frame (twin studs + top/bottom plates). */
function addPanelFrame(group: THREE.Group, p: { w: number; h: number; type: string; ok: boolean }, cx: number, cy: number, cz: number, theta: number, tM: number) {
  const pg = new THREE.Group();
  pg.position.set(cx, cy, cz); pg.rotation.y = theta;
  const Wm = p.w / 1000, Hm = p.h / 1000;
  const zoff = tM / 2 - STUD_D / 2;
  const tag = { shapeLabel: `${p.type}:${Math.round(p.w)}x${Math.round(p.h)}`, panelType: p.type, w: p.w, h: p.h, ok: p.ok };
  for (const mbr of wallPanelFrame({ widthMm: p.w, heightMm: p.h, studPitchMm: 600, studWidthMm: 45, plateMm: 45, noggingPitchMm: 600 })) {
    const mw = mbr.w / 1000, mh = mbr.h / 1000;
    const lx = (mbr.x + mbr.w / 2) / 1000 - Wm / 2;
    const ly = (mbr.y + mbr.h / 2) / 1000 - Hm / 2;
    const isPlate = mbr.el === 'plate';
    const color = isPlate ? 0xcdb38a : mbr.el === 'nogging' ? 0xa9824f : 0xb9935f;
    const geo = new THREE.BoxGeometry(mw, mh, isPlate ? tM : STUD_D);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 }));
    mesh.position.set(lx, ly, isPlate ? 0 : (mbr.branch === 'interior' ? zoff : -zoff));
    mesh.userData = { ...tag, baseColor: color };
    pg.add(mesh);
  }
  group.add(pg);
}

/** Render a floor cassette as joists + end beams (frame view). */
function addFloorFrame(group: THREE.Group, cz: { x: number; y: number; w: number; h: number; ok: boolean }, L: number, D: number, ft: number) {
  const w = cz.w / 1000, h = cz.h / 1000;
  const pg = new THREE.Group();
  pg.position.set((cz.x + cz.w / 2 - L / 2) / 1000, -ft / 2, (cz.y + cz.h / 2 - D / 2) / 1000);
  const tag = { shapeLabel: `cassette:${Math.round(cz.w)}x${Math.round(cz.h)}`, panelType: 'cassette', w: cz.w, h: cz.h, ok: cz.ok, baseColor: 0x9c7b52 };
  for (const mbr of wallPanelFrame({ widthMm: cz.w, heightMm: cz.h, studPitchMm: 600, studWidthMm: 45, plateMm: 45 })) {
    const mw = mbr.w / 1000, mh = mbr.h / 1000;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(mw, ft, mh), new THREE.MeshStandardMaterial({ color: 0x9c7b52, roughness: 0.9, metalness: 0 }));
    mesh.position.set((mbr.x + mbr.w / 2) / 1000 - w / 2, 0, (mbr.y + mbr.h / 2) / 1000 - h / 2);
    mesh.userData = { ...tag };
    pg.add(mesh);
  }
  group.add(pg);
}

function addSlope(group: THREE.Group, origin: THREE.Vector3, uDir: THREE.Vector3, vDir: THREE.Vector3, widthMm: number, rafterMm: number, moduleMm: number, frameView = false, labels?: LabelCtx) {
  const sg = new THREE.Group();
  // right-handed basis (local x=uDir, y=normal, z=vDir): normal = vDir × uDir so the
  // matrix is a proper rotation (uDir × vDir would be a reflection → bad quaternion).
  const normal = new THREE.Vector3().copy(vDir).cross(uDir).normalize();
  sg.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(uDir, normal, vDir));
  sg.position.copy(origin);
  if (frameView) {
    for (const mbr of wallPanelFrame({ widthMm, heightMm: rafterMm, studPitchMm: moduleMm, studWidthMm: 45, plateMm: 45 })) {
      const mw = mbr.w / 1000, mh = mbr.h / 1000;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(mw, ROOF_T, mh), new THREE.MeshStandardMaterial({ color: 0xb56a3d, roughness: 0.9, metalness: 0 }));
      mesh.position.set((mbr.x + mbr.w / 2) / 1000, ROOF_T / 2, (mbr.y + mbr.h / 2) / 1000);
      mesh.userData = { shapeLabel: 'roof', panelType: 'roof', ok: true };
      sg.add(mesh);
    }
    group.add(sg);
    return;
  }
  for (const p of tileRect(widthMm, rafterMm, moduleMm, 'roof')) {
    const w = p.w / 1000, len = p.h / 1000;
    const geo = new THREE.BoxGeometry(w * 0.996, ROOF_T, len * 0.996);
    const key = `roof:${Math.round(p.w)}x${Math.round(p.h)}`;
    const color = p.ok ? panelColor(key) : PANEL_COLORS.bad;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
    mesh.position.set(p.x / 1000 + w / 2, ROOF_T / 2, p.y / 1000 + len / 2);
    mesh.userData = { shapeLabel: key, panelType: 'roof', w: p.w, h: p.h, ok: p.ok, baseColor: color };
    sg.add(mesh);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.4 }));
    line.position.copy(mesh.position); line.userData = { outlineFor: key, baseOpacity: 0.4 }; sg.add(line);
    if (labels) {
      const lb = panelLabel(labels, key);
      orientRoofLabel(lb); // lie in the slope plane, text-up = up-slope (not upside-down)
      lb.position.set(p.x / 1000 + w / 2, ROOF_T + 0.006, p.y / 1000 + len / 2); // just above the slab top face
      sg.add(lb);
    }
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

function addRoof(group: THREE.Group, m: BuildingModel, frameView = false, labels?: LabelCtx) {
  const { L, D } = footprintBBox(m.footprint);
  const Lm = L / 1000, Dm = D / 1000, Hm = m.wallHeightMm / 1000;
  if (m.roof.type === 'flat') {
    if (frameView) {
      const pg = new THREE.Group(); pg.position.set(0, Hm + ROOF_T / 2, 0);
      for (const mbr of wallPanelFrame({ widthMm: L, heightMm: D, studPitchMm: m.roof.moduleWidthMm, studWidthMm: 45, plateMm: 45 })) {
        const mw = mbr.w / 1000, mh = mbr.h / 1000;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(mw, ROOF_T, mh), new THREE.MeshStandardMaterial({ color: 0xb56a3d, roughness: 0.9, metalness: 0 }));
        mesh.position.set((mbr.x + mbr.w / 2) / 1000 - Lm / 2, 0, (mbr.y + mbr.h / 2) / 1000 - Dm / 2);
        mesh.userData = { shapeLabel: 'roof', panelType: 'roof', ok: true };
        pg.add(mesh);
      }
      group.add(pg); return;
    }
    // horizontal roof deck on top of the walls
    for (const p of tileRect(L, D, m.roof.moduleWidthMm, 'roof')) {
      const w = p.w / 1000, h = p.h / 1000;
      const geo = new THREE.BoxGeometry(w * 0.996, ROOF_T, h * 0.996);
      const key = `roof:${Math.round(p.w)}x${Math.round(p.h)}`;
      const color = p.ok ? panelColor(key) : PANEL_COLORS.bad;
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
      mesh.position.set((p.x + p.w / 2 - L / 2) / 1000, Hm + ROOF_T / 2, (p.y + p.h / 2 - D / 2) / 1000);
      mesh.userData = { shapeLabel: key, panelType: 'roof', w: p.w, h: p.h, ok: p.ok, baseColor: color };
      group.add(mesh);
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.4 }));
      line.position.copy(mesh.position); line.userData = { outlineFor: key, baseOpacity: 0.4 }; group.add(line);
      if (labels) {
        const lb = panelLabel(labels, key); orientRoofLabel(lb);
        lb.position.copy(mesh.position); lb.position.y += ROOF_T / 2 + 0.006; group.add(lb);
      }
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
    addSlope(group, V(-Lm / 2, Hm, -Dm / 2), V(1, 0, 0), V(0, riseM, Dm / 2).normalize(), L, rafter * 1000, mod, frameView, labels);
    addSlope(group, V(Lm / 2, Hm, Dm / 2), V(-1, 0, 0), V(0, riseM, -Dm / 2).normalize(), L, rafter * 1000, mod, frameView, labels);
    for (const sx of [-Lm / 2, Lm / 2])
      addTriangle(group, V(sx, Hm, -Dm / 2), V(sx, Hm, Dm / 2), V(sx, Hm + riseM, 0), g.gableBaseMm, g.gableHeightMm, g.gableHeightMm <= 4000.5);
  } else {
    const rafter = Math.hypot(Dm, riseM);
    addSlope(group, V(-Lm / 2, Hm, -Dm / 2), V(1, 0, 0), V(0, riseM, Dm).normalize(), L, rafter * 1000, mod, frameView, labels);
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

  // typological name per panel key (Standard A…), shared with the BOM list; only in
  // the solid (straw) view — the frame view shows structure, not part stamps.
  const bom = wallBom([
    ...allWallPanels(m).filter((p) => p.type !== 'void'),
    ...floorCassettes(m),
    ...roofPanels(m),
  ]);
  const labelByKey = new Map(bom.map((r) => [`${r.type}:${r.w}x${r.h}`, r.label]));
  const labels: LabelCtx | undefined = frameView ? undefined
    : { labelFor: (k) => labelByKey.get(k) ?? k, cache: new Map() };

  for (const pl of wallPlacements(m)) {
    const theta = Math.atan2(-pl.dir.y, pl.dir.x); // rotate box +x to the (plan→world XZ) edge dir
    for (const p of panelizeSurface(pl.surface)) {
      if (p.type === 'void') continue;
      const u = p.x + p.w / 2;
      const planX = pl.a.x + pl.dir.x * u, planY = pl.a.y + pl.dir.y * u;
      if (frameView && (p.type === 'standard' || p.type === 'lintel' || p.type === 'sill')) {
        addPanelFrame(group, p, (planX - c.x) / 1000, (p.y + p.h / 2) / 1000, (planY - c.y) / 1000, theta, t);
        continue;
      }
      const w = p.w / 1000, h = p.h / 1000;
      const geo = new THREE.BoxGeometry(w * 0.996, h * 0.996, t);
      const key = `${p.type}:${Math.round(p.w)}x${Math.round(p.h)}`;
      const color = p.ok ? panelColor(key) : PANEL_COLORS.bad;
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
      mesh.position.set((planX - c.x) / 1000, (p.y + p.h / 2) / 1000, (planY - c.y) / 1000);
      mesh.rotation.y = theta;
      mesh.userData = { shapeLabel: key, panelType: p.type, w: p.w, h: p.h, ok: p.ok, baseColor: color };
      group.add(mesh);

      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1),
        new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.5 }));
      line.position.copy(mesh.position); line.rotation.y = theta;
      line.userData = { outlineFor: key, baseOpacity: 0.5 };
      group.add(line);

      if (labels) {
        const lb = panelLabel(labels, key);
        // wall outward normal in world XZ = perpendicular to the edge dir, flipped to
        // point away from the footprint centre (NOT the centre→panel vector, which
        // tilts corner panels off the face).
        let nx = pl.dir.y, nz = -pl.dir.x;
        const mx = (pl.a.x + pl.b.x) / 2 - c.x, mz = (pl.a.y + pl.b.y) / 2 - c.y;
        if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
        const off = t / 2 + 0.006, y = (p.y + p.h / 2) / 1000;
        const px = (planX - c.x) / 1000 + nx * off, pz = (planY - c.y) / 1000 + nz * off;
        lb.position.set(px, y, pz);
        lb.lookAt(px + nx, y, pz + nz); // plane coplanar with the wall face, normal outward
        group.add(lb);
      }
    }
  }

  // floor cassettes = outer platform (footprint grown by wall thickness); top flush at
  // y = 0, sitting below the walls so the walls stand fully on it.
  const { L, D } = platformBBox(m);
  const ft = m.floor.thicknessMm / 1000;
  for (const cz of floorCassettes(m)) {
    if (frameView) { addFloorFrame(group, cz, L, D, ft); continue; }
    const w = cz.w / 1000, h = cz.h / 1000;
    const geo = new THREE.BoxGeometry(w * 0.996, ft, h * 0.996);
    const key = `cassette:${Math.round(cz.w)}x${Math.round(cz.h)}`;
    const color = cz.ok ? panelColor(key) : PANEL_COLORS.bad;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }));
    mesh.position.set((cz.x + cz.w / 2 - L / 2) / 1000, -ft / 2, (cz.y + cz.h / 2 - D / 2) / 1000);
    mesh.userData = { shapeLabel: key, panelType: 'cassette', w: cz.w, h: cz.h, ok: cz.ok, baseColor: color };
    group.add(mesh);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1),
      new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.4 }));
    line.position.copy(mesh.position);
    line.userData = { outlineFor: key, baseOpacity: 0.4 };
    group.add(line);
    if (labels) {
      const lb = panelLabel(labels, key);
      lb.rotation.x = -Math.PI / 2; // lie flat on the slab top
      lb.position.set((cz.x + cz.w / 2 - L / 2) / 1000, 0.006, (cz.y + cz.h / 2 - D / 2) / 1000);
      group.add(lb);
    }
  }

  addRoof(group, m, frameView, labels);
  return group;
}
