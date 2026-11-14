# Written with AI assistance (Claude, Anthropic). Needs Playwright and the app served at http://localhost:8765/ (python3 -m http.server 8765 from app/).
from playwright.sync_api import sync_playwright
import json
aois=[a["key"] for a in json.load(open("app/data/aois.json"))]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome")
    bad=[]
    for lang in ("en","es"):
        for vp in ({"width":1280,"height":900},{"width":390,"height":844}):
            pg=b.new_page(viewport=vp); errs=[]
            pg.on("pageerror",lambda e:errs.append(str(e)))
            for a in aois:
                pg.goto(f"http://localhost:8765/?lang={lang}&area={a}",wait_until="domcontentloaded");pg.wait_for_timeout(700)
                txt=pg.evaluate("document.body.innerText")
                ov=pg.evaluate("document.documentElement.scrollWidth")
                hl=pg.evaluate("document.getElementById('headline').textContent")
                issues=[k for k in ("undefined","NaN","null") if k in txt]
                if issues or ov>vp["width"]+1 or not hl: bad.append((lang,vp["width"],a,issues,ov,hl[:40]))
            if errs: bad.append((lang,vp["width"],"errors",errs[:3]))
            pg.close()
    print("checked",len(aois)*4,"views; problems:",bad)
    b.close()
