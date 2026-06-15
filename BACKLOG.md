# Backlog — hearth-dome-engine (pizzadome)

Status of features vs the original geohack tool, plus ideas harvested from the
**acidome.com** code study (internal mirror: `enklava.co/tools/acidome/`).

Legend: 🔴 high · 🟡 medium · 🟢 low · ✅ done

## Construction types

- ✅ **Top-level construction switch: Pizza Dome ↔ StrawPanel Wall.** EcoCocon straw
  panelizer MVP (`core/wall/panelize.ts`): solid stretches → vertical standard panels
  (≤850 mm), openings → void + lintel (above) + sill (below window); exact tiling +
  EcoCocon range validation (out-of-range flagged). Panels behave like dome bricks
  (click → highlight type, panel-detail viewport with dimensions/angles, BOM rows
  clickable). Rational cost estimate = panel area (m², as shown in 3D) × €/m² rate
  (editable assumption; EcoCocon prices by exterior wall area excl. openings).
- 🟢 Wall next: per-panel STL/ZIP export; corner Column (C) + Braced (B) panel types;
  multiple/edited openings; stacked panels for walls > 3000 mm; sourced €/m² rate.

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
- ✅ **Subdivision class I / II** — `subdivideGoldbergCoxeter(base,m,n)` (barycentric
  (m,n) lattice ported from acidome; neighbour-basis remap for edge-straddling points +
  global triangle dedup → watertight). Class I = GP(n,0), Class II = GP(m,m). UI toggle
  Class I/II. Verified by TDD: Euler=2, exactly 12 pentagons, and **pentad + Class II ⇒
  all visible pentagons edge-down** (keeps the pentagon apex — the "pentagon edge
  parallel to base" request, confirmed practically on acidome). This is why class, not
  seating, is the right lever (class keeps the apex; seating changes it).
- ✅ **Subdivision class III (chiral, m≠n)** — exposed in the UI: Class I/II/III
  segment + "Chiral n" slider (n ∈ [1, m−1]); GP(m,n). TDD: (3,1) Euler=2, 12-pentagon dual.
- 🟡 **Symmetry-axis seating (pentad / diad / triad)** — rotate the base solid so a
  chosen symmetry axis is vertical *before* subdivision (acidome pattern: `Figure.js`
  `switch(params.symmetry)` → `rotate(atan(a/b))` pentad, `asin(2/(√3+√15))` triad).
  Changes the mesh (apex element, brick shapes, counts, cuts) — it is **geometry, not
  presentation**. Measured on icosa GP(4,0), visible (upper) pentagon orientation:
  **pentad → 5 vertex-down / 0 edge-down** (pentagon apex; "inverted pentagram",
  unavoidable by rotation — azimuth flips 0/12); **diad → 2/2**; **triad → 0/6
  edge-down** (every visible pentagon has its bottom edge parallel to the base; apex
  becomes a face/hex). Default stays pentad; triad is the option when "pentagon edge
  parallel to base" is required. TDD: Euler/watertight + "triad ⇒ each visible pentagon's
  two lowest corners share z".
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
