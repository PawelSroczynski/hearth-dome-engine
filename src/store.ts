import { create } from 'zustand';
import { DEFAULT_PARAMS, type OvenParams } from './core/engine';
import type { BaseSolid } from './core/goldberg/formulas';

interface OvenStore extends OvenParams {
  set: <K extends keyof OvenParams>(key: K, value: OvenParams[K]) => void;
  setBase: (b: BaseSolid) => void;
}

export const useOven = create<OvenStore>((set) => ({
  ...DEFAULT_PARAMS,
  set: (key, value) => set({ [key]: value } as Partial<OvenParams>),
  setBase: (base) => set({ base }),
}));
