# Backlog — hearth-dome-engine (pizzadome)

Status of features vs the original geohack tool, plus ideas harvested from the
**acidome.com** code study (internal mirror: `enklava.co/tools/acidome/`).

Legend: 🔴 high · 🟡 medium · 🟢 low · ✅ done

## Committed / must-have

- 🔴 **Node solving (connector hubs / "rozwiązanie węzłów")** — solve the geometry
  at each vertex where edges/bricks meet: per-vertex hub, ordered ring of incident
  edges, miter/bevel angles between adjacent faces, and exportable connector parts.
  Reference: acidome `Product.Connector.js` (chain-sort around vertex, faceAngle /
  radiusAngle, "Ground"/rim detection) + `Solutions.twoPlanesAndSphere` /
  `planesCross` + `Plane.average` (bisector). Enables a strut/connector dome variant
  and precise joint angles for the brick dome.

## Geometry / fabrication

- 🔴 **Cut-brick clipping (#13)** — clip rim bricks to the floor plane; populate the
  `CUT · RIM` schedule group + their own moulds. Reference: acidome
  `Plane.crossWithRay` (plane–ray intersection) for polygon clipping.
- 🔴 **Miter / bevel angles between adjacent bricks** — today we show only face
  (interior) angles; builders need the *cut angle* on each edge so neighbours meet
  flush. Reference: acidome `Plane.average` + `Product.Rib` half-cut bisector plane.
- 🟡 **Arch + chimney (#19)** — door opening cut → `ARCH · OPENING` schedule group.
- 🟡 **Cut angle affects 3D + counts (#15)** — currently only 90° hemisphere in 3D.
- 🟡 **2D net / unfold** — flattened brick pattern for cutting. Reference: acidome
  `Looker.pointToPlane` / `planeToPoint`.
- 🟢 **Tetra hemisphere calibration** — tetra base axis/cut not calibrated.
- 🟢 **Geodesic-triangle overlay (#20)** — show the underlying geodesic mesh.
- 🟢 **Mortar slider** — gap between bricks.

## Schedule / spec quality

- 🟡 **BOM quantization** — group identical parts by explicit angle (0.1°) + length
  (1 mm) tolerance instead of chord rounding. Reference: acidome `Product` unifiers.
- 🟡 **Richer per-brick spec** — circumradius `R = abc/4S`, min material size.
  Reference: acidome `Product.Triangle`.

## UI / inspection

- 🟡 **Color bricks by type** (#16) — map schedule colours into the 3D dome.
- 🟢 **Euler invariant runtime assert** — `F + V − E = 2` as a guard (already covered
  by tests). Reference: acidome `Figure.js`.

## Validation / housekeeping

- 🟢 **acidome mirror — export-endpoint capture pass** — exercise download.php / STL /
  PDF buttons to confirm 100% scrape closure (static + runtime already verified clean).
