// V3 · timeline: Chile → region → commune. window.__frame(t) sets the whole picture for time t (seconds).
(() => {
  const css = (el, s) => Object.assign(el.style, s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const io = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const M = map.reg.months, I = (m) => M.indexOf(m);
  const ML = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<div class="kick"><i></i><span id="k"></span></div><div class="big" id="big"></div><div class="sub" id="sub"></div>
    <div class="brand"><img src="assets/logo-160.png" alt="">Overlap</div>
    <div class="legend" id="lg">
      <div class="pill" id="p0"><span class="sw" style="background:linear-gradient(90deg,#3d9bff,#1f4f8a)"></span>Muchos menos focos de lo normal</div>
      <div class="pill" id="p1"><span class="sw" style="background:#17284c;border:1px solid #3a5585"></span>Lo normal</div>
      <div class="pill" id="p2"><span class="sw" style="background:linear-gradient(90deg,#9a4f2c,#ff8a3d,#ffe08a)"></span>Muchos más focos de lo normal</div></div>
    <div class="tl" id="tl"><div class="bar"></div><div class="fill" id="tlf"></div><div id="tlt"></div><div class="knob" id="tlk"></div></div>
    <div class="call" id="c1"></div><div class="call" id="c2"></div>
    <div class="rip" id="rip"></div><div class="cur" id="cur"></div><div class="fade" id="fade"></div>`;
  document.body.appendChild(st);
  const $s = (id) => document.getElementById(id);
  const hiRegions = (mo) => Object.entries(map.reg.regions).filter(([, R]) => R.z[I(mo)] >= 2).sort((a, b) => b[1].z[I(mo)] - a[1].z[I(mo)]);
  const short = (n) => n.replace("Metropolitana de Santiago", "Metropolitana").replace("Libertador General Bernardo O'Higgins", "O'Higgins");
  const card = (mo, label) => { const H = hiRegions(mo); return `<h3>${label}</h3><p><b>${H.length} regiones</b> con muchos más focos de lo normal</p><small>${H.map(([, R]) => short(R.name)).join(" · ")}</small>`; };
  $s("c1").innerHTML = card("2017-01", "Enero 2017"); $s("c2").innerHTML = card("2023-02", "Febrero 2023");
  const C = document.getElementById("map-card");
  // timeline ticks: one per season start, labels every 5 years, the VIIRS era marked
  const fx = (k) => (100 * k) / (M.length - 1);
  let tks = "";
  M.forEach((mo, k) => { if (mo.endsWith("-01")) { const y = +mo.slice(0, 4); tks += `<div class="tk" style="left:${fx(k)}%"></div>` + (y % 5 === 0 ? `<div class="yr" style="left:${fx(k)}%">${y}</div>` : ""); } });
  tks += `<div class="vline" style="left:${fx(I("2012-02"))}%"></div><div class="viirs" style="left:${fx(I("2012-02"))}%">2012 · LLEGA VIIRS</div>`;
  $s("tlt").innerHTML = tks;
  // the wide map, framed: Chile fills the screen; measured once at rest
  css(C, { transform: "none", background: "transparent" });
  const r0 = document.getElementById("mregs").getBoundingClientRect(), c0 = C.getBoundingClientRect();
  const K = 1720 / r0.width, ccx = r0.left + r0.width / 2, ccy = r0.top + r0.height / 2;
  const DX = 960 - (c0.left + K * (ccx - c0.left)), DY = 505 - (c0.top + K * (ccy - c0.top));
  C.style.transformOrigin = "0 0";
  const S = { done: {}, last: -1, mouse: null, click: null };
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  let pBio, pNac;
  window.__frame = (t) => {
    const act = { mouse: null, click: false };
    // month
    let mi;
    if (t < 0.5) mi = 0;
    else if (t < 9.0) mi = io(seg(t, 0.5, 9.0)) * I("2017-01");
    else if (t < 11.6) mi = I("2017-01");
    else if (t < 12.8) mi = I("2017-01") + io(seg(t, 11.6, 12.8)) * (I("2023-02") - I("2017-01"));
    else if (t < 21.8) mi = I("2023-02");
    else mi = I("2022-09") + seg(t, 21.8, 27.2) * (I("2023-05") - I("2022-09"));
    mi = Math.round(mi);
    if (mi !== S.last) { map.i = mi; document.getElementById("map-slider").value = mi; paintMap(); S.last = mi; }
    const [y, m] = M[mi].split("-");
    $s("big").innerHTML = `${ML[+m - 1][0].toUpperCase() + ML[+m - 1].slice(1)} <b>${y}</b>`;
    // texts by phase
    const ph = t < 16.3 ? 0 : t < 20.6 ? 1 : 2;
    $s("k").textContent = ["Chile, región por región", "Región del Biobío", "Biobío · comuna de Nacimiento"][ph];
    $s("sub").textContent = ["Cada región comparada con lo normal de ese mismo mes en 25 años", "Focos de calor por comuna, tal como los vio el satélite", "Su historia, mes a mes"][ph];
    // fade in
    css($s("fade"), { opacity: 1 - out(seg(t, 0, 1.1)) });
    // camera on the card
    const zt = io(seg(t, 15.4, 16.2));
    const push = 1 + 0.03 * seg(t, 0, 16.3), intro = out(seg(t, 0.2, 1.6));
    const k = (K * push * (0.94 + 0.06 * intro)) * (1 - zt) + zt, dx = DX * (1 - zt), dy = (DY + (1 - intro) * 40) * (1 - zt);
    // keep Chile centred while the slow push grows it
    const kk = K * push * (0.94 + 0.06 * intro), adj = (1 - zt) * (kk - K) * 0;
    C.style.setProperty("--cz", zt);
    css(C, { top: `${300 - 38 * zt}px`, transform: `translate(${dx - (1 - zt) * (kk - K) * (ccx - c0.left)}px, ${dy - (1 - zt) * (kk - K) * (ccy - c0.top)}px) scale(${k})`,
      filter: intro < 1 ? `blur(${(1 - intro) * 10}px)` : "none", backdropFilter: zt > 0.01 ? `blur(${10 * zt}px)` : "none", webkitBackdropFilter: zt > 0.01 ? `blur(${10 * zt}px)` : "none", background: `rgba(12,27,60,${0.78 * zt})`, borderColor: `rgba(140,180,255,${0.14 * zt})`,
      boxShadow: `0 40px 120px rgba(0,0,0,${0.55 * zt}), 0 0 0 1px rgba(140,180,255,${0.16 * zt})` });
    // timeline: under Chile, then under the card
    const tlY = 690 + (975 - 690) * zt, tlOn = out(seg(t, 0.6, 1.4)) * (1 - 0.6 * Math.sin(Math.PI * zt));
    css($s("tl"), { top: `${tlY}px`, opacity: tlOn });
    css($s("tlf"), { width: `${fx(mi)}%` }); css($s("tlk"), { left: `${fx(mi)}%` });
    // legend pills
    const lgOn = out(seg(t, 2.2, 2.9)) * (1 - out(seg(t, 15.0, 15.6)));
    css($s("lg"), { opacity: lgOn, transform: `translateY(${(1 - lgOn) * 20}px)` });
    const act3 = t < 5.6 ? -1 : t < 6.8 ? 0 : t < 7.9 ? 1 : t < 9.0 ? 2 : 9;
    ["p0", "p1", "p2"].forEach((p, k) => {
      const on = act3 === 9 || act3 === k, lit = act3 === k;
      css($s(p), { opacity: act3 === -1 ? 0.45 : on ? 1 : 0.32, transform: `scale(${lit ? 1.08 : 1})`, boxShadow: lit ? "0 0 0 2px #eaff28, 0 0 40px rgba(234,255,40,.35)" : "none", transition: "none" });
    });
    // callouts + highlighted regions
    const show = (id, a, b) => { const k = out(seg(t, a, a + 0.5)) * (1 - out(seg(t, b - 0.4, b))); css($s(id), { opacity: k, transform: `translateX(${(1 - k) * 60}px)` }); return k > 0.01; };
    const s1 = show("c1", 9.1, 11.6), s2 = show("c2", 12.9, 15.4);
    css(document.querySelector("#stage .brand"), { opacity: 1 - Math.max(+$s("c1").style.opacity || 0, +$s("c2").style.opacity || 0) });
    const hl = s1 ? hiRegions("2017-01").map(([k]) => k) : s2 ? hiRegions("2023-02").map(([k]) => k) : [];
    document.querySelectorAll("#mregs .reg").forEach((el) => el.classList.toggle("hl", hl.includes(el.dataset.r) && t < 16.3));
    // cursor
    if (t >= 15.0 && t < 16.3) pBio = center(document.querySelector(".reg[data-r='8']"));
    if (t >= 19.5 && !pNac) pNac = center(document.querySelector(".com[data-c='8306']"));
    let cx = 1500, cy = 980, cop = 0;
    const PM = [620, 760];
    if (t >= 15.2 && t < 16.8) { const k = io(seg(t, 15.2, 16.15)); cx = 1500 + (pBio[0] - 1500) * k; cy = 980 + (pBio[1] - 980) * k; cop = out(seg(t, 15.2, 15.5)); }
    if (t >= 16.8 && t < 19.5) { const k = io(seg(t, 16.8, 18.0)); cx = pBio[0] + (PM[0] - pBio[0]) * k; cy = pBio[1] + (PM[1] - pBio[1]) * k; }
    if (t >= 19.5) { const k = io(seg(t, 19.5, 20.45)); cx = PM[0] + (pNac[0] - PM[0]) * k; cy = PM[1] + (pNac[1] - PM[1]) * k; cop = 1 - out(seg(t, 21.0, 21.5)); }
    if (t >= 16.3 && t < 19.5) cop = 1;
    css($s("cur"), { left: `${cx}px`, top: `${cy}px`, opacity: cop, transform: `scale(${t >= 16.25 && t < 16.45 || t >= 20.55 && t < 20.75 ? 0.8 : 1})` });
    const rp = (c0) => { const k = seg(t, c0, c0 + 0.6); return k > 0 && k < 1 ? k : null; };
    const r1 = rp(16.3), r2 = rp(20.6), rk = r1 ?? r2;
    if (rk != null) { const R = 20 + 70 * out(rk); css($s("rip"), { left: `${cx - R}px`, top: `${cy - R}px`, width: `${2 * R}px`, height: `${2 * R}px`, opacity: 1 - rk }); } else css($s("rip"), { opacity: 0 });
    // real mouse for hover states and the clicks
    if ((t >= 15.6 && t < 16.3) || (t >= 19.9 && t < 20.6)) act.mouse = [cx, cy];
    if (!S.done.r && t >= 16.3) { S.done.r = 1; act.click = true; act.mouse = [cx, cy]; }
    if (!S.done.c && t >= 20.6) { S.done.c = 1; act.click = true; act.mouse = [cx, cy]; }
    if ((t >= 16.5 && t < 16.55) || (t >= 20.8 && t < 20.85)) act.mouse = [4, 4];
    return act;
  };
})();
