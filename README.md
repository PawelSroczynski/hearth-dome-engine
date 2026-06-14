# Hearth Dome Engine (pizza-oven v2)

Parametric **Goldberg-polyhedron mold engine** for building brick pizza-oven domes:
choose a base solid + frequency, get the brick schedule, per-brick mold dimensions,
and a 3D preview. Clean-room reimplementation with a tested geometry core.

## Why v2
v1 is a 1:1 scrape of a minified production bundle — it runs, but the source is
obfuscated and unmaintainable. v2 rebuilds the logic as readable, tested,
owned code, verified against v1 as an **oracle** (golden tests).

## Sources & attribution

- **Original tool (v1):** the "Goldberg Polyhedron Mold Engine" published at
  <https://geohack.xyz/pizza-oven>. v1 in this lineage is a 1:1 static mirror of
  that site's **minified production bundle** (no readable source was available).
- **Idea / concept origin:** the brick-dome mold approach this is based on —
  <https://www.facebook.com/share/18tABi7Q2t/>.
- **This repo (v2):** an **independent clean-room reimplementation**. The minified
  v1 bundle was used only as a behavioural **oracle** (its on-screen outputs were
  recorded into `fixtures/oracle/` and turned into golden tests). No original
  source code was copied; all code here is written from the underlying geometry.

Credit for the original concept and tool belongs to their respective authors;
this project exists to make the logic understandable, testable, and maintainable.

## Architecture
```
src/
  core/       pure TypeScript — no Three.js, no DOM, fully testable
    solids/   base solids (icosa/octa/tetra) + frequency subdivision
    goldberg/ dual -> brick faces (hex/pent), hemisphere cut, counts
    bricks/   per-brick dimensions, cut angle, mortar gap, thickness
  render/     Three.js layer (thin: draws what core computes)
  ui/         parameter panel + output tables (specs, brick schedule)
fixtures/
  oracle/     captured outputs from v1 -> golden tests
scripts/
  harvest-oracle.py  Playwright sweep that records v1 outputs
```

## Math
A `GP(m,0)` Goldberg polyhedron is the dual of a Class-I geodesic sphere on the
icosahedron at frequency `m`: exactly **12 pentagons** and **10·(m²−1) hexagons**
(`GP(4,0)` -> 12 pent + 150 hex = 162 faces). A hemisphere cut yields the dome's
brick set plus partial "cut bricks" along the rim.

## Develop
```bash
npm install
npm test          # vitest (core, oracle-driven + property-based)
npm run dev       # vite dev server
npm run build
```

## Testing strategy (TDD)
1. **Oracle-driven** — every core stage asserts its output equals v1's captured output.
2. **Property-based** (fast-check) — invariants independent of the oracle
   (Euler V−E+F=2, pentagon count = 12, monotonic brick growth with frequency).
3. **Render/UI** — headless screenshot diff vs v1; component tests.

CI blocks merge on test failure or core coverage < 90%.
