"""
Oracle harvest: sweep the v1 app's controls and record outputs as golden fixtures.
Run: <brew-python> scripts/harvest_oracle.py
Output: fixtures/oracle/<symmetry>_<pattern>_f<freq>.json
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

URL = "https://geohack.xyz/pizza-oven"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures", "oracle")
os.makedirs(OUT_DIR, exist_ok=True)

SET_RANGE = """([el, val]) => {
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, String(val));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}"""

SYMMETRIES = {"icosa": "12 pent", "octa": "6 sq", "tetra": "4 tri"}
PATTERNS = {"goldberg": "Goldberg dual", "geodesic": "Geodesic mesh"}
FREQS = [1, 2, 3, 4, 5, 6, 7, 8]


def read_rows(page) -> dict:
    """Every `.tabular-nums` value sits in a row whose text is 'LABEL  VALUE'."""
    rows = page.eval_on_selector_all(
        ".tabular-nums",
        "els => els.map(e => (e.parentElement.innerText||'').replace(/\\n/g,' ').trim())",
    )
    out = {}
    for r in rows:
        m = re.match(r"^(.*?)\s+([0-9].*)$", r)
        if m:
            out[m.group(1).strip()] = m.group(2).strip()
    return out


def click_label(page, text) -> bool:
    try:
        page.click(f"button:has-text(\"{text}\")", timeout=2500)
        return True
    except Exception:
        return False


def harvest():
    captured = 0
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl"])
        p = b.new_page(viewport={"width": 1400, "height": 1200})
        p.goto(URL, wait_until="networkidle", timeout=45000)
        p.wait_for_timeout(2500)
        freq_slider = p.query_selector_all("input[type=range]")[0]

        for sym, sym_label in SYMMETRIES.items():
            for pat, pat_label in PATTERNS.items():
                click_label(p, sym_label)
                click_label(p, pat_label)
                p.wait_for_timeout(400)
                for f in FREQS:
                    p.evaluate(SET_RANGE, [freq_slider, f])
                    p.wait_for_timeout(900)
                    rows = read_rows(p)
                    if not rows:
                        print(f"  ! empty {sym}/{pat}/f{f}")
                        continue
                    rec = {
                        "params": {"symmetry": sym, "pattern": pat, "frequency": f},
                        "outputs": rows,
                    }
                    fn = os.path.join(OUT_DIR, f"{sym}_{pat}_f{f}.json")
                    with open(fn, "w") as fh:
                        json.dump(rec, fh, indent=2, ensure_ascii=False)
                    captured += 1
                    print(f"  ok {sym}/{pat}/f{f}: TOTAL={rows.get('TOTAL BRICKS','?')} "
                          f"PENT={rows.get('PENTAGONS','?')} HEX={rows.get('HEXAGONS','?')} "
                          f"FACES={rows.get('SPHERE FACES','?')}")
        b.close()
    print(f"\nHARVESTED {captured} fixtures -> {os.path.relpath(OUT_DIR)}")


if __name__ == "__main__":
    harvest()
