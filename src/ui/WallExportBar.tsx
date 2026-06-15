import { useOven } from '../store';
import { download } from '../render/exporters';
import { makeWallImages } from '../render/wallSnapshot';
import { wallBom } from '../core/wall/panelize';
import { buildingFromWall, allWallPanels, floorCassettes, roofPanels } from '../core/building/model';
import { roofAreaMm2 } from '../core/roof/roofize';

export function WallExportBar() {
  const wall = useOven((s) => s.wall);
  const rate = useOven((s) => s.wallRateEur);
  const floorRate = useOven((s) => s.floorRateEur);
  const floorModuleMm = useOven((s) => s.floorModuleMm);
  const floorThicknessMm = useOven((s) => s.floorThicknessMm);
  const floorSpanAxis = useOven((s) => s.floorSpanAxis);
  const roofType = useOven((s) => s.roofType);
  const roofPitchDeg = useOven((s) => s.roofPitchDeg);
  const roofModuleMm = useOven((s) => s.roofModuleMm);
  const roofRate = useOven((s) => s.roofRateEur);
  const setSpecImages = useOven((s) => s.setSpecImages);
  const depth = wall.depthMm ?? 4000;
  const floor = { moduleWidthMm: floorModuleMm, thicknessMm: floorThicknessMm, spanAxis: floorSpanAxis } as const;
  const roof = { type: roofType, pitchDeg: roofPitchDeg, ridgeAxis: 'x' as const, moduleWidthMm: roofModuleMm };

  const printSpec = () => {
    setSpecImages(makeWallImages(wall, floor, roof));
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const exportJSON = () => {
    const model = buildingFromWall(wall, depth, floor, roof);
    const wpanels = allWallPanels(model).filter((p) => p.type !== 'void');
    const fpanels = floorCassettes(model);
    const rpanels = roofPanels(model);
    const wallM2 = wpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
    const floorM2 = fpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
    const roofM2 = roofAreaMm2(wall.lengthMm, depth, roofPitchDeg, roofType) / 1e6;
    const doc = {
      tool: 'strawpanel-building', version: 3,
      footprint: { lengthMm: wall.lengthMm, depthMm: depth, heightMm: wall.heightMm, thicknessMm: wall.thicknessMm },
      openings: wall.openings, floor, roof,
      bom: wallBom([...wpanels, ...fpanels, ...rpanels]),
      cost: {
        wallRatePerM2: rate, wallAreaM2: Math.round(wallM2 * 100) / 100, wallEur: Math.round(wallM2 * rate),
        floorRatePerM2: floorRate, floorAreaM2: Math.round(floorM2 * 100) / 100, floorEur: Math.round(floorM2 * floorRate),
        roofRatePerM2: roofRate, roofAreaM2: Math.round(roofM2 * 100) / 100, roofEur: Math.round(roofM2 * roofRate),
        totalEur: Math.round(wallM2 * rate + floorM2 * floorRate + roofM2 * roofRate),
      },
    };
    download('strawpanel-building.json', JSON.stringify(doc, null, 2), 'application/json');
  };

  return (
    <section className="panel exportbar">
      <button onClick={exportJSON}>JSON</button>
      <button onClick={printSpec}>Spec PDF</button>
    </section>
  );
}
