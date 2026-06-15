import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useOven } from '../store';
import { panelize, wallBom } from '../core/wall/panelize';
import { PANEL_COLORS } from '../render/wallMesh';

interface Label { pos: THREE.Vector3; text: string; kind: 'dim' | 'angle' }

export function PanelDetail() {
  const mount = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const wall = useOven((s) => s.wall);
  const selected = useOven((s) => s.selected);
  const [showDims, setShowDims] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const dimsRef = useRef(true); const anglesRef = useRef(true);
  useEffect(() => { dimsRef.current = showDims; anglesRef.current = showAngles; }, [showDims, showAngles]);

  // resolve the selected panel (or first in the BOM)
  const bom = wallBom(panelize(wall));
  const pick = bom.find((r) => `${r.type}:${r.w}x${r.h}` === selected) ?? bom[0];
  const pType = pick?.type, pW = pick?.w, pH = pick?.h, pOk = pick?.ok;
  const tMm = wall.thicknessMm;

  const sceneRef = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    controls: OrbitControls; content: THREE.Group | null; labels: Label[];
  } | null>(null);

  useEffect(() => {
    const el = mount.current; if (!el) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0f0d0b);
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.001, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xfff2e6, 0x40342a, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(0.6, 1, 0.8); scene.add(key);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    sceneRef.current = { scene, camera, renderer, controls, content: null, labels: [] };

    const positionLabels = () => {
      const ctx = sceneRef.current; const ov = overlay.current; if (!ctx || !ov) return;
      const w = el.clientWidth, h = el.clientHeight; const kids = ov.children;
      ctx.labels.forEach((lab, i) => {
        const div = kids[i] as HTMLDivElement | undefined; if (!div) return;
        const show = lab.kind === 'dim' ? dimsRef.current : anglesRef.current;
        const v = lab.pos.clone().project(ctx.camera); const vis = show && v.z < 1;
        div.style.display = vis ? 'block' : 'none'; if (!vis) return;
        if (div.textContent !== lab.text) div.textContent = lab.text;
        div.style.left = `${((v.x + 1) / 2) * w}px`; div.style.top = `${((1 - v.y) / 2) * h}px`;
      });
    };
    let raf = 0;
    const tick = () => { controls.update(); renderer.render(scene, camera); positionLabels(); raf = requestAnimationFrame(tick); };
    tick();
    const onResize = () => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
      controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx || pW === undefined || pH === undefined) return;
    if (ctx.content) {
      ctx.scene.remove(ctx.content);
      ctx.content.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
      });
    }
    const w = pW / 1000, h = pH / 1000, t = tMm / 1000;
    const geo = new THREE.BoxGeometry(w, h, t);
    const group = new THREE.Group();
    const color = pOk ? PANEL_COLORS[pType ?? 'standard'] ?? 0xd9b27a : PANEL_COLORS.bad;
    group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, transparent: true, opacity: 0.6 })));
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0xece3d6 })));
    ctx.scene.add(group); ctx.content = group;

    const f = t / 2;
    ctx.labels = [
      { kind: 'dim', text: `${pW} mm`, pos: new THREE.Vector3(0, -h / 2, f) },
      { kind: 'dim', text: `${pH} mm`, pos: new THREE.Vector3(-w / 2, 0, f) },
      { kind: 'dim', text: `${tMm} mm`, pos: new THREE.Vector3(w / 2, -h / 2, 0) },
      ...([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as const)
        .map(([x, y]): Label => ({ kind: 'angle', text: '90°', pos: new THREE.Vector3(x, y, f) })),
    ];

    geo.computeBoundingSphere();
    const rad = geo.boundingSphere?.radius ?? 1;
    const dist = (rad / Math.tan((ctx.camera.fov * Math.PI) / 360)) * 1.5;
    ctx.camera.position.set(rad * 0.3, rad * 0.2, dist); ctx.controls.target.set(0, 0, 0); ctx.controls.update();
  }, [pType, pW, pH, pOk, tMm]);

  return (
    <section className="panel detail">
      <div className="detail-head">
        <span>PANEL · {pick ? pick.type.toUpperCase() : '—'}</span>
        <span className="detail-sub">click a panel · drag orbit · scroll zoom</span>
      </div>
      <div className="detail-bar">
        <label className="chk"><input type="checkbox" checked={showDims} onChange={(e) => setShowDims(e.target.checked)} />Dimensions</label>
        <label className="chk"><input type="checkbox" checked={showAngles} onChange={(e) => setShowAngles(e.target.checked)} />Angles</label>
      </div>
      <div className="detail-stage">
        <div ref={mount} className="detail-canvas" />
        <div ref={overlay} className="detail-overlay">
          {pick && Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`detail-label ${i < 3 ? 'dim' : 'angle'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
