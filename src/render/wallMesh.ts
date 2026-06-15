import * as THREE from 'three';
import { panelize, type WallSpec, type Panel } from '../core/wall/panelize';

export const PANEL_COLORS: Record<string, number> = {
  standard: 0xd9b27a, // straw clay
  lintel: 0xc24d2c,   // terracotta (over openings)
  sill: 0x8a9a5b,     // olive (under windows)
  cassette: 0x9c7b52, // floor cassette (timber)
  roof: 0xb56a3d,     // roof panel
  gable: 0xcaa07a,    // gable infill
  bad: 0x9c3b2c,      // out-of-range flag
};

// HSL family per panel category: base hue/sat/lightness. Each distinct SIZE within a
// category gets a deterministic shade (hue ±/lightness ±) so typological types read
// apart on the 3D — like the dome colours its brick types — while keeping the
// category meaning (terracotta lintels, olive sills, terracotta roof…).
const TYPE_HSL: Record<string, [number, number, number]> = {
  standard: [38, 52, 62],
  lintel: [12, 68, 52],
  sill: [74, 33, 48],
  cassette: [28, 42, 50],
  roof: [18, 58, 50],
  gable: [34, 44, 66],
};

function hslToHex(h: number, s: number, l: number): number {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const ch = (n: number) => Math.round(255 * f(n));
  return (ch(0) << 16) | (ch(8) << 8) | ch(4);
}

/** Deterministic colour for a panel BOM key (`type:WxH`): category family + per-size shade. */
export function panelColor(key: string): number {
  const [type, size = ''] = key.split(':');
  const base = TYPE_HSL[type];
  if (!base) return PANEL_COLORS[type] ?? 0xb89b6e;
  const [h, s, l] = base;
  const hash = [...size].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const hue = h + ((hash % 31) - 15);          // ±15°
  const light = l + (((hash >> 5) % 27) - 13); // ±13%
  return hslToHex(hue, s, Math.max(28, Math.min(74, light)));
}

/**
 * Build the EcoCocon wall: one extruded box per panel (voids skipped), coloured
 * by type. Wall lies in the XY plane (x = length, y = height), thickness along
 * +Z; centred on X, standing on the floor (y = 0). Scene units = metres.
 */
export function buildWallGroup(spec: WallSpec): { group: THREE.Group; panels: Panel[] } {
  const group = new THREE.Group();
  const panels = panelize(spec);
  const t = spec.thicknessMm / 1000;
  const L = spec.lengthMm;

  for (const p of panels) {
    if (p.type === 'void') continue;
    const w = p.w / 1000, h = p.h / 1000;
    const geo = new THREE.BoxGeometry(w * 0.985, h * 0.985, t); // small gap to read seams
    const color = p.ok ? PANEL_COLORS[p.type] : PANEL_COLORS.bad;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
    mesh.position.set((p.x + p.w / 2 - L / 2) / 1000, (p.y + p.h / 2) / 1000, 0);
    // shapeLabel = BOM key so the dome's picking + highlight effects work for panels too
    mesh.userData = { shapeLabel: `${p.type}:${Math.round(p.w)}x${Math.round(p.h)}`, panelType: p.type, w: p.w, h: p.h, ok: p.ok, baseColor: color };
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geo, 1);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.5 }));
    line.position.copy(mesh.position);
    group.add(line);
  }
  return { group, panels };
}
