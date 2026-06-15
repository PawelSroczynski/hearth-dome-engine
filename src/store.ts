import { create } from 'zustand';
import { DEFAULT_PARAMS, type OvenParams } from './core/engine';
import type { BaseSolid } from './core/goldberg/formulas';
import type { SpecImages } from './render/snapshot';
import type { WallSpec, Opening } from './core/wall/panelize';

export type ViewMode = 'brick' | 'mould';
export type Construction = 'dome' | 'wall';

const DEFAULT_WALL: WallSpec = {
  lengthMm: 6000, heightMm: 2700, thicknessMm: 400, targetWidthMm: 800, depthMm: 4000,
  openings: [
    { x: 800, w: 1000, sillH: 0, headH: 2100 },    // door
    { x: 3600, w: 1600, sillH: 800, headH: 2100 },  // window
  ],
};

interface OvenStore extends OvenParams {
  view: ViewMode;
  mouldWallMm: number;
  mouldFlangeMm: number;
  selected: string | null;
  specImages: SpecImages | null;
  construction: Construction;
  wall: WallSpec;
  wallRateEur: number; // assumed €/m² of net panel area (editable estimate)
  floorModuleMm: number;
  floorThicknessMm: number;
  floorSpanAxis: 'x' | 'y';
  floorRateEur: number;
  roofType: 'flat' | 'gable' | 'mono';
  roofPitchDeg: number;
  roofModuleMm: number;
  roofRateEur: number;
  set: <K extends keyof OvenParams>(key: K, value: OvenParams[K]) => void;
  setBase: (b: BaseSolid) => void;
  setView: (v: ViewMode) => void;
  setMould: (key: 'mouldWallMm' | 'mouldFlangeMm', value: number) => void;
  setSelected: (label: string | null) => void;
  setSpecImages: (img: SpecImages | null) => void;
  setConstruction: (c: Construction) => void;
  setWall: (key: 'lengthMm' | 'heightMm' | 'thicknessMm' | 'targetWidthMm' | 'depthMm', value: number) => void;
  setOpening: (index: number, patch: Partial<Opening>) => void;
  setWallRate: (eurPerM2: number) => void;
  setFloor: (key: 'floorModuleMm' | 'floorThicknessMm' | 'floorRateEur', value: number) => void;
  setFloorAxis: (a: 'x' | 'y') => void;
  setRoofType: (t: 'flat' | 'gable' | 'mono') => void;
  setRoof: (key: 'roofPitchDeg' | 'roofModuleMm' | 'roofRateEur', value: number) => void;
}

export const useOven = create<OvenStore>((set) => ({
  ...DEFAULT_PARAMS,
  view: 'brick',
  mouldWallMm: 8,
  mouldFlangeMm: 6,
  selected: null,
  specImages: null,
  construction: 'dome',
  wall: DEFAULT_WALL,
  wallRateEur: 250,
  floorModuleMm: 800,
  floorThicknessMm: 240,
  floorSpanAxis: 'y',
  floorRateEur: 120,
  roofType: 'gable',
  roofPitchDeg: 30,
  roofModuleMm: 800,
  roofRateEur: 160,
  set: (key, value) => set({ [key]: value } as Partial<OvenParams>),
  setBase: (base) => set({ base }),
  setView: (view) => set({ view }),
  setMould: (key, value) => set({ [key]: value }),
  setSelected: (selected) => set({ selected }),
  setSpecImages: (specImages) => set({ specImages }),
  setConstruction: (construction) => set({ construction }),
  setWall: (key, value) => set((s) => ({ wall: { ...s.wall, [key]: value } })),
  setOpening: (index, patch) => set((s) => ({
    wall: { ...s.wall, openings: s.wall.openings.map((o, i) => (i === index ? { ...o, ...patch } : o)) },
  })),
  setWallRate: (wallRateEur) => set({ wallRateEur }),
  setFloor: (key, value) => set({ [key]: value }),
  setFloorAxis: (floorSpanAxis) => set({ floorSpanAxis }),
  setRoofType: (roofType) => set({ roofType }),
  setRoof: (key, value) => set({ [key]: value }),
}));
