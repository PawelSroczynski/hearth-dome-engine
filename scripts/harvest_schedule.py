"""
Per-brick schedule oracle: unique brick shapes with count, max span, edge lengths.
Arch off. Output: fixtures/oracle/schedule/<sym>_f<freq>.json
"""
import json, os, re
from playwright.sync_api import sync_playwright

URL = "https://geohack.xyz/pizza-oven"
OUT = os.path.join(os.path.dirname(__file__), "..", "fixtures", "oracle", "schedule")
os.makedirs(OUT, exist_ok=True)
SET = """([el,v])=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}"""
SYM = {"icosa": "12 pent", "octa": "6 sq"}


def parse_schedule(text: str):
    i = text.find("BRICK SCHEDULE")
    j = text.find("GENERAL SPECIFICATIONS")
    region = text[i:j if j > 0 else len(text)]
    lines = [l.strip() for l in region.splitlines() if l.strip()]
    bricks = []
    k = 0
    while k < len(lines):
        m = re.match(r"^([A-Z][A-Z ]*[A-Z])$", lines[k])
        sided = lines[k + 1] if k + 1 < len(lines) else ""
        if m and re.match(r"^\d+-sided$", sided):
            label = m.group(1)
            sides = int(sided.split("-")[0])
            blk = {"label": label, "sides": sides}
            t = k + 2
            while t < len(lines) and not (re.match(r"^[A-Z][A-Z ]*[A-Z]$", lines[t]) and t + 1 < len(lines) and re.match(r"^\d+-sided$", lines[t + 1])):
                key = lines[t].upper()
                if key == "COUNT" and t + 1 < len(lines):
                    blk["count"] = int(re.sub(r"[^0-9]", "", lines[t + 1])); t += 2; continue
                if key == "SOURCE" and t + 1 < len(lines):
                    blk["source"] = lines[t + 1]; t += 2; continue
                if key == "MAX SPAN" and t + 1 < len(lines):
                    blk["maxSpanIn"] = float(re.sub(r"[^0-9.]", "", lines[t + 1])); t += 2; continue
                if key == "EDGES" and t + 1 < len(lines):
                    blk["edgesIn"] = [float(x) for x in re.findall(r"[0-9.]+", lines[t + 1])]; t += 2; continue
                if "EXPORT" in key or key.startswith("FULL") or key.startswith("CUT BRICK"):
                    t += 1; continue
                t += 1
            if "count" in blk:
                bricks.append(blk)
            k = t
        else:
            k += 1
    return bricks


with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl"])
    p = b.new_page(viewport={"width": 1500, "height": 1300})
    p.goto(URL, wait_until="networkidle", timeout=45000)
    p.wait_for_timeout(2500)
    for c in p.query_selector_all("input[type=checkbox]"):
        lbl = c.evaluate("e=>(e.closest('label')?.innerText||'')").lower()
        if ("arch" in lbl or "chimney" in lbl or "entry" in lbl) and c.is_checked():
            c.click(); p.wait_for_timeout(150)
    S = p.query_selector_all("input[type=range]")

    def click(t):
        try: p.click(f"button:has-text(\"{t}\")", timeout=2000)
        except Exception: pass

    n = 0
    for sym, lbl in SYM.items():
        click(lbl); p.wait_for_timeout(300)
        for f in (3, 4, 5):
            p.evaluate(SET, [S[0], f]); p.wait_for_timeout(900)
            bricks = parse_schedule(p.inner_text("body"))
            rec = {"params": {"symmetry": sym, "frequency": f, "arch": False}, "bricks": bricks}
            json.dump(rec, open(os.path.join(OUT, f"{sym}_f{f}.json"), "w"), indent=2, ensure_ascii=False)
            n += 1
            tot = sum(x["count"] for x in bricks)
            print(f"  {sym} f{f}: {len(bricks)} unique, total={tot} :: " + ", ".join(f"{x['label']}x{x['count']}" for x in bricks[:6]))
    b.close()
    print(f"\nSCHEDULE fixtures: {n}")
