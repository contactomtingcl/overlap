# Written with AI assistance (Claude, Anthropic). Needs Playwright and the app served at http://localhost:8765/ (python3 -m http.server 8765 from app/).
"""Interaction test: every control, both languages, desktop and phone. Fails on any page error or broken text."""
from playwright.sync_api import sync_playwright
import sys
U="http://localhost:8765/"
bad=[]
def text_ok(pg,tag):
    t=pg.evaluate("document.body.innerText")
    for k in ("undefined","NaN","[object","null"):
        if k in t: bad.append((tag,k,t[max(0,t.index(k)-60):t.index(k)+40]))
    ov=pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    if ov>1: bad.append((tag,"overflow",ov))
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome")
    for vp in ({"width":1280,"height":900},{"width":390,"height":844}):
        for lang in ("en","es"):
            tag=f"{lang}-{vp['width']}"
            pg=b.new_page(viewport=vp)
            pg.on("pageerror",lambda e,tag=tag:bad.append((tag,"pageerror",str(e))))
            pg.goto(U+f"?lang={lang}",wait_until="domcontentloaded");pg.wait_for_timeout(1800)
            text_ok(pg,tag+" load")
            # map: mode, play, zoom, back
            pg.locator("#map-card").scroll_into_view_if_needed()
            pg.click("[data-mm='v']");pg.click("[data-mm='z']")
            pg.click("#play");pg.wait_for_timeout(700);pg.click("#play")
            for r in ("8","13","12","2"):
                pg.locator(f".reg[data-r='{r}']").dispatch_event("click");pg.wait_for_timeout(1500)
                text_ok(pg,tag+f" region {r}")
                if pg.evaluate("document.getElementById('aoi').value")!=f"r{r}": bad.append((tag,"aoi not synced",r))
                if pg.locator(".com").count()==0: bad.append((tag,"no communes",r))
            pg.click("#map-back");pg.wait_for_timeout(1300)
            # area select -> chile, biobio_hist
            for a in ("chile","biobio_hist","r5"):
                pg.select_option("#aoi",a);pg.wait_for_timeout(1300);text_ok(pg,tag+" "+a)
            # calendar: rows, raw, month click
            pg.select_option("#rows","year");pg.wait_for_timeout(600);pg.select_option("#rows","season");pg.wait_for_timeout(600)
            pg.click("#mode-r");pg.wait_for_timeout(500);text_ok(pg,tag+" raw");pg.click("#mode-h")
            for k in ("2017-01","2000-07","2005-06","2026-10","2026-11"):
                pg.locator(f".cell[data-key='{k}']").dispatch_event("click");pg.wait_for_timeout(500);text_ok(pg,tag+" month "+k)
            # palette, details, language switch
            pg.click("#cvd");pg.wait_for_timeout(500);text_ok(pg,tag+" cvd");pg.click("#cvd")
            for d in pg.locator("details").all(): d.locator("summary").click()
            pg.wait_for_timeout(400);text_ok(pg,tag+" details")
            other="es" if lang=="en" else "en"
            pg.click(f".lang button[data-lang='{other}']");pg.wait_for_timeout(700);text_ok(pg,tag+" switch")
            pg.close()
    b.close()
print("interaction test:", "OK" if not bad else bad[:12])
sys.exit(1 if bad else 0)
