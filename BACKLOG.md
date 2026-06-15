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
- 🔴 **Subdivision class I / II / III** — we currently support **only Class I**
  (`subdivideGeodesic` → GP(n,0)). Class II = GP(m,m) ("triacon", e.g. soccer-ball
  GP(1,1)) rotates the whole tessellation ~30°, which **rotates every pentagon about
  its own normal** → flips side-pentagon orientation **vertex-down ↔ edge-down while
  KEEPING the pentagon apex** (pentad). This is the key lever for the "pentagon edge
  parallel to base" request — verified practically on acidome (switching class I↔II).
  Reference: acidome `subdivisionScheme` / "make a Class III M,N subdivision scheme".
  Action: implement Class II (and III GP(m,n), chiral) subdivision + a class selector;
  re-calibrate orientation parity vs acidome once it exists. Supersedes the seating
  route below for this use-case (seating changes the apex; class does not).
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
