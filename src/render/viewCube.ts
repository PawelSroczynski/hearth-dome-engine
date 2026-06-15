import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * A ViewCube navigation gizmo (recreated from the reference: labelled cube TOP/FRONT/
 * RIGHT… + coloured X/Y/Z axes). It mirrors the main camera's orientation each frame,
 * and clicking a face snaps the main camera to that canonical view.
 */

const FACES = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK']; // BoxGeometry material order: +x,-x,+y,-y,+z,-z

function faceTexture(label: string): THREE.CanvasTexture {
  const s = 128;
  const cv = document.createElement('canvas'); cv.width = cv.height = s;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#efece6'; c.fillRect(0, 0, s, s);
  c.strokeStyle = '#c9c4ba'; c.lineWidth = 6; c.strokeRect(3, 3, s - 6, s - 6);
  c.fillStyle = '#4a443c'; c.font = '600 26px ui-sans-serif, system-ui, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(label, s / 2, s / 2);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  return tex;
}

function axes(): THREE.Group {
  const g = new THREE.Group();
  const o = new THREE.Vector3(-0.95, -0.95, -0.95); // back-bottom-left corner
  const mk = (dir: THREE.Vector3, color: number) => {
    const geo = new THREE.BufferGeometry().setFromPoints([o, o.clone().add(dir)]);
    g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })));
  };
  mk(new THREE.Vector3(1.7, 0, 0), 0xff5a5a); // X red
  mk(new THREE.Vector3(0, 1.7, 0), 0x5ad17a); // Y green
  mk(new THREE.Vector3(0, 0, 1.7), 0x6a8cff); // Z blue
  return g;
}

export interface ViewCube { domElement: HTMLCanvasElement; update: () => void; dispose: () => void }

export function createViewCube(getCamera: () => THREE.Camera, controls: OrbitControls, size = 116): ViewCube {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(size, size); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cursor = 'pointer';

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(2, 3, 4); scene.add(dl);

  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100); // perspective, matching the main view
  const CAM_DIST = 4.6;

  const mats = FACES.map((f) => new THREE.MeshBasicMaterial({ map: faceTexture(f), transparent: true, opacity: 0.6, depthWrite: false }));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mats);
  cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({ color: 0xbdb8ae, transparent: true, opacity: 0.5 })));
  scene.add(cube);
  scene.add(axes());

  const update = () => {
    const mainCamera = getCamera();
    const dir = new THREE.Vector3().subVectors(mainCamera.position, controls.target).normalize();
    cam.position.copy(dir.multiplyScalar(CAM_DIST));
    cam.up.copy(mainCamera.up);
    cam.lookAt(0, 0, 0);
    renderer.render(scene, cam);
  };

  const raycaster = new THREE.Raycaster();
  const onClick = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    const hit = raycaster.intersectObject(cube, false)[0];
    if (!hit?.face) return;
    const n = hit.face.normal.clone().normalize(); // ±axis = which face (cube is unrotated)
    const mainCamera = getCamera();
    const dist = mainCamera.position.distanceTo(controls.target);
    const from = mainCamera.position.clone();
    const to = controls.target.clone().add(n.multiplyScalar(dist));
    // OrbitControls keeps up = world +Y; looking straight down/up is a pole singularity
    // (azimuth undefined → it spins). Nudge top/bottom views a hair off the pole.
    if (Math.abs(n.y) > 0.9) to.z += dist * 0.02;
    mainCamera.up.set(0, 1, 0);
    const t0 = performance.now(); const D = 320;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / D);
      const e2 = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // easeInOutQuad
      mainCamera.position.lerpVectors(from, to, e2);
      mainCamera.lookAt(controls.target); controls.update();
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  };
  renderer.domElement.addEventListener('click', onClick);

  const dispose = () => {
    renderer.domElement.removeEventListener('click', onClick);
    mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
    cube.geometry.dispose();
    renderer.dispose();
  };

  return { domElement: renderer.domElement, update, dispose };
}
