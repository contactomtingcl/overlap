// V4 · pixels to scale (MODIS 1 km vs VIIRS 375 m in Tomé) and "go to a coordinate" (UdeC campanil).
(() => {
  const css = (el, s) => Object.assign(el.style, s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const io = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const M = map.reg.months, I = (m) => M.indexOf(m);
  const ML = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const COORD = "-36.8286, -73.0350";
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<div class="kick"><i></i><span id="k"></span></div><div class="big" id="big"></div><div class="sub" id="sub"></div>
    <div class="brand"><img src="assets/logo-160.png" alt="">Overlap</div>
    <div class="chip4" id="x1"><span class="sq" style="width:30px;height:30px"></span><div><b>MODIS</b><br>píxel de ~1 km</div></div>
    <div class="chip4 v" id="x2"><span class="sq" style="width:12px;height:12px"></span><div><b>VIIRS</b><br>píxel de 375 m</div></div>
    <div class="search" id="sr"><div class="lbl">Ir a una coordenada · Campanil, Universidad de Concepción</div><div class="box"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#eaff28" stroke-width="2.2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg><span id="typed"></span><i class="caret"></i><b class="go" id="go">Ir</b></div></div>
    <div class="call v" id="c1"></div>
    <div class="rip" id="rip"></div><div class="cur" id="cur"></div><div class="fade" id="fade"></div>`;
  document.body.appendChild(st);
  const $s = (id) => document.getElementById(id);
  const C = document.getElementById("map-card");
  css(C, { top: "262px", transform: "none", backdropFilter: "blur(10px)" });
  C.style.setProperty("--cz", 1);
  const S = { last: -1, done: {} };
  let O = null, P = null, pinTxt = null;
  const setMonth = (mo) => { const mi = I(mo); if (mi !== S.last) { map.i = mi; document.getElementById("map-slider").value = mi; paintMap(); S.last = mi; } };
  window.__frame = (t) => {
    const act = { mouse: null, click: false };
    if (t < 0.05 && !S.done.z) { S.done.z = 1; setMonth("2023-02"); zoomTo("8", true); }
    if (t >= 0.1 && !S.done.c) { S.done.c = 1; zoomToCommune("8", "8111", true); }
    const mo = t >= 3.8 && t < 5.7 ? "2007-01" : t >= 5.7 && t < 7.7 ? "2014-01" : "2023-02";
    if (t >= 0.2) setMonth(mo);
    const [y, m] = M[S.last].split("-");
    $s("big").innerHTML = `${ML[+m - 1][0].toUpperCase() + ML[+m - 1].slice(1)} <b>${y}</b>`;
    const ph = t < 7.7 ? 0 : 1;
    $s("k").textContent = ph ? "Buscar por coordenada" : (S.done.g ? "" : "Biobío · Tomé · píxeles a escala");
    $s("sub").textContent = ph ? "Overlap encuentra la región, la comuna y el foco más cercano" : "Cada cuadro es un foco, del tamaño del píxel del satélite";
    css($s("fade"), { opacity: 1 - out(seg(t, 0, 0.9)) });
    // camera: push into Tomé, hold, back out; later a slow push on the pin
    if (t >= 0.25 && !O) { const e = document.querySelector(".com[data-c='8111']").getBoundingClientRect(), c = C.getBoundingClientRect();
      O = [e.left + e.width / 2 - c.left, e.top + e.height / 2 - c.top]; C.style.transformOrigin = `${O[0]}px ${O[1]}px`; }
    let sc = 1 + 0.85 * io(seg(t, 0.4, 2.2)) * (1 - io(seg(t, 7.6, 8.4)));
    if (t >= 10.2 && P) { C.style.transformOrigin = `${P[0]}px ${P[1]}px`; sc = 1 + 0.05 * io(seg(t, 11.2, 15)); }
    css(C, { transform: `scale(${sc})` });
    // cursor on one pixel, with the real hover card
    if (t >= 2.25 && !S.pix && map.ptsNow && map.ptsNow.length) {
      const m0 = document.getElementById("mpts").getScreenCTM(), c0 = document.querySelector(".com[data-c='8111']").getBoundingClientRect();
      const tx = c0.left + c0.width * 0.55, ty = c0.top + c0.height * 0.5;
      let best = null, bd = 1e12;
      map.ptsNow.forEach((q) => { const p = new DOMPoint(q.x, q.y).matrixTransform(m0); const d = (p.x - tx) ** 2 + (p.y - ty) ** 2; if (d < bd && p.x > 200 && p.x < 1100 && p.y > 350 && p.y < 820) { bd = d; best = [p.x, p.y]; } });
      S.pix = best;
    }
    let cx = 1300, cy = 900, cop = 0;
    if (S.pix && t < 3.9) { const k = io(seg(t, 2.3, 3.0)); cx = 1300 + (S.pix[0] - 1300) * k; cy = 900 + (S.pix[1] - 900) * k; cop = out(seg(t, 2.3, 2.5)) * (1 - out(seg(t, 3.6, 3.85))); }
    css($s("cur"), { left: `${cx}px`, top: `${cy}px`, opacity: cop });
    css($s("rip"), { opacity: 0 });
    if (S.pix && t >= 3.0 && t < 3.75) act.mouse = [S.pix[0], S.pix[1]];
    if (t >= 3.75 && !S.done.away) { S.done.away = 1; act.mouse = [4, 4]; }
    // MODIS / VIIRS chips
    const chip = (id, a, b) => { const k = out(seg(t, a, a + 0.4)) * (1 - out(seg(t, b - 0.3, b))); css($s(id), { opacity: k, transform: `translateY(${(1 - k) * 24}px) scale(${0.96 + 0.04 * k})` }); };
    chip("x1", 3.8, 5.7); chip("x2", 5.7, 7.6);
    // search field types the coordinate, then the app does the rest
    const sk = out(seg(t, 8.0, 8.5)) * (1 - out(seg(t, 10.1, 10.5)));
    css($s("sr"), { opacity: sk, transform: `translate(-50%, ${(1 - sk) * 30}px)` });
    const n = Math.round(seg(t, 8.5, 9.6) * COORD.length);
    $s("typed").textContent = COORD.slice(0, n);
    css($s("go"), { background: t >= 9.8 ? "#ffffff" : "#eaff28", transform: `scale(${t >= 9.8 && t < 10.0 ? 0.92 : 1})` });
    if (t >= 9.9 && !S.done.g) { S.done.g = 1; document.getElementById("coord").value = COORD; goCoord(COORD); }
    if (t >= 10.2 && !P) { const pin = document.querySelector("#mpin .pin"); if (pin) { const e = pin.getBoundingClientRect(), c = C.getBoundingClientRect(); P = [e.left + e.width / 2 - c.left, e.top + e.height / 2 - c.top]; } }
    if (t >= 11.0 && !pinTxt) { const pb = document.getElementById("pin-box"); pinTxt = pb ? pb.innerText : ""; 
      const km = (pinTxt.match(/a ([\d,]+) km/) || [])[1], dt = (pinTxt.match(/\(([^)]+)\)/) || [])[1];
      $s("c1").innerHTML = `<h3>A ${km} km del campanil</h3><p>Foco de VIIRS más cercano en febrero de 2023</p><small>${dt} · comuna de Concepción · ${COORD}</small>`; }
    const ck = out(seg(t, 11.2, 11.7)); css($s("c1"), { opacity: pinTxt ? ck : 0, transform: `translateX(${(1 - ck) * 60}px)` });
    css(document.querySelector("#stage .brand"), { opacity: 1 - ck });
    return act;
  };
})();
