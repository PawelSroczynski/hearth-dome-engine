import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { subdivideGeodesic } from './core/solids/geodesic';
import { goldbergDual } from './core/goldberg/dual';
import { domeAxis } from './core/goldberg/hemisphere';
import { buildDomeGroup, alignUpToY } from './render/domeMesh';
import type { BaseSolid } from './core/goldberg/formulas';

const BASE: BaseSolid = 'icosa';
const FREQ = 4;
const INNER_R_MM = 510;

export default function App() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12100e);

    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.01, 100);
    camera.position.set(0.9, 0.7, 1.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(1, 1.5, 0.8);
    scene.add(key);

    const faces = goldbergDual(subdivideGeodesic(BASE, FREQ));
    const up = domeAxis(BASE);
    const dome = buildDomeGroup(faces, up, INNER_R_MM);
    alignUpToY(dome, up);
    scene.add(dome);

    // floor disk at the cut plane
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(INNER_R_MM / 1000, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.2, 0);

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#12100e' }}>
      <div ref={mount} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: 16, left: 18, color: '#e9ddd0', fontFamily: 'system-ui' }}>
        <strong>Hearth Dome Engine</strong>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {BASE} · GP({FREQ},0) · drag to orbit
        </div>
      </div>
    </div>
  );
}
