import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { computeOven, type OvenParams } from './core/engine';
import { buildDomeGroup, alignUpToY } from './render/domeMesh';
import { buildMouldGroup } from './render/mouldMesh';
import { shapeSignature } from './core/bricks/schedule';
import { useOven } from './store';
import { Controls } from './ui/Controls';
import { Readout } from './ui/Readout';
import { ExportBar } from './ui/ExportBar';
import { SpecSheet } from './ui/SpecSheet';
import { BrickDetail } from './ui/BrickDetail';
import './App.css';

export default function App() {
  const mount = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    dome: THREE.Group | null; floor: THREE.Mesh; controls: OrbitControls;
  } | null>(null);
  const setSelected = useOven((s) => s.setSelected);
  const selected = useOven((s) => s.selected);

  // select primitives individually (stable refs) to avoid re-render loops
  const base = useOven((s) => s.base);
  const frequency = useOven((s) => s.frequency);
  const subdivisionClass = useOven((s) => s.subdivisionClass);
  const interiorMm = useOven((s) => s.interiorMm);
  const thicknessMm = useOven((s) => s.thicknessMm);
  const cutAngleDeg = useOven((s) => s.cutAngleDeg);
  const view = useOven((s) => s.view);
  const mouldWallMm = useOven((s) => s.mouldWallMm);
  const mouldFlangeMm = useOven((s) => s.mouldFlangeMm);
  const params = useMemo<OvenParams>(
    () => ({ base, frequency, subdivisionClass, interiorMm, thicknessMm, cutAngleDeg }),
    [base, frequency, subdivisionClass, interiorMm, thicknessMm, cutAngleDeg],
  );
  const result = useMemo(() => computeOven(params), [params]);

  // one-time scene setup
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14110e);
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.01, 100);
    camera.position.set(0.95, 0.75, 1.15);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xfff2e6, 0x4a3c30, 1.35)); // lighter ground fill
    scene.add(new THREE.AmbientLight(0xffffff, 0.35)); // floor so no brick goes black
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(1, 1.5, 0.8); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd9b3, 0.5); // opposite-side fill
    fill.position.set(-1.2, 0.4, -0.9); scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.target.set(0, 0.2, 0);
    sceneRef.current = { scene, camera, renderer, dome: null, floor, controls };

    // click a brick face -> select its shape type
    const raycaster = new THREE.Raycaster();
    let downX = 0, downY = 0;
    const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return; // a drag, not a click
      const ctx = sceneRef.current; if (!ctx || !ctx.dome) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, ctx.camera);
      const meshes = ctx.dome.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      const label = hit?.object.userData.shapeLabel as string | undefined;
      if (label) setSelected(label);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    let raf = 0;
    const tick = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
    tick();
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); sceneRef.current = null;
    };
  }, [setSelected]);

  // rebuild dome whenever the computed result changes
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    if (ctx.dome) {
      ctx.scene.remove(ctx.dome);
      ctx.dome.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
      });
    }
    let group: THREE.Group;
    if (view === 'mould') {
      group = buildMouldGroup(result.shapes, {
        innerRMm: result.specs.innerDiaMm / 2, thicknessMm: result.specs.wallMm,
        wallMm: mouldWallMm, flangeMm: mouldFlangeMm,
      });
    } else {
      const labelBySig = new Map(result.shapes.map((s) => [shapeSignature(s.face), s.label]));
      group = buildDomeGroup(result.faces, result.up, result.specs.innerDiaMm / 2, result.specs.wallMm, 0,
        (f) => labelBySig.get(shapeSignature(f)));
      alignUpToY(group, result.up);
    }
    ctx.scene.add(group);
    ctx.dome = group;
    const r = result.specs.innerDiaMm / 2000;
    ctx.floor.geometry.dispose();
    ctx.floor.geometry = new THREE.CircleGeometry(view === 'mould' ? 0.5 : r, 64);
  }, [result, view, mouldWallMm, mouldFlangeMm]);

  // highlight the selected shape type
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.dome) return;
    ctx.dome.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mat = o.material as THREE.MeshStandardMaterial;
      if (!mat.emissive) return;
      const on = selected != null && o.userData.shapeLabel === selected;
      mat.emissive.setHex(on ? 0xff9a4d : 0x000000);
      mat.emissiveIntensity = on ? 0.45 : 0;
    });
  }, [selected, result, view, mouldWallMm, mouldFlangeMm]);

  return (
    <div className="app">
      <div ref={mount} className="stage" />
      <div className="brand">
        <strong>Hearth Dome Engine</strong>
        <span>Goldberg pizza-oven mold · v2</span>
      </div>
      <div className="left"><Controls /></div>
      <div className="right"><Readout r={result} /></div>
      <div className="detail-dock"><BrickDetail r={result} /></div>
      <div className="bottom"><ExportBar params={params} result={result} /></div>
      <SpecSheet params={params} result={result} />
    </div>
  );
}
