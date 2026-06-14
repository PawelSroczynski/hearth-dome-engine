import { useState } from 'react';
import { useOven } from '../store';
import { CollapseToggle } from './CollapseToggle';
import type { BaseSolid } from '../core/goldberg/formulas';

const BASES: { id: BaseSolid; label: string; sub: string }[] = [
  { id: 'icosa', label: 'Icosa', sub: '12 pent' },
  { id: 'octa', label: 'Octa', sub: '6 sq' },
  { id: 'tetra', label: 'Tetra', sub: '4 tri' },
];

function Slider({
  label, value, min, max, step, display, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="ctl">
      <span className="ctl-head"><span>{label}</span><b>{display}</b></span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

const inches = (mm: number) => `${Math.round(mm / 25.4)}″`;

export function Controls() {
  const s = useOven();
  const [open, setOpen] = useState(true);
  return (
    <section className="panel controls">
      <div className="panel-title">
        Dome Parameters
        <CollapseToggle open={open} onToggle={() => setOpen((o) => !o)} />
      </div>
      {!open ? null : <>

      <div className="seg-label">Symmetry</div>
      <div className="segmented">
        {BASES.map((b) => (
          <button key={b.id} className={s.base === b.id ? 'on' : ''} onClick={() => s.setBase(b.id)}>
            <span>{b.label}</span><em>{b.sub}</em>
          </button>
        ))}
      </div>

      <Slider label="Frequency" value={s.frequency} min={1} max={8} step={1}
        display={`GP(${s.frequency},0)`} onChange={(v) => s.set('frequency', v)} />
      <Slider label="Interior Ø" value={s.interiorMm} min={500} max={1800} step={10}
        display={inches(s.interiorMm)} onChange={(v) => s.set('interiorMm', v)} />
      <Slider label="Brick Thickness" value={s.thicknessMm} min={25} max={200} step={5}
        display={inches(s.thicknessMm)} onChange={(v) => s.set('thicknessMm', v)} />
      <Slider label="Cut Angle" value={s.cutAngleDeg} min={30} max={90} step={1}
        display={`${s.cutAngleDeg}°`} onChange={(v) => s.set('cutAngleDeg', v)} />
      </>}
    </section>
  );
}
