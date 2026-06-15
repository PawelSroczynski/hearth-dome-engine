import * as THREE from 'three';
import type { GoldbergFace } from '../core/goldberg/dual';
import { classifyFace, type Classification } from '../core/goldberg/hemisphere';
import { flattenFace } from '../core/bricks/panel';
import { innerCorner, outerCorner } from '../core/bricks/brick';
import type { Vec3 } from '../core/solids/base';

export const BRICK_COLORS: Record<string, number> = {
  pentagon: 0xc24d2c, // terracotta
  hexagon: 0xd98e5a, // warm clay
  cut: 0x9c6b4a, // darker rim
};

function colorFor(face: GoldbergFace, kind: Classification): number {
  if (kind === 'cut') return BRICK_COLORS.cut;
  return face.sides === 5 ? BRICK_COLORS.pentagon : BRICK_COLORS.hexagon;
}

const add = (arr: number[], v: Vec3, s: number) => arr.push(v[0] * s, v[1] * s, v[2] * s);

/**
 * Geometry of ONE extruded brick (inner cap + outer cap + side walls), in scene
 * units (metres). Shared by the dome builder and single-brick STL export so the
 * exported piece is identical to what's shown.
 */
export function buildBrickGeometry(face: GoldbergFace, radiusMm: number, thicknessMm: number): THREE.BufferGeometry {
  const hasThickness = thicknessMm > 0;
  const panel = flattenFace(face);
  const pn = panel.normal;
  const n = panel.corners.length;
  const inner = panel.corners.map((c): Vec3 => innerCorner(c, radiusMm));
  const outer = panel.corners.map((c): Vec3 => outerCorner(c, radiusMm, thicknessMm));
  const ci = innerCorner(panel.centroid, radiusMm);
  const co = outerCorner(panel.centroid, radiusMm, thicknessMm);

  const pos: number[] = [];
  const nrm: number[] = [];
  const pushTri = (p: Vec3, q: Vec3, s: Vec3, nv: Vec3) => {
    add(pos, p, 1); add(pos, q, 1); add(pos, s, 1);
    for (let k = 0; k < 3; k++) nrm.push(nv[0], nv[1], nv[2]);
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pushTri(co, outer[i], outer[j], pn); // outer cap
    if (hasThickness) {
      pushTri(ci, inner[j], inner[i], [-pn[0], -pn[1], -pn[2]]); // inner cap (reversed)
      const ex = inner[j][0] - inner[i][0], ey = inner[j][1] - inner[i][1], ez = inner[j][2] - inner[i][2];
      let snx = ey * pn[2] - ez * pn[1], sny = ez * pn[0] - ex * pn[2], snz = ex * pn[1] - ey * pn[0];
      const sl = Math.hypot(snx, sny, snz) || 1; snx /= sl; sny /= sl; snz /= sl;
      const sn: Vec3 = [snx, sny, snz];
      pushTri(inner[i], inner[j], outer[j], sn);
      pushTri(inner[i], outer[j], outer[i], sn);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return geom;
}

/**
 * Build the dome: one EXTRUDED brick per kept face. Each brick is a flat panel
 * (planar polar-dual face) given real thickness — inner cap at the dome surface,
 * outer cap offset outward by the brick thickness along the face normal, joined
 * by side walls. `below` faces are dropped. Pure geometry — no DOM needed.
 */
export function buildDomeGroup(
  faces: GoldbergFace[],
  up: Vec3,
  radiusMm: number,
  thicknessMm = 0,
  cut = 0,
  labelFor?: (face: GoldbergFace) => string | undefined,
): THREE.Group {
  const group = new THREE.Group();
  const hasThickness = thicknessMm > 0;

  for (const face of faces) {
    const kind = classifyFace(face, up, cut);
    if (kind === 'below') continue;

    const geom = buildBrickGeometry(face, radiusMm, thicknessMm);
    const baseColor = colorFor(face, kind);
    const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
      color: baseColor, roughness: 0.85, metalness: 0, flatShading: false,
    }));
    mesh.userData = { sides: face.sides, kind, shapeLabel: labelFor?.(face), baseColor };
    group.add(mesh);

    // outer-cap brick outline — radial rings shared across bricks keep it watertight
    const panel = flattenFace(face);
    const ring = (hasThickness ? panel.corners.map((c) => outerCorner(c, radiusMm, thicknessMm))
      : panel.corners.map((c) => innerCorner(c, radiusMm)));
    const edgePts: number[] = [];
    for (let i = 0; i < ring.length; i++) { add(edgePts, ring[i], 1.0008); add(edgePts, ring[(i + 1) % ring.length], 1.0008); }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
    const eline = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.6 }));
    eline.userData = { outlineFor: labelFor?.(face), baseOpacity: 0.6 };
    group.add(eline);
  }
  return group;
}

/** Orient the dome so the cut axis points to +Y (apex up) for the scene. */
export function alignUpToY(group: THREE.Group, up: Vec3): void {
  const from = new THREE.Vector3(up[0], up[1], up[2]).normalize();
  const to = new THREE.Vector3(0, 1, 0);
  group.quaternion.setFromUnitVectors(from, to);
}
