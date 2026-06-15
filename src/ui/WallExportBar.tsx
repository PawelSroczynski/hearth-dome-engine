import { useOven } from '../store';
import { download } from '../render/exporters';
import { makeWallImages } from '../render/wallSnapshot';
import { wallBom, type Panel } from '../core/wall/panelize';
import { buildingFromWall, allWallPanels } from '../core/building/model';

export function WallExportBar() {
  const wall = useOven((s) => s.wall);
  const rate = useOven((s) => s.wallRateEur);
  const setSpecImages = useOven((s) => s.setSpecImages);
  const depth = wall.depthMm ?? 4000;

  const printSpec = () => {
    setSpecImages(makeWallImages(wall));
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const exportJSON = () => {
    const panels = allWallPanels(buildingFromWall(wall, depth));
    const solid = panels.filter((p: Panel) => p.type !== 'void');
    const panelAreaM2 = solid.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
    const doc = {
      tool: 'strawpanel-wall', version: 1,
      footprint: { lengthMm: wall.lengthMm, depthMm: depth, heightMm: wall.heightMm, thicknessMm: wall.thicknessMm },
      openings: wall.openings,
      bom: wallBom(panels),
      cost: { ratePerM2: rate, panelAreaM2: Math.round(panelAreaM2 * 100) / 100, totalEur: Math.round(panelAreaM2 * rate) },
    };
    download('strawpanel-wall.json', JSON.stringify(doc, null, 2), 'application/json');
  };

  return (
    <section className="panel exportbar">
      <button onClick={exportJSON}>JSON</button>
      <button onClick={printSpec}>Spec PDF</button>
    </section>
  );
}
