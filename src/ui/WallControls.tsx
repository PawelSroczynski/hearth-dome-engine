import { useState } from 'react';
import { useOven } from '../store';
import { CollapseToggle } from './CollapseToggle';
import { THICKNESS_MIN, THICKNESS_MAX } from '../core/wall/panelize';

function Slider({ label, value, min, max, step, display, onChange }: {
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

const mm = (v: number) => `${Math.round(v)} mm`;
const m = (v: number) => `${(v / 1000).toFixed(2).replace(/\.?0+$/, '')} m`;

export function WallControls() {
  const s = useOven();
  const [open, setOpen] = useState(() => window.innerWidth > 680); // collapsed by default on mobile
  const door = s.wall.openings[0];
  const win = s.wall.openings[1];
  return (
    <section className="panel controls">
      <div className="panel-title">
        Wall Parameters
        <CollapseToggle open={open} onToggle={() => setOpen((o) => !o)} />
      </div>
      {!open ? null : <>
        <Slider label="Length" value={s.wall.lengthMm} min={3000} max={12000} step={100}
          display={m(s.wall.lengthMm)} onChange={(v) => s.setWall('lengthMm', v)} />
        <Slider label="Depth" value={s.wall.depthMm ?? 4000} min={3000} max={12000} step={100}
          display={m(s.wall.depthMm ?? 4000)} onChange={(v) => s.setWall('depthMm', v)} />
        <Slider label="Height" value={s.wall.heightMm} min={2000} max={3500} step={50}
          display={m(s.wall.heightMm)} onChange={(v) => s.setWall('heightMm', v)} />
        <Slider label="Thickness" value={s.wall.thicknessMm} min={THICKNESS_MIN} max={THICKNESS_MAX} step={10}
          display={mm(s.wall.thicknessMm)} onChange={(v) => s.setWall('thicknessMm', v)} />
        <Slider label="Panel width (target)" value={s.wall.targetWidthMm} min={400} max={850} step={10}
          display={mm(s.wall.targetWidthMm)} onChange={(v) => s.setWall('targetWidthMm', v)} />

        <div className="seg-label">View</div>
        <div className="segmented" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className={!s.frameView ? 'on' : ''} onClick={() => s.setFrameView(false)}>Straw</button>
          <button className={s.frameView ? 'on' : ''} onClick={() => s.setFrameView(true)}>Frame</button>
        </div>

        <div className="seg-label">Door</div>
        <Slider label="Door position" value={door.x} min={0} max={Math.max(0, s.wall.lengthMm - door.w)} step={50}
          display={mm(door.x)} onChange={(v) => s.setOpening(0, { x: v })} />
        <Slider label="Door width" value={door.w} min={800} max={2000} step={50}
          display={mm(door.w)} onChange={(v) => s.setOpening(0, { w: v })} />
        <Slider label="Door height" value={door.headH} min={1900} max={2400} step={50}
          display={mm(door.headH)} onChange={(v) => s.setOpening(0, { headH: v })} />

        <div className="seg-label">Window</div>
        <Slider label="Window position" value={win.x} min={0} max={Math.max(0, s.wall.lengthMm - win.w)} step={50}
          display={mm(win.x)} onChange={(v) => s.setOpening(1, { x: v })} />
        <Slider label="Window width" value={win.w} min={600} max={3000} step={50}
          display={mm(win.w)} onChange={(v) => s.setOpening(1, { w: v })} />
        <Slider label="Window sill" value={win.sillH} min={400} max={1500} step={50}
          display={mm(win.sillH)} onChange={(v) => s.setOpening(1, { sillH: v })} />
        <Slider label="Window head" value={win.headH} min={1800} max={2400} step={50}
          display={mm(win.headH)} onChange={(v) => s.setOpening(1, { headH: v })} />

        <div className="seg-label">Floor (posadzka)</div>
        <Slider label="Cassette module" value={s.floorModuleMm} min={300} max={1200} step={50}
          display={mm(s.floorModuleMm)} onChange={(v) => s.setFloor('floorModuleMm', v)} />
        <Slider label="Floor thickness" value={s.floorThicknessMm} min={150} max={400} step={10}
          display={mm(s.floorThicknessMm)} onChange={(v) => s.setFloor('floorThicknessMm', v)} />
        <div className="segmented" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className={s.floorSpanAxis === 'y' ? 'on' : ''} onClick={() => s.setFloorAxis('y')}>Span ↕ depth</button>
          <button className={s.floorSpanAxis === 'x' ? 'on' : ''} onClick={() => s.setFloorAxis('x')}>Span ↔ length</button>
        </div>

        <div className="seg-label">Roof (dach)</div>
        <div className="segmented">
          <button className={s.roofType === 'gable' ? 'on' : ''} onClick={() => s.setRoofType('gable')}>Gable</button>
          <button className={s.roofType === 'mono' ? 'on' : ''} onClick={() => s.setRoofType('mono')}>Mono</button>
          <button className={s.roofType === 'flat' ? 'on' : ''} onClick={() => s.setRoofType('flat')}>Flat</button>
        </div>
        {s.roofType === 'flat' ? null : <>
          <Slider label="Roof pitch" value={s.roofPitchDeg} min={5} max={50} step={1}
            display={`${s.roofPitchDeg}°`} onChange={(v) => s.setRoof('roofPitchDeg', v)} />
          <Slider label="Roof module" value={s.roofModuleMm} min={400} max={1200} step={50}
            display={mm(s.roofModuleMm)} onChange={(v) => s.setRoof('roofModuleMm', v)} />
        </>}

        <div className="seg-label">Cost estimate</div>
        <Slider label="Wall rate" value={s.wallRateEur} min={100} max={600} step={10}
          display={`€${s.wallRateEur}/m²`} onChange={(v) => s.setWallRate(v)} />
        <Slider label="Floor rate" value={s.floorRateEur} min={50} max={400} step={10}
          display={`€${s.floorRateEur}/m²`} onChange={(v) => s.setFloor('floorRateEur', v)} />
        <Slider label="Roof rate" value={s.roofRateEur} min={50} max={500} step={10}
          display={`€${s.roofRateEur}/m²`} onChange={(v) => s.setRoof('roofRateEur', v)} />
      </>}
    </section>
  );
}
