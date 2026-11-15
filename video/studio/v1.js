// V1 · the problem: MODIS (1 km pixels) misses small fires that VIIRS (375 m) sees; joined as they are, the record jumps in 2012.
// Pixel panels are an illustration (seeded, same picture every time); the chart uses Chile's real season totals as each satellite saw them.
(() => {
  const css = (el, s) => Object.assign(el.style, s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const io = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sty = document.createElement("style");
  sty.textContent = `#map-card { display:none !important; }
    #stage .pan { position:absolute; top:330px; width:780px; height:560px; border-radius:24px; overflow:hidden; background:#071536; border:1px solid rgba(140,180,255,.2); box-shadow:0 40px 120px rgba(0,0,0,.5); }
    #stage .pan h5 { position:absolute; left:28px; top:22px; margin:0; font:800 34px "Inter Display",sans-serif; color:#eaf1ff; z-index:2; }
    #stage .pan h5 small { display:block; font:600 20px "Inter",sans-serif; color:#c9d6ea; margin-top:4px; }
    #stage .chart { position:absolute; left:120px; top:320px; width:1680px; height:600px; }
    #stage .ai { position:absolute; left:80px; bottom:40px; font:600 16px "Inter",sans-serif; color:rgba(201,214,234,.75); letter-spacing:.04em; }
    #stage .strike { position:absolute; left:50%; top:470px; transform:translateX(-50%); padding:26px 44px; border-radius:24px; background:rgba(7,21,54,.95); border:2px solid #eaff28; box-shadow:0 0 0 10px rgba(234,255,40,.1), 0 40px 120px rgba(0,0,0,.6); font:800 64px "Inter Display",sans-serif; color:#eaf1ff; white-space:nowrap; letter-spacing:-.02em; }
    #stage .strike b { color:#eaff28; }`;
  document.head.appendChild(sty);
  // seeded fires: a few large, many small
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const fires = [];
  for (let i = 0; i < 7; i++) fires.push({ x: 120 + rnd() * 540, y: 140 + rnd() * 360, r: 18 + rnd() * 16, big: 1 });
  for (let i = 0; i < 90; i++) fires.push({ x: 40 + rnd() * 700, y: 110 + rnd() * 430, r: 3 + rnd() * 4, big: 0 });
  const truth = fires.map((f) => `<circle cx="${f.x}" cy="${f.y}" r="${f.r}" fill="url(#fg)"/>`).join("");
  const grid = (cell, minR) => { let s = ""; for (let y = 90; y < 560; y += cell) for (let x = 0; x < 780; x += cell) {
      const hit = fires.some((f) => f.r >= minR && Math.abs(f.x - (x + cell / 2)) < cell / 2 + f.r * 0.6 && Math.abs(f.y - (y + cell / 2)) < cell / 2 + f.r * 0.6);
      s += `<rect class="${hit ? "hit" : "gc"}" x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="${cell > 30 ? 4 : 2}" data-y="${y}"/>`; } return s; };
  const panel = (id, left, title, sub, cell, minR) => `<div class="pan" id="${id}" style="left:${left}px"><h5>${title}<small>${sub}</small></h5>
    <svg width="780" height="560"><defs><radialGradient id="fg"><stop offset="0" stop-color="#ffe08a" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient></defs>
    <g opacity=".9">${truth}</g><g class="cells">${grid(cell, minR)}</g><rect class="scan" x="0" y="0" width="780" height="4" fill="#eaff28"/></svg></div>`;
  // real season totals, as each satellite saw them (Chile)
  const S = seasonTotals().filter((d) => d.s >= 2001 && d.s <= 2025);
  const W = 1680, H = 600, l = 90, r = 70, tp = 40, b = 60, vmax = Math.max(...S.map((d) => d.raw)) * 1.1;
  const X = (s) => l + ((s - S[0].s) / (S.at(-1).s - S[0].s)) * (W - l - r), Y = (v) => tp + (1 - v / vmax) * (H - tp - b);
  const pts = S.map((d) => `${X(d.s).toFixed(1)},${Y(d.raw).toFixed(1)}`).join(" ");
  const x12 = X(2011.6), ticks = S.filter((d) => d.s % 4 === 1).map((d) => `<text x="${X(d.s)}" y="${H - 18}" text-anchor="middle" font-size="20" fill="#8fa6cc">${d.s}–${String(d.s + 1).slice(2)}</text>`).join("");
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<div class="kick"><i></i><span id="k"></span></div><div class="big" id="big"></div><div class="sub" id="sub"></div>
    <div class="brand"><img src="assets/logo-160.png" alt="">Overlap</div>
    ${panel("pm", 140, "MODIS", "píxel de 1 km · ve los fuegos grandes", 64, 15)}${panel("pv", 1000, "VIIRS", "píxel de 375 m · ve también los pequeños", 24, 0)}
    <svg class="chart" id="ch" viewBox="0 0 ${W} ${H}"><defs><clipPath id="cw"><rect id="cwr" x="0" y="0" width="0" height="${H}"/></clipPath>
      <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></linearGradient></defs>
      <line x1="${l}" x2="${W - r}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(140,180,255,.25)"/>${ticks}
      <g clip-path="url(#cw)"><polygon points="${X(S[0].s)},${Y(0)} ${pts} ${X(S.at(-1).s)},${Y(0)}" fill="url(#ar)"/>
      <polyline points="${pts}" fill="none" stroke="#ff8a3d" stroke-width="5" stroke-linejoin="round" style="filter:drop-shadow(0 0 10px rgba(255,138,61,.8))"/></g>
      <g id="m12" opacity="0"><line x1="${x12}" x2="${x12}" y1="${tp}" y2="${Y(0)}" stroke="#eaff28" stroke-width="3" stroke-dasharray="10 8"/>
      <text x="${x12 + 16}" y="${tp + 30}" font-size="28" font-weight="800" fill="#eaff28">2012 · llega VIIRS</text></g>
      <text x="${l}" y="${tp - 6}" font-size="20" fill="#c9d6ea">Focos de calor por temporada en Chile, unidos tal cual: MODIS antes de 2012, VIIRS después</text></svg>
    <div class="strike" id="sk">No es el fuego: <b>es el satélite</b></div>
    <div class="ai">Animación generada con IA · datos reales de NASA FIRMS en el gráfico</div><div class="fade" id="fade"></div>`;
  document.body.appendChild(st);
  const $s = (id) => document.getElementById(id);
  const css2 = document.createElement("style");
  css2.textContent = `#stage .gc { fill:none; stroke:rgba(140,180,255,.10); } #stage .hit { fill:#ffd23f; stroke:#fff6c2; stroke-width:1; filter:drop-shadow(0 0 6px rgba(255,190,60,.9)); }`;
  document.head.appendChild(css2);
  window.__frame = (t) => {
    const ph = t < 5.0 ? 0 : t < 8.0 ? 1 : 2;
    $s("k").textContent = ["El problema · dos satélites", "Unidos tal cual", "La causa"][ph];
    $s("big").innerHTML = ["Mismo fuego, <b>otra vista</b>", "¿El fuego <b>explotó</b>?", "Cambió <b>el satélite</b>"][ph];
    $s("sub").textContent = ["En 2012 llega VIIRS: ve muchos más fuegos pequeños que MODIS", "Si se unen las cifras sin tratarlas, todo parece multiplicarse en 2012", "El salto es del sensor, no del fuego"][ph];
    css($s("fade"), { opacity: 1 - out(seg(t, 0, 0.8)) });
    // pixel panels: slide in, a scan line reveals the lit pixels
    const po = 1 - out(seg(t, 4.7, 5.2));
    [["pm", 0.2], ["pv", 0.5]].forEach(([id, d]) => {
      const p = $s(id), k = out(seg(t, d, d + 0.8)); css(p, { opacity: k * po, transform: `translateY(${(1 - k) * 50 - (1 - po) * 30}px)` });
      const sy = 90 + 470 * seg(t, d + 0.7, d + 2.4);
      p.querySelector(".scan").setAttribute("y", sy); p.querySelector(".scan").setAttribute("opacity", sy < 559 ? 0.9 : 0);
      p.querySelectorAll(".hit").forEach((c) => { c.style.opacity = +c.dataset.y < sy ? 1 : 0; });
    });
    // the chart draws left to right; the 2012 line; then the statement
    const ck = out(seg(t, 5.0, 5.4));
    css($s("ch"), { opacity: ck, transform: `translateY(${(1 - ck) * 30}px) scale(${1 + 0.03 * io(seg(t, 5, 11))})` });
    $s("cwr").setAttribute("width", W * io(seg(t, 5.2, 7.6)));
    $s("m12").setAttribute("opacity", out(seg(t, 6.0, 6.4)));
    const sk = out(seg(t, 8.1, 8.6));
    css($s("sk"), { opacity: sk, transform: `translateX(-50%) scale(${1.08 - 0.08 * sk})` });
    css($s("ch"), { filter: sk > 0.01 ? `blur(${4 * sk}px)` : "none", opacity: ck * (1 - 0.5 * sk) });
    return null;
  };
})();
