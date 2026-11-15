// VG · how many more hotspots VIIRS sees than MODIS Aqua, season by season (Biobío): the ratio moves, so one factor is not enough.
(() => {
  const css = (el, s) => Object.assign(el.style, s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const io = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sty = document.createElement("style");
  sty.textContent = `#kcard, #kcard * { visibility:visible !important; }
    #map-card { display:none !important; }
    #kcard { position:fixed !important; left:560px; right:560px; top:300px; margin:0 !important; z-index:5; transition:none !important; transform-origin:50% 0%; }
    #kcard > h2, #k-sub, #k-plain, #k-legend span:last-child { display:none !important; }
    #kchart rect.kb { transform-box:fill-box; transform-origin:50% 100%; }
    #stage .qm { position:absolute; left:50%; top:430px; width:1240px; transform:translateX(-50%); padding:36px 44px; border-radius:26px; background:rgba(7,21,54,.94); border:1px solid rgba(234,255,40,.5); box-shadow:0 40px 120px rgba(0,0,0,.6), 0 0 60px rgba(234,255,40,.12); }
    #stage .qm h4 { margin:0 0 22px; font:700 22px "Inter",sans-serif; letter-spacing:.18em; text-transform:uppercase; color:#eaff28; }
    #stage .qm .row { display:flex; align-items:center; gap:30px; }
    #stage .qm .p { flex:1; padding:22px 26px; border-radius:18px; border:1px solid rgba(140,180,255,.25); background:rgba(18,38,80,.6); font:500 24px/1.3 "Inter",sans-serif; color:#c9d6ea; }
    #stage .qm .p b { display:block; font:800 40px "Inter Display",sans-serif; color:#eaf1ff; margin-bottom:6px; }
    #stage .qm .p.v { border-color:rgba(234,255,40,.6); } #stage .qm .p.v b { color:#eaff28; }
    #stage .qm .arr { font:800 56px "Inter",sans-serif; color:#eaff28; }
    #stage .qm small { display:block; margin-top:20px; font:500 21px "Inter",sans-serif; color:#c9d6ea; }
    #stage .kl { position:absolute; transform:translate(-50%,-100%); padding:10px 16px; border-radius:14px; font:800 30px "Inter Display",sans-serif; background:rgba(7,21,54,.95); white-space:nowrap; }
    #stage .kl small { display:block; font:600 16px "Inter",sans-serif; color:#c9d6ea; }`;
  document.head.appendChild(sty);
  const K = document.getElementById("kcard"); K.classList.add("in");
  renderK();
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<div class="kick"><i></i><span id="k"></span></div><div class="big" id="big"></div><div class="sub" id="sub"></div>
    <div class="brand"><img src="assets/logo-160.png" alt="">Overlap</div>
    <div class="qm" id="qm"><h4>Mapeo de cuantiles</h4><div class="row"><div class="p"><b>MODIS</b>un mes en su percentil 80</div><div class="arr">→</div><div class="p v"><b>VIIRS</b>el valor de su percentil 80</div></div><small>Aprendido en las 14 temporadas de traslape · probado en años que el modelo nunca vio</small></div><div class="kl" id="lo"></div><div class="kl" id="hi"></div><div class="fade" id="fade"></div>`;
  document.body.appendChild(st);
  const $s = (id) => document.getElementById(id);
  const bars = [...document.querySelectorAll("#kchart rect")].filter((r) => r.querySelector("title"));
  bars.forEach((b) => b.classList.add("kb"));
  const val = (b) => +b.querySelector("title").textContent.split("×")[1].replace(",", ".");
  const vals = bars.map(val), iLo = vals.indexOf(Math.min(...vals)), iHi = vals.indexOf(Math.max(...vals));
  const seasonOf = (b) => b.querySelector("title").textContent.split(":")[0];
  const fx = (v) => v.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  $s("lo").innerHTML = `×${fx(vals[iLo])}<small>${seasonOf(bars[iLo])}</small>`; $s("hi").innerHTML = `×${fx(vals[iHi])}<small>${seasonOf(bars[iHi])}</small>`;
  const line = [...document.querySelectorAll("#kchart line")].find((l) => l.getAttribute("stroke") === "#eaff28");
  window.__frame = (t) => {
    const ph = t < 7.5 ? 0 : t < 10.5 ? 1 : 2;
    $s("k").textContent = ["Biobío · temporada por temporada", "El atajo que no sirve", "Lo que hace Overlap"][ph];
    $s("big").innerHTML = ["Entre <b>4 y 7 veces</b> más focos", "Un factor fijo <b>no sirve</b>", "La relación <b>completa</b>"][ph];
    $s("sub").textContent = ["Focos de VIIRS por cada foco de MODIS Aqua, en las 14 temporadas en que ambos observaron", "Un solo número (×5,9) ignora cómo cambia cada temporada", "Meses chicos y meses grandes se traducen distinto: mapeo de cuantiles"][ph];
    css($s("fade"), { opacity: 1 - out(seg(t, 0, 0.9)) });
    const ci = out(seg(t, 0.2, 1.3));
    const qk = out(seg(t, 10.6, 11.2));
    css(K, { opacity: ci * (1 - 0.65 * qk), filter: qk > 0.01 ? `blur(${6 * qk}px)` : "none", transform: `translateY(${(1 - ci) * 40}px) scale(${2.15 * (0.97 + 0.03 * ci) * (1 + 0.04 * io(seg(t, 1, 10.5)))})` });
    css($s("qm"), { opacity: qk, transform: `translateX(-50%) translateY(${(1 - qk) * 30}px) scale(${0.96 + 0.04 * qk})` });
    // bars grow one after another
    bars.forEach((b, i) => { const k = out(seg(t, 0.8 + i * 0.12, 1.6 + i * 0.12)); b.style.transform = `scaleY(${k})`;
      const lit = (ph === 0 && t > 4.2 && (i === iLo || i === iHi)) ; b.style.opacity = ph === 1 ? 0.45 : lit ? 1 : t > 4.2 && ph === 0 ? 0.5 : 0.75 + 0.25 * (ph === 2);
      b.style.filter = lit ? "drop-shadow(0 0 10px rgba(234,255,40,.8))" : ""; b.setAttribute("fill", lit ? "#eaff28" : "#0197f8"); });
    // labels on the lowest and highest season
    const lab = (id, b, k) => { const r = b.getBoundingClientRect(); css($s(id), { left: `${r.left + r.width / 2}px`, top: `${r.top - 14}px`, opacity: k, color: "#eaff28", border: "2px solid #eaff28", transform: `translate(-50%, calc(-100% + ${(1 - k) * 14}px))` }); };
    const lk = out(seg(t, 4.3, 4.8)) * (1 - out(seg(t, 7.2, 7.5)));
    lab("lo", bars[iLo], lk); lab("hi", bars[iHi], lk);
    // the fixed factor: the dashed line pulses
    if (line) { const p = ph === 1 ? 0.5 + 0.5 * Math.sin((t - 7.5) * 6) : 0; line.setAttribute("stroke-width", 2 + 3 * p); line.style.filter = ph === 1 ? `drop-shadow(0 0 ${6 + 10 * p}px #eaff28)` : ""; line.style.opacity = t < 2.6 ? out(seg(t, 2.2, 2.6)) : 1; }
    return null;
  };
})();
