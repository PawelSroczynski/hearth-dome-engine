import { describe, it, expect } from 'vitest';
import { wallPanelFrame, actualStudPitch } from './wallPanel';

const P = { widthMm: 800, heightMm: 2700, studPitchMm: 600, studWidthMm: 45, plateMm: 45 };

describe('wallPanelFrame', () => {
  it('has exactly two plywood plates (top + bottom), full width', () => {
    const plates = wallPanelFrame(P).filter((m) => m.el === 'plate');
    expect(plates.length).toBe(2);
    expect(plates.every((p) => p.w === 800)).toBe(true);
    expect(plates.map((p) => p.y).sort((a, b) => a - b)).toEqual([0, 2700 - 45]);
  });

  it('studs are TWIN (interior + exterior in equal numbers)', () => {
    const studs = wallPanelFrame(P).filter((m) => m.el === 'stud');
    const inter = studs.filter((s) => s.branch === 'interior').length;
    const exter = studs.filter((s) => s.branch === 'exterior').length;
    expect(inter).toBe(exter);
    expect(inter).toBeGreaterThan(0);
  });

  it('studs run between the plates (height = H − 2·plate)', () => {
    const stud = wallPanelFrame(P).find((m) => m.el === 'stud')!;
    expect(stud.h).toBe(2700 - 90);
    expect(stud.y).toBe(45);
  });

  it('edge studs stay inside the panel', () => {
    for (const s of wallPanelFrame(P).filter((m) => m.el === 'stud')) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(800 + 1e-6);
    }
  });

  it('actual stud pitch lands within 424–850 for typical widths', () => {
    for (const w of [800, 850, 600, 424, 1700]) {
      const pitch = actualStudPitch(w, 600);
      expect(pitch).toBeGreaterThanOrEqual(424 - 1);
      expect(pitch).toBeLessThanOrEqual(850 + 1);
    }
  });
});
