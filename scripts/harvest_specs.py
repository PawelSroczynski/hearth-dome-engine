"""
Specs oracle: dome shell dimensions vs continuous params (interior diameter,
brick thickness, cut angle, mortar gap). Internals are metric (mm); the UI
shows inches. Frequency fixed, arch off.
Output: fixtures/oracle/specs/<tag>.json
"""
import json, os, re
from playwright.sync_api import sync_playwright

URL = "https://geohack.xyz/pizza-oven"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures", "oracle", "specs")
os.makedirs(OUT_DIR, exist_ok=True)

SET = """([el, val]) => {
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, String(val)); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
}"""
KEYS = ("INTERIOR Ø", "BRICK THICKNESS", "CUT ANGLE", "MORTAR GAP",
        "OUTER Ø", "INNER Ø", "FOOTPRINT Ø", "WALL THICKNESS", "DOME HEIGHT", "FLOOR AREA", "COOK VOLUME")

# slider indices: 1=interior, 2=thickness, 3=cut-angle, 4=mortar (mm / degrees)
IDX = {"interior": 1, "thickness": 2, "angle": 3, "mortar": 4}


def rows(page):
    out = {}
    for r in page.eval_on_selector_all(".tabular-nums", "els=>els.map(e=>(e.parentElement.innerText||'').replace(/\\n/g,' ').trim())"):
        m = re.match(r"^(.*?)\s+([0-9-].*)$", r)
        if m:
            out[m.group(1).strip()] = m.group(2).strip()
    return {k: out.get(k) for k in KEYS}


with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl"])
    p = b.new_page(viewport={"width": 1400, "height": 1300})
    p.goto(URL, wait_until="networkidle", timeout=45000)
    p.wait_for_timeout(2500)
    for c in p.query_selector_all("input[type=checkbox]"):
        lbl = c.evaluate("e => (e.closest('label')?.innerText || '')").lower()
        if ("arch" in lbl or "chimney" in lbl or "entry" in lbl) and c.is_checked():
            c.click(); p.wait_for_timeout(150)
    S = p.query_selector_all("input[type=range]")

    def setp(interior=1020, thickness=100, angle=90, mortar=0):
        p.evaluate(SET, [S[IDX["interior"]], interior])
        p.evaluate(SET, [S[IDX["thickness"]], thickness])
        p.evaluate(SET, [S[IDX["angle"]], angle])
        p.evaluate(SET, [S[IDX["mortar"]], mortar])
        p.wait_for_timeout(700)

    n = 0
    def save(tag, params):
        global n
        rec = {"params": params, "outputs": rows(p)}
        json.dump(rec, open(os.path.join(OUT_DIR, f"{tag}.json"), "w"), indent=2, ensure_ascii=False)
        n += 1
        print(f"  {tag}: {rec['outputs']}")

    # interior x thickness grid (hemisphere, no mortar)
    for d in (700, 1000, 1300, 1600):
        for t in (50, 100, 150):
            setp(interior=d, thickness=t)
            save(f"grid_d{d}_t{t}", {"interior_mm": d, "thickness_mm": t, "angle": 90, "mortar_mm": 0})
    # cut-angle sweep
    for a in (40, 55, 70, 85, 90):
        setp(interior=1020, thickness=100, angle=a)
        save(f"angle_{a}", {"interior_mm": 1020, "thickness_mm": 100, "angle": a, "mortar_mm": 0})
    # mortar sweep
    for mo in (0, 5, 10, 15):
        setp(interior=1020, thickness=100, mortar=mo)
        save(f"mortar_{mo}", {"interior_mm": 1020, "thickness_mm": 100, "angle": 90, "mortar_mm": mo})
    b.close()
    print(f"\nSPECS fixtures: {n}")
