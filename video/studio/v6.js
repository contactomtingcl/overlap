// V6 · validation against CONAF: the 2012 jump before and after (Maule to La Araucanía), then the error on hidden years.
(() => {
  const css = (el, s) => Object.assign(el.style, s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const io = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sty = document.createElement("style");
  sty.textContent = `#jcard, #jcard *, #tcard, #tcard * { visibility:visible !important; }
    #map-card { display:none !important; }
    #jcard, #tcard { position:fixed !important; left:72px; right:72px; top:300px; margin:0 !important; z-index:5; transition:none !important; transform-origin:50% 20%; }
    #jcard > h2, #jcard > .sub, #tcard > h2 { display:none !important; }
    #jcard #jump-figs { font-size:20px !important; gap:40px !important; } #jcard #jump-figs > div { font-size:19px !important; line-height:1.35; }
    #jcard #jump-figs b { font-size:76px !important; line-height:1.05 !important; }
    #tcard #trust h3, #tcard #trust h3 ~ * { display:none !important; }
    #tcard .trust { font-size:20px !important; } #tcard .trust td, #tcard .trust th { padding:14px 16px !important; }
    #stage .stat { position:absolute; right:80px; top:60px; width:600px; padding:24px 30px; border-radius:22px; background:linear-gradient(150deg, rgba(234,255,40,.16), rgba(12,27,60,.94) 55%); border:1px solid rgba(234,255,40,.55); box-shadow:0 30px 90px rgba(0,0,0,.5), 0 0 60px rgba(234,255,40,.15); }
    #stage .stat b { display:block; font:800 84px/1 "Inter Display",sans-serif; color:#eaff28; letter-spacing:-.03em; }
    #stage .stat span { display:block; margin-top:8px; font:500 22px/1.35 "Inter",sans-serif; color:#eaf1ff; }
    #stage .ring6 { position:absolute; border-radius:18px; border:3px solid; pointer-events:none; }
    #stage .note6 { position:absolute; padding:14px 22px; border-radius:16px; font:700 24px/1.25 "Inter",sans-serif; background:rgba(7,21,54,.95); white-space:nowrap; }`;
  document.head.appendChild(sty);
  const J = document.getElementById("jump-figs").closest(".card"); J.id = "jcard"; J.classList.add("in");
  const T = document.getElementById("trust").closest(".card"); T.id = "tcard"; T.classList.add("in");
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<div class="kick"><i></i><span id="k"></span></div><div class="big" id="big"></div><div class="sub" id="sub"></div>
    <div class="brand"><img src="assets/logo-160.png" alt="">Overlap</div>
    <div class="stat" id="stat"><b>×1,47</b><span>error mensual medio con MODIS Aqua, en años que el modelo nunca vio (2020–2026)</span></div>
    <div class="ring6" id="r1"></div><div class="ring6" id="r2"></div><div class="note6" id="n1"></div><div class="note6" id="n2"></div>
    <div class="fade" id="fade"></div>`;
  document.body.appendChild(st);
  const $s = (id) => document.getElementById(id);
  const S = { done: {} };
  const figs = () => document.querySelectorAll("#jump-figs > div");
  const box = (el, pad = 12) => { const r = el.getBoundingClientRect(); return [r.left - pad, r.top - pad, r.width + 2 * pad, r.height + 2 * pad]; };
  const fmt = (v) => Math.round(v).toLocaleString("es-CL");
  window.__frame = (t) => {
    const ph = t < 3.7 ? 0 : t < 9.1 ? 1 : 2;
    $s("k").textContent = ["Validación · registros de CONAF", "El salto de 2012 · Maule a La Araucanía", "Años que el modelo nunca vio"][ph];
    const n = Math.round(76002 * out(seg(t, 0.4, 2.8)));
    $s("big").innerHTML = [`<b>${fmt(n)}</b> incendios`, `×4,7 <span style="opacity:.5">→</span> <b>×0,89</b>`, `Años <b>ocultos</b>`][ph];
    $s("sub").textContent = ["Registrados por CONAF en las cuatro regiones calibradas, temporadas 2002–03 a 2019–20", "Focos por incendio, después de 2012 frente a antes: ×1 = sin salto", "Si un mes antiguo muestra 100 focos, lo real suele estar entre 68 y 147"][ph];
    css($s("fade"), { opacity: 1 - out(seg(t, 0, 0.9)) });
    // jump card rises, figures count, the chart wipes in
    if (t >= 0.2 && !S.done.j) { S.done.j = 1; state.chartAnim = true; renderJump(); state.chartAnim = false; }
    const ji = out(seg(t, 0.2, 1.4)), jo = io(seg(t, 9.0, 9.6));
    css(J, { opacity: ji * (1 - jo), transform: `translateY(${(1 - ji) * 50 - 30 * jo}px) scale(${(0.97 + 0.03 * ji) * (1 + 0.05 * io(seg(t, 3.7, 9.0)))})`, filter: ji < 1 ? `blur(${(1 - ji) * 10}px)` : "none" });
    const ti = io(seg(t, 9.1, 9.8));
    css(T, { opacity: ti, transform: `translateY(${(1 - ti) * 50}px) scale(${(0.97 + 0.03 * ti) * (1 + 0.06 * io(seg(t, 9.8, 17)))})` });
    // rings and notes on the two figures
    const F = figs(), ring = (id, el, col, k) => { if (!el || k <= 0.01) { css($s(id), { opacity: 0 }); return; } const b = box(el); css($s(id), { left: `${b[0]}px`, top: `${b[1]}px`, width: `${b[2]}px`, height: `${b[3]}px`, opacity: k, borderColor: col, boxShadow: `0 0 40px ${col}66` }); };
    const k1 = out(seg(t, 3.8, 4.3)) * (1 - out(seg(t, 8.7, 9.0))), k2 = out(seg(t, 6.2, 6.7)) * (1 - out(seg(t, 8.7, 9.0)));
    ring("r1", F[0], "#ff8a3d", k1); ring("r2", F[1], "#eaff28", k2);
    const note = (id, el, html, col, k) => { if (!el || k <= 0.01) { css($s(id), { opacity: 0 }); return; } const b = box(el); $s(id).innerHTML = html; css($s(id), { left: `${b[0]}px`, top: `${b[1] + b[3] + 14}px`, opacity: k, border: `2px solid ${col}`, color: col, transform: `translateY(${(1 - k) * 16}px)` }); };
    note("n1", F[0], "Sin armonizar: salto falso ×4,7", "#ffb27a", k1);
    note("n2", F[1], "Armonizado: ×0,89 · el intervalo incluye 1: sin salto", "#eaff28", k2);
    // the error on hidden years
    const sk = out(seg(t, 9.6, 10.2));
    css($s("stat"), { opacity: ph === 2 ? sk : 0, transform: `translateX(${(1 - sk) * 60}px)` });
    css(document.querySelector("#stage .brand"), { opacity: ph === 2 ? 1 - sk : 1 });
    return null;
  };
})();
