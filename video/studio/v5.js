// V5 · harmonization: the calendar as each satellite saw it (false jump), then harmonized; then one old month explained.
(() => {
  const css = (el, s) => Object.assign(el.style, s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const io = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sty = document.createElement("style");
  sty.textContent = `#cal-card, #cal-card *, #day-panel, #day-panel * { visibility:visible !important; }
    #map-card { display:none !important; }
    #cal-card, #day-panel { position:fixed !important; left:72px; right:72px; top:262px; margin:0 !important; z-index:5; opacity:1; transition:none !important; transform-origin:50% 30%; }
    #cal-card .maphead h2, #cal-card .maphead select, #cal-card > .sub, #cal-card details { display:none !important; }
    #day-panel h2, #day-panel #day-sub { display:none !important; }
    #stage .tag5 { position:absolute; padding:14px 22px; border-radius:16px; font:700 26px/1.2 "Inter",sans-serif; white-space:nowrap; }
    #stage .box5 { position:absolute; border:3px solid #eaff28; border-radius:12px; box-shadow:0 0 0 6px rgba(234,255,40,.12), 0 0 40px rgba(234,255,40,.35); }`;
  document.head.appendChild(sty);
  const cal = document.getElementById("calendar").closest(".card"); cal.id = "cal-card"; cal.classList.add("in");
  const day = document.getElementById("day-panel");
  setMode("raw");
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<div class="kick"><i></i><span id="k"></span></div><div class="big" id="big"></div><div class="sub" id="sub"></div>
    <div class="brand"><img src="assets/logo-160.png" alt="">Overlap</div>
    <div class="box5" id="bx"></div><div class="tag5" id="tg1"></div><div class="tag5" id="tg2"></div>
    <div class="rip" id="rip"></div><div class="cur" id="cur"></div><div class="fade" id="fade"></div>`;
  document.body.appendChild(st);
  const $s = (id) => document.getElementById(id);
  const S = { done: {} };
  const unionRect = (sel) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; document.querySelectorAll(sel).forEach((e) => { const r = e.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }); return [x0, y0, x1, y1]; };
  const overlapSel = [...document.querySelectorAll("#calendar .cell")].filter((e) => e.dataset.key >= "2012-07" && e.dataset.key <= "2026-06");
  overlapSel.forEach((e) => e.classList.add("ovl"));
  const OV = unionRect("#calendar .cell.ovl");
  const preSel = [...document.querySelectorAll("#calendar .cell")].filter((e) => e.dataset.key < "2012-02"); preSel.forEach((e) => e.classList.add("pre"));
  const PRE = unionRect("#calendar .cell.pre");
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  let pBtn = null, pCell = null, H = null;
  window.__frame = (t) => {
    const act = { mouse: null, click: false };
    const ph = t < 5.6 ? 0 : t < 8.2 ? 1 : t < 10.6 ? 2 : 3;
    $s("k").textContent = ph < 3 ? "Armonización · Biobío" : "Un mes antiguo, explicado";
    $s("big").innerHTML = ["Dos satélites, <b>un traslape</b>", "Tal como <b>lo vio</b> cada satélite", "<b>Armonizado</b>", "Septiembre <b>2005</b>"][ph];
    $s("sub").textContent = ["Mapeo de cuantiles, aprendido en los 14 años en que ambos observaron juntos", "Unidos tal cual: en 2012 los focos parecen dispararse", "Una sola escala, la de VIIRS: los 25 años comparables", "Lo que vio MODIS, su cifra comparable y su margen"][ph];
    css($s("fade"), { opacity: 1 - out(seg(t, 0, 0.9)) });
    const intro = out(seg(t, 0.1, 1.2));
    // calendar card, then the day panel
    const sw = io(seg(t, 10.6, 11.2));
    css(cal, { opacity: 1 - sw, transform: `translateY(${(1 - intro) * 40}px) scale(${(0.97 + 0.03 * intro) * (1 + 0.04 * sw)})`, filter: intro < 1 ? `blur(${(1 - intro) * 10}px)` : "none" });
    if (t >= 10.5 && !S.done.d) { S.done.d = 1; showMonth("2005-09", false); }
    if (S.done.d) {
      const strip = document.querySelector("#day-conv .conv");
      if (strip && !H) { const r = strip.getBoundingClientRect(), c = day.getBoundingClientRect(); H = [r.left + r.width / 2 - c.left, r.top + r.height / 2 - c.top]; day.style.transformOrigin = `${H[0]}px ${H[1]}px`; }
      const zk = io(seg(t, 11.0, 12.6)), dxs = H ? (960 - (day.getBoundingClientRect().left * 0 + 72 + H[0])) : 0;
      css(day, { opacity: sw, transform: `translate(${dxs * zk}px, ${40 * zk}px) scale(${(0.96 + 0.04 * sw) * (1 + 0.34 * zk)})` });
      // highlight what the voice names
      const boxes = document.querySelectorAll("#day-conv .cv");
      const on = t < 12.6 ? 0 : t < 14.4 ? 2 : 3;
      boxes.forEach((b, k) => css(b, { boxShadow: (k === on && t >= 11.0) ? "0 0 0 3px #eaff28, 0 0 40px rgba(234,255,40,.45)" : "", transition: "none" }));
      const rng = document.querySelector("#day-conv .cv.out span");
      if (rng) css(rng, { color: on === 3 ? "#eaff28" : "", fontWeight: on === 3 ? "700" : "" });
      if (on === 3 && boxes[2]) css(boxes[2], { boxShadow: "0 0 0 3px #eaff28, 0 0 40px rgba(234,255,40,.45)" });
    } else css(day, { opacity: 0 });
    // overlap box (phase 0) and the false jump (phase 1)
    const ob = out(seg(t, 1.0, 1.6)) * (1 - out(seg(t, 5.2, 5.6)));
    const jb = out(seg(t, 5.8, 6.3)) * (1 - out(seg(t, 7.9, 8.2)));
    const R = ob > 0.01 ? OV : PRE, bk = Math.max(ob, jb);
    css($s("bx"), { left: `${R[0] - 8}px`, top: `${R[1] - 8}px`, width: `${R[2] - R[0] + 16}px`, height: `${R[3] - R[1] + 16}px`, opacity: bk,
      borderColor: jb > 0.01 ? "#ff8a3d" : "#eaff28", boxShadow: jb > 0.01 ? "0 0 0 6px rgba(255,138,61,.12), 0 0 40px rgba(255,138,61,.35)" : "" });
    const tg = $s("tg1");
    if (ob > 0.01) { tg.innerHTML = "14 temporadas de traslape<br><span style='font-weight:500;font-size:20px;color:#c9d6ea'>aquí se aprende la conversión</span>"; css(tg, { left: `${OV[2] + 30}px`, top: `${(OV[1] + OV[3]) / 2 - 40}px`, opacity: ob, background: "rgba(7,21,54,.95)", border: "2px solid #eaff28", color: "#eaff28" }); }
    else { tg.innerHTML = "Antes de 2012: MODIS<br><span style='font-weight:500;font-size:20px;color:#c9d6ea'>parece que había mucho menos fuego</span>"; css(tg, { left: `${PRE[2] + 30}px`, top: `${(PRE[1] + PRE[3]) / 2 - 40}px`, opacity: jb, background: "rgba(7,21,54,.95)", border: "2px solid #ff8a3d", color: "#ffb27a" }); }
    const hk = out(seg(t, 9.2, 9.6)) * (1 - out(seg(t, 10.3, 10.6)));
    css($s("tg2"), { left: `${PRE[2] + 30}px`, top: `${(PRE[1] + PRE[3]) / 2 - 40}px`, opacity: hk, background: "rgba(7,21,54,.95)", border: "2px solid #eaff28", color: "#eaff28" });
    $s("tg2").innerHTML = "Mismos años, en escala VIIRS<br><span style='font-weight:500;font-size:20px;color:#c9d6ea'>el salto falso desapareció</span>";
    // cursor: click "Armonizado", then the 2005-09 cell
    if (t >= 6.9 && !pBtn) pBtn = center(document.getElementById("mode-h"));
    if (t >= 9.6 && !pCell) pCell = center(document.querySelector("#calendar .cell[data-key='2005-09']"));
    let cx = 1500, cy = 1000, cop = 0;
    if (pBtn && t < 9.6) { const k = io(seg(t, 6.9, 8.0)); cx = 1500 + (pBtn[0] - 1500) * k; cy = 1000 + (pBtn[1] - 1000) * k; cop = out(seg(t, 6.9, 7.2)); }
    if (pCell && t >= 9.6) { const k = io(seg(t, 9.6, 10.3)); cx = pBtn[0] + (pCell[0] - pBtn[0]) * k; cy = pBtn[1] + (pCell[1] - pBtn[1]) * k; cop = 1 - out(seg(t, 10.6, 10.9)); }
    css($s("cur"), { left: `${cx}px`, top: `${cy}px`, opacity: cop, transform: `scale(${(t >= 8.15 && t < 8.35) || (t >= 10.4 && t < 10.6) ? 0.8 : 1})` });
    const rp = (c0) => { const k = seg(t, c0, c0 + 0.6); return k > 0 && k < 1 ? k : null; };
    const rk = rp(8.2) ?? rp(10.45);
    if (rk != null) { const Rr = 20 + 70 * out(rk); css($s("rip"), { left: `${cx - Rr}px`, top: `${cy - Rr}px`, width: `${2 * Rr}px`, height: `${2 * Rr}px`, opacity: 1 - rk }); } else css($s("rip"), { opacity: 0 });
    if (t >= 7.6 && t < 8.2) act.mouse = [cx, cy];
    if (t >= 8.2 && !S.done.h) { S.done.h = 1; act.mouse = [cx, cy]; act.click = true; }
    if (t >= 8.4 && !S.done.away) { S.done.away = 1; act.mouse = [4, 4]; }
    return act;
  };
})();
