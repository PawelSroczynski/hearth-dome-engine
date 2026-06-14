"""
Arch-OFF oracle: pure hemisphere dome brick counts (no entry arch / chimney).
Captures TOTAL/FULL/CUT per symmetry x frequency (Goldberg pattern).
Output: fixtures/oracle/dome/<symmetry>_f<freq>.json
"""
import json, os, re
from playwright.sync_api import sync_playwright

URL = "https://geohack.xyz/pizza-oven"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures", "oracle", "dome")
os.makedirs(OUT_DIR, exist_ok=True)

SET_RANGE = """([el, val]) => {
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, String(val)); el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
}"""
SYMMETRIES = {"icosa": "12 pent", "octa": "6 sq", "tetra": "4 tri"}
FREQS = [1, 2, 3, 4, 5, 6, 7, 8]


def rows(page):
    out = {}
    for r in page.eval_on_selector_all(".tabular-nums", "els=>els.map(e=>(e.parentElement.innerText||'').replace(/\\n/g,' ').trim())"):
        m = re.match(r"^(.*?)\s+([0-9].*)$", r)
        if m:
            out[m.group(1).strip()] = m.group(2).strip()
    return out


def click(page, text):
    try:
        page.click(f"button:has-text(\"{text}\")", timeout=2500); return True
    except Exception:
        return False


with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl"])
    p = b.new_page(viewport={"width": 1400, "height": 1300})
    p.goto(URL, wait_until="networkidle", timeout=45000)
    p.wait_for_timeout(2500)
    # turn OFF arch + chimney
    for c in p.query_selector_all("input[type=checkbox]"):
        lbl = c.evaluate("e => (e.closest('label')?.innerText || e.parentElement?.innerText || '')").lower()
        if ("arch" in lbl or "chimney" in lbl or "entry" in lbl) and c.is_checked():
            c.click(); p.wait_for_timeout(200)
    freq = p.query_selector_all("input[type=range]")[0]
    n = 0
    for sym, lbl in SYMMETRIES.items():
        click(p, lbl); p.wait_for_timeout(300)
        for f in FREQS:
            p.evaluate(SET_RANGE, [freq, f]); p.wait_for_timeout(800)
            r = rows(p)
            rec = {"params": {"symmetry": sym, "frequency": f, "arch": False},
                   "outputs": {k: r.get(k) for k in ("TOTAL BRICKS", "FULL BRICKS", "CUT BRICKS", "SPHERE FACES", "PENTAGONS", "HEXAGONS")}}
            with open(os.path.join(OUT_DIR, f"{sym}_f{f}.json"), "w") as fh:
                json.dump(rec, fh, indent=2, ensure_ascii=False)
            n += 1
            print(f"  {sym} f{f}: TOTAL={r.get('TOTAL BRICKS')} FULL={r.get('FULL BRICKS')} CUT={r.get('CUT BRICKS')}")
    b.close()
    print(f"\nDOME fixtures: {n}")
