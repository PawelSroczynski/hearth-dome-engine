"""Validate the oracle-harvest method: drive the Frequency slider, read brick schedule."""
from playwright.sync_api import sync_playwright

SET_RANGE = """([el, val]) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, String(val));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}"""

def read_schedule(page):
    txt = page.inner_text("body")
    out = {}
    for line in txt.splitlines():
        l = line.strip()
        for key in ("Reference Dome", "TOTAL BRICKS", "PENTAGONS", "HEXAGONS"):
            if key.lower() in l.lower():
                out.setdefault(key, l)
    # the headline summary line e.g. "Icosa · GP(4,0) · 6 pent + 85 hex · 4 shapes"
    for line in txt.splitlines():
        if "pent +" in line.lower() or "GP(" in line:
            out.setdefault("summary", line.strip())
            break
    return out

with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl"])
    p = p2 = b.new_page(viewport={"width": 1400, "height": 1000})
    p.goto("https://geohack.xyz/pizza-oven", wait_until="networkidle", timeout=45000)
    p.wait_for_timeout(2500)
    freq = p.query_selector_all("input[type=range]")[0]  # Frequency is first slider
    print("freq slider min/max/val:", freq.get_attribute("min"), freq.get_attribute("max"), freq.get_attribute("value"))
    for v in (2, 3, 4, 5):
        p.evaluate(SET_RANGE, [freq, v])
        p.wait_for_timeout(1200)
        print(f"\n--- frequency={v} ---")
        for k, val in read_schedule(p).items():
            print(f"  {k}: {val}")
    b.close()
