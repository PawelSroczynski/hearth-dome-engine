import { useOven } from '../store';
import { download } from '../render/exporters';
import { makeWallImages } from '../render/wallSnapshot';
import { wallBom } from '../core/wall/panelize';
import { buildingFromWall, allWallPanels, floorCassettes } from '../core/building/model';

export function WallExportBar() {
  const wall = useOven((s) => s.wall);
  const rate = useOven((s) => s.wallRateEur);
  const floorRate = useOven((s) => s.floorRateEur);
  const floorModuleMm = useOven((s) => s.floorModuleMm);
  const floorThicknessMm = useOven((s) => s.floorThicknessMm);
  const floorSpanAxis = useOven((s) => s.floorSpanAxis);
  const setSpecImages = useOven((s) => s.setSpecImages);
  const depth = wall.depthMm ?? 4000;
  const floor = { moduleWidthMm: floorModuleMm, thicknessMm: floorThicknessMm, spanAxis: floorSpanAxis };

  const printSpec = () => {
    setSpecImages(makeWallImages(wall, floor));
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const exportJSON = () => {
    const model = buildingFromWall(wall, depth, floor);
    const wpanels = allWallPanels(model).filter((p) => p.type !== 'void');
    const fpanels = floorCassettes(model);
    const wallM2 = wpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
    const floorM2 = fpanels.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
    const doc = {
      tool: 'strawpanel-wall', version: 2,
      footprint: { lengthMm: wall.lengthMm, depthMm: depth, heightMm: wall.heightMm, thicknessMm: wall.thicknessMm },
      openings: wall.openings,
      floor,
      bom: wallBom([...wpanels, ...fpanels]),
      cost: {
        wallRatePerM2: rate, wallAreaM2: Math.round(wallM2 * 100) / 100, wallEur: Math.round(wallM2 * rate),
        floorRatePerM2: floorRate, floorAreaM2: Math.round(floorM2 * 100) / 100, floorEur: Math.round(floorM2 * floorRate),
        totalEur: Math.round(wallM2 * rate + floorM2 * floorRate),
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
