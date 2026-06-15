import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { OvenResult } from '../core/engine';
import { buildBrickGeometry } from '../render/domeMesh';
import { flattenFace } from '../core/bricks/panel';
import { outerCorner } from '../core/bricks/brick';
import { mouldShell } from '../core/bricks/mould';
import { cornerAnglesDeg, edgeLengths } from '../core/bricks/measure';
import { useOven } from '../store';
import type { Vec3 } from '../core/solids/base';

interface Label { pos: THREE.Vector3; text: string; kind: 'dim' | 'angle' }

export function BrickDetail({ r }: { r: OvenResult }) {
  const mount = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const selected = useOven((s) => s.selected);
  const mouldWallMm = useOven((s) => s.mouldWallMm);
  const mouldFlangeMm = useOven((s) => s.mouldFlangeMm);
  const [mode, setMode] = useState<'brick' | 'mould'>('brick');
  const [showDims, setShowDims] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  // refs so the (once-created) render loop reads current toggle state
  const dimsRef = useRef(true);
  const anglesRef = useRef(true);
  useEffect(() => { dimsRef.current = showDims; anglesRef.current = showAngles; }, [showDims, showAngles]);

  const shape = r.shapes.find((s) => s.label === selected) ?? r.shapes[0];
  const innerR = r.specs.innerDiaMm / 2;
  const wall = r.specs.wallMm;

  const sceneRef = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    controls: OrbitControls; content: THREE.Group | null; labels: Label[];
  } | null>(null);

  // one-time setup
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0d0b);
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.001, 100);
    camera.position.set(0, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xfff2e6, 0x40342a, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(0.6, 1, 0.8); scene.add(key);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    sceneRef.current = { scene, camera, renderer, controls, content: null, labels: [] };

    const positionLabels = () => {
      const ctx = sceneRef.current; const ov = overlay.current;
      if (!ctx || !ov) return;
      const w = el.clientWidth, h = el.clientHeight;
      const kids = ov.children;
      ctx.labels.forEach((lab, i) => {
        const div = kids[i] as HTMLDivElement | undefined;
        if (!div) return;
        const show = lab.kind === 'dim' ? dimsRef.current : anglesRef.current;
        const v = lab.pos.clone().project(ctx.camera);
        const visible = show && v.z < 1;
        div.style.display = visible ? 'block' : 'none';
        if (!visible) return;
        if (div.textContent !== lab.text) div.textContent = lab.text;
        div.style.left = `${((v.x + 1) / 2) * w}px`;
        div.style.top = `${((1 - v.y) / 2) * h}px`;
      });
    };

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      positionLabels();
      raf = requestAnimationFrame(tick);
    };
    tick();
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
      controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); sceneRef.current = null;
    };
  }, []);

  // rebuild the detail content when the selection / mode / params change
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx || !shape) return;
    if (ctx.content) {
      ctx.scene.remove(ctx.content);
      ctx.content.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose(); (o.material as THREE.Material).dispose();
        }
      });
    }
    const group = new THREE.Group();

    // brick face ring (outer cap) — used for centering + dim/angle anchors
    const panel = flattenFace(shape.face);
    const ringW = panel.corners.map((c): Vec3 => outerCorner(c, innerR, wall));
    const cx = ringW.reduce((s, p) => s + p[0], 0) / ringW.length;
    const cy = ringW.reduce((s, p) => s + p[1], 0) / ringW.length;
    const cz = ringW.reduce((s, p) => s + p[2], 0) / ringW.length;
    const ringC = ringW.map((p): Vec3 => [p[0] - cx, p[1] - cy, p[2] - cz]);

    let solid: THREE.BufferGeometry;
    if (mode === 'mould') {
      const m = mouldShell(shape.face, { innerRMm: innerR, thicknessMm: wall, wallMm: mouldWallMm, flangeMm: mouldFlangeMm });
      const arr = new Float32Array(m.positions.length);
      for (let i = 0; i < m.positions.length; i += 3) {
        arr[i] = m.positions[i] / 1000; arr[i + 1] = m.positions[i + 2] / 1000; arr[i + 2] = m.positions[i + 1] / 1000;
      }
      solid = new THREE.BufferGeometry();
      solid.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      solid.computeBoundingBox();
      const c = solid.boundingBox!.getCenter(new THREE.Vector3());
      solid.translate(-c.x, -c.y, -c.z);
      solid.computeVertexNormals();
    } else {
      solid = buildBrickGeometry(shape.face, innerR, wall);
      solid.translate(-cx, -cy, -cz);
    }
    const faceMat = new THREE.MeshStandardMaterial({
      color: mode === 'mould' ? 0xb9ad97 : 0xcaa07a, roughness: 0.85, metalness: 0,
      transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(solid, faceMat));
    const edges = new THREE.EdgesGeometry(solid, 1);
    group.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xece3d6 })));
    ctx.scene.add(group);
    ctx.content = group;

    // labels (brick-face dims + angles), centered same as the brick
    const labels: Label[] = [];
    const lenMm = edgeLengths(ringC).map((m) => m * 1000);
    const ang = cornerAnglesDeg(ringC);
    const n = ringC.length;
    for (let i = 0; i < n; i++) {
      const a = ringC[i], b = ringC[(i + 1) % n];
      labels.push({ kind: 'dim', text: `${Math.round(lenMm[i])} mm`,
        pos: new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2) });
      labels.push({ kind: 'angle', text: `${Math.round(ang[i])}°`, pos: new THREE.Vector3(a[0], a[1], a[2]) });
    }
    ctx.labels = labels;

    // frame camera to the content
    solid.computeBoundingSphere();
    const rad = solid.boundingSphere?.radius ?? 0.2;
    const dist = (rad / Math.tan((ctx.camera.fov * Math.PI) / 360)) * 1.5;
    ctx.camera.position.set(0, 0, dist);
    ctx.controls.target.set(0, 0, 0);
    ctx.controls.update();
  }, [shape, mode, innerR, wall, mouldWallMm, mouldFlangeMm]);

  return (
    <section className="panel detail">
      <div className="detail-head">
        <span>DETAIL · {shape?.label ?? '—'}</span>
        <span className="detail-sub">click a brick · drag orbit · scroll zoom</span>
      </div>
      <div className="detail-bar">
        <div className="segmented sm">
          <button className={mode === 'brick' ? 'on' : ''} onClick={() => setMode('brick')}>Brick</button>
          <button className={mode === 'mould' ? 'on' : ''} onClick={() => setMode('mould')}>Mould</button>
        </div>
        <label className="chk"><input type="checkbox" checked={showDims} onChange={(e) => setShowDims(e.target.checked)} />Dimensions</label>
        <label className="chk"><input type="checkbox" checked={showAngles} onChange={(e) => setShowAngles(e.target.checked)} />Angles</label>
      </div>
      <div className="detail-stage">
        <div ref={mount} className="detail-canvas" />
        <div ref={overlay} className="detail-overlay">
          {(shape?.sides ?? 0) > 0 && Array.from({ length: (shape!.sides) * 2 }).map((_, i) => (
            <div key={i} className={`detail-label ${i % 2 ? 'angle' : 'dim'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
