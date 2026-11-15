# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Film one scene of the app frame by frame on a virtual clock (deterministic, 1920x1080, 30 fps).
Usage: python3 video/studio/film.py <scene.js> <seconds> <out.mp4> [--preview t1,t2,...]
Needs the app served locally: cd app && python3 -m http.server 8765
Env: URL (default http://localhost:8765/?lang=es&area=r8), CHROME (path to Google Chrome; default: Playwright's Chromium)."""
import subprocess, sys, os
from playwright.sync_api import sync_playwright
scene, dur, outp = sys.argv[1], float(sys.argv[2]), sys.argv[3]
preview = [float(x) for x in sys.argv[5].split(",")] if len(sys.argv) > 5 and sys.argv[4] == "--preview" else None
URL = os.environ.get("URL", "http://localhost:8765/?lang=es&area=r8")
FPS = 30
TICK = """(dt) => { window.__vt = (window.__vt || 0) + dt;
  for (const a of document.getAnimations()) { if (a.__t0 === undefined) a.__t0 = window.__vt - dt; a.pause(); a.currentTime = window.__vt - a.__t0; }
  for (const s of document.querySelectorAll('svg')) { if (!s.querySelector('animate, animateTransform')) continue; if (s.__s0 === undefined) s.__s0 = window.__vt - dt; s.pauseAnimations(); s.setCurrentTime((window.__vt - s.__s0) / 1000); } }"""
with sync_playwright() as p:
    chrome = os.environ.get("CHROME") or ("/usr/bin/google-chrome" if os.path.exists("/usr/bin/google-chrome") else None)
    b = p.chromium.launch(executable_path=chrome, args=["--force-color-profile=srgb", "--font-render-hinting=none"])
    pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until="domcontentloaded"); pg.wait_for_timeout(3500)
    pg.add_style_tag(path=os.path.join(os.path.dirname(__file__), "stage.css"))
    pg.evaluate("""async () => { window.scrollTo(0,0);
      const [geo, data] = await Promise.all([fetch(DATA('geo/comunas/r8.json')).then(x => x.json()), fetch(DATA('comunas_monthly/r8.json')).then(x => x.json())]);
      let cmax = 1; Object.values(data.v).forEach(o => Object.values(o).forEach(n => { if (n > cmax) cmax = n; })); map.com['8'] = { geo, data, cmax };
      await pointsFor('8', '2022'); await pointsFor('8', '2023'); await pointsFor('8', '2017'); await pointsFor('8', '2007'); await pointsFor('8', '2014');
      document.getElementById('map-card').classList.add('in'); }""")
    pg.clock.install()
    pg.add_script_tag(path=scene)
    pg.wait_for_timeout(300)
    n = int(round(dur * FPS))
    want = set(int(round(t * FPS)) for t in preview) if preview else None
    ff = None
    if not preview:
        tmp = outp[:-4] + ".part.mp4"
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
                               "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS), tmp], stdin=subprocess.PIPE)
    for f in range(n):
        t = f / FPS
        pg.clock.run_for(round((f + 1) * 1000 / FPS) - round(f * 1000 / FPS) - 1)
        act = pg.evaluate("(t) => window.__frame(t)", t)
        if act and act.get("mouse"):
            pg.mouse.move(*act["mouse"])
            if act.get("click"): pg.mouse.down(); pg.mouse.up()
        pg.clock.run_for(1)
        pg.evaluate(TICK, 1000 / FPS)
        if want is not None:
            if f in want: pg.screenshot(path=f"{outp[:-4]}_{t:05.2f}.jpg", type="jpeg", quality=92)
        else:
            ff.stdin.write(pg.screenshot(type="jpeg", quality=92))
    if ff:
        ff.stdin.close(); rc = ff.wait()
        if rc == 0: os.replace(tmp, outp)
    print("errors:", errs[:5])
    b.close()
