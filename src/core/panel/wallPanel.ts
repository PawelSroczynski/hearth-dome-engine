/**
 * Internal frame of a wall panel — EcoCocon-derived (Designer Guide p.8/11/22):
 * load-bearing TWIN-STUD timber frame (interior + exterior studs) with straw infill,
 * top & bottom enclosed with plywood plates. Stud spacing 424–850 mm.
 *
 * Members are returned in PANEL-LOCAL 2D (x along width 0..W, y up 0..H); a renderer
 * places them in 3D and duplicates studs across the thickness (the "twin" pair).
 */

export interface FrameMember {
  el: 'plate' | 'stud' | 'nogging';
  branch?: 'interior' | 'exterior'; // studs & noggings
  x: number; y: number; w: number; h: number; // mm, local
}

export interface FrameParams {
  widthMm: number;
  heightMm: number;
  studPitchMm: number;   // target; clamped to 424–850, then evenly distributed
  studWidthMm: number;   // stud branch width (across panel width), e.g. 45
  plateMm: number;       // plywood plate thickness, e.g. 45
  noggingPitchMm?: number; // vertical spacing of horizontal rails; 0/undefined = none
}

export const STUD_PITCH_MIN = 424;
export const STUD_PITCH_MAX = 850;
export const NOGGING_PITCH_DEFAULT = 600;

/** Frame members (plates + twin studs + horizontal noggings) of a rectangular wall panel, local 2D. */
export function wallPanelFrame(p: FrameParams): FrameMember[] {
  const W = p.widthMm, H = p.heightMm, sw = p.studWidthMm, pl = p.plateMm;
  const pitch = Math.min(Math.max(p.studPitchMm, STUD_PITCH_MIN), STUD_PITCH_MAX);
  const out: FrameMember[] = [];

  // top & bottom plywood plates (full width)
  out.push({ el: 'plate', x: 0, y: 0, w: W, h: pl });
  out.push({ el: 'plate', x: 0, y: H - pl, w: W, h: pl });

  // stud positions: evenly spaced incl. both edges; bays ≈ pitch
  const bays = Math.max(1, Math.round(W / pitch));
  const studH = Math.max(0, H - 2 * pl);
  for (let i = 0; i <= bays; i++) {
    let x = (i * W) / bays - sw / 2;          // centre stud on the grid line
    x = Math.min(Math.max(x, 0), W - sw);     // keep edge studs inside the panel
    for (const branch of ['interior', 'exterior'] as const)
      out.push({ el: 'stud', branch, x, y: pl, w: sw, h: studH });
  }

  // horizontal noggings: evenly spaced FROM THE BOTTOM so the remainder forms a
  // narrow closing field at the top (as on the reference panel photo). One rail
  // per twin branch, full width, thickness = stud width.
  const np = p.noggingPitchMm ?? 0;
  if (np > 0 && studH > sw) {
    const rows = Math.floor(studH / np);
    for (let i = 1; i <= rows; i++) {
      const yc = pl + i * np;                       // grid line up from the bottom plate
      const y = yc - sw / 2;
      if (y + sw > H - pl) break;                   // don't overlap the top plate
      for (const branch of ['interior', 'exterior'] as const)
        out.push({ el: 'nogging', branch, x: 0, y, w: W, h: sw });
    }
  }
  return out;
}

/** Actual centre-to-centre stud spacing after even distribution (for verification). */
export function actualStudPitch(widthMm: number, targetPitchMm: number): number {
  const pitch = Math.min(Math.max(targetPitchMm, STUD_PITCH_MIN), STUD_PITCH_MAX);
  const bays = Math.max(1, Math.round(widthMm / pitch));
  return widthMm / bays;
}
