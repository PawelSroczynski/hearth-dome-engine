import * as THREE from 'three';
import { buildBuildingGroup } from './buildingMesh';
import { PANEL_COLORS } from './wallMesh';
import { buildingFromWall, allWallPanels } from '../core/building/model';
import { wallBom, type WallSpec } from '../core/wall/panelize';
import type { SpecImages } from './snapshot';

const PRINT_BG = 0xf4efe6;

function frame(camera: THREE.PerspectiveCamera, obj: THREE.Object3D, dir: THREE.Vector3) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2 || 1;
  const dist = (radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.3;
  camera.position.copy(center).addScaledVector(dir.clone().normalize(), dist);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

/** Building hero render + one thumbnail per unique panel type, for the wall spec PDF. */
export function makeWallImages(wall: WallSpec): SpecImages {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2);
  const model = buildingFromWall(wall, wall.depthMm ?? 4000);

  const shot = (w: number, h: number, build: (s: THREE.Scene) => THREE.Object3D, dir: THREE.Vector3): string => {
    renderer.setSize(w, h);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PRINT_BG);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8c78, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(0.7, 1, 0.8); scene.add(key);
    const obj = build(scene);
    const cam = new THREE.PerspectiveCamera(40, w / h, 0.001, 1000);
    frame(cam, obj, dir);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
    });
    return url;
  };

  const dome = shot(680, 460, (scene) => { const g = buildBuildingGroup(model); scene.add(g); return g; },
    new THREE.Vector3(0.8, 0.7, -0.95));

  const shapes: Record<string, string> = {};
  const t = (wall.thicknessMm) / 1000;
  for (const r of wallBom(allWallPanels(model))) {
    shapes[`${r.type}:${r.w}x${r.h}`] = shot(240, 200, (scene) => {
      const geo = new THREE.BoxGeometry(r.w / 1000, r.h / 1000, t);
      const color = r.ok ? PANEL_COLORS[r.type] ?? 0xd9b27a : PANEL_COLORS.bad;
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
      const grp = new THREE.Group(); grp.add(mesh);
      grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x3a2616 })));
      scene.add(grp); return grp;
    }, new THREE.Vector3(0.5, 0.4, 1));
  }

  renderer.dispose(); renderer.forceContextLoss();
  return { dome, shapes };
}
