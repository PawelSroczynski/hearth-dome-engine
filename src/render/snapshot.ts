import * as THREE from 'three';
import type { OvenResult } from '../core/engine';
import { buildDomeGroup, alignUpToY, buildBrickGeometry } from './domeMesh';
import { buildMouldGroup } from './mouldMesh';
import type { MouldParams } from '../core/bricks/mould';

export interface SpecImages { dome: string; shapes: Record<string, string> }

const PRINT_BG = 0xf4efe6;

function frame(camera: THREE.PerspectiveCamera, group: THREE.Object3D, dir: THREE.Vector3) {
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2 || 0.3;
  const dist = (radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.35;
  camera.position.copy(center).addScaledVector(dir.clone().normalize(), dist);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

/** Render the dome + each unique brick (or mould) to PNG data URLs for the spec PDF. */
export function makeSpecImages(
  result: OvenResult,
  view: 'brick' | 'mould',
  mould: MouldParams,
): SpecImages {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2);
  const innerR = result.specs.innerDiaMm / 2;

  const shot = (w: number, h: number, build: (s: THREE.Scene) => THREE.Object3D, dir: THREE.Vector3): string => {
    renderer.setSize(w, h);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PRINT_BG);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8c78, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(0.7, 1, 0.8); scene.add(key);
    const obj = build(scene);
    const cam = new THREE.PerspectiveCamera(40, w / h, 0.001, 100);
    frame(cam, obj, dir);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose(); (o.material as THREE.Material).dispose();
      }
    });
    return url;
  };

  const domeDir = new THREE.Vector3(0.9, 0.7, 1.1);
  const dome = shot(640, 460, (scene) => {
    let g: THREE.Group;
    if (view === 'mould') g = buildMouldGroup(result.shapes, mould);
    else { g = buildDomeGroup(result.faces, result.up, innerR, result.specs.wallMm); alignUpToY(g, result.up); }
    scene.add(g);
    return g;
  }, domeDir);

  const shapes: Record<string, string> = {};
  const brickDir = new THREE.Vector3(0.6, 0.55, 1);
  for (const s of result.shapes) {
    shapes[s.label] = shot(240, 200, (scene) => {
      const geom = buildBrickGeometry(s.face, innerR, result.specs.wallMm);
      geom.computeBoundingSphere();
      const c = geom.boundingSphere!.center;
      geom.translate(-c.x, -c.y, -c.z);
      const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
        color: s.sides === 5 ? 0xc24d2c : 0xd98e5a, roughness: 0.85, metalness: 0,
      }));
      const grp = new THREE.Group(); grp.add(mesh);
      grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 1),
        new THREE.LineBasicMaterial({ color: 0x3a2616 })));
      scene.add(grp);
      return grp;
    }, brickDir);
  }

  renderer.dispose();
  renderer.forceContextLoss();
  return { dome, shapes };
}
