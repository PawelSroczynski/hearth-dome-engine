import { create } from 'zustand';
import { DEFAULT_PARAMS, type OvenParams } from './core/engine';
import type { BaseSolid } from './core/goldberg/formulas';
import type { SpecImages } from './render/snapshot';

export type ViewMode = 'brick' | 'mould';

interface OvenStore extends OvenParams {
  view: ViewMode;
  mouldWallMm: number;
  mouldFlangeMm: number;
  selected: string | null;
  specImages: SpecImages | null;
  set: <K extends keyof OvenParams>(key: K, value: OvenParams[K]) => void;
  setBase: (b: BaseSolid) => void;
  setView: (v: ViewMode) => void;
  setMould: (key: 'mouldWallMm' | 'mouldFlangeMm', value: number) => void;
  setSelected: (label: string | null) => void;
  setSpecImages: (img: SpecImages | null) => void;
}

export const useOven = create<OvenStore>((set) => ({
  ...DEFAULT_PARAMS,
  view: 'brick',
  mouldWallMm: 8,
  mouldFlangeMm: 6,
  selected: null,
  specImages: null,
  set: (key, value) => set({ [key]: value } as Partial<OvenParams>),
  setBase: (base) => set({ base }),
  setView: (view) => set({ view }),
  setMould: (key, value) => set({ [key]: value }),
  setSelected: (selected) => set({ selected }),
  setSpecImages: (specImages) => set({ specImages }),
}));
