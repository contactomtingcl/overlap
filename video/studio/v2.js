// V2 · title: the two bands of the logo (coarse MODIS pixels, fine VIIRS dots) cross, the overlap ignites, the camera pulls back to the logo and the name.
(() => {
  const css = (el, s) => Object.assign(el.style, s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const io = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sty = document.createElement("style");
  sty.textContent = `#map-card { display:none !important; }
    #stage .wm { position:absolute; left:700px; top:388px; font:800 190px/1 "Inter Display",sans-serif; letter-spacing:-.045em; color:#eaf1ff; white-space:nowrap; }
    #stage .tl2 { position:absolute; left:708px; top:600px; font:600 46px/1.2 "Inter Display",sans-serif; letter-spacing:-.01em; color:#c9d6ea; white-space:nowrap; }
    #stage .tl2 b { color:#eaff28; }
    #stage .ev { position:absolute; left:0; right:0; bottom:90px; text-align:center; font:600 22px "Inter",sans-serif; letter-spacing:.24em; text-transform:uppercase; color:#8fa6cc; }
    #stage .ai { position:absolute; left:80px; bottom:40px; font:600 16px "Inter",sans-serif; color:rgba(201,214,234,.75); letter-spacing:.04em; }`;
  document.head.appendChild(sty);
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<svg width="1920" height="1080" style="position:absolute;inset:0">
    <defs>
      <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0aa0ff"/><stop offset=".55" stop-color="#0971c8"/><stop offset="1" stop-color="#0b3f8a"/></linearGradient>
      <pattern id="chk" width="56" height="56" patternUnits="userSpaceOnUse"><rect width="56" height="56" fill="#1a2f45"/><rect width="28" height="28" fill="#2c4a63"/><rect x="28" y="28" width="28" height="28" fill="#2c4a63"/></pattern>
      <pattern id="dot" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#14283d"/><circle cx="7" cy="7" r="3.2" fill="#3f6b8e"/></pattern>
      <clipPath id="sq"><rect x="-450" y="-450" width="900" height="900" rx="150"/></clipPath>
      <filter id="gl" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="28" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <g id="em"><g clip-path="url(#sq)">
      <rect x="-450" y="-450" width="900" height="900" fill="url(#bg2)"/>
      <g transform="rotate(-45)"><g id="bA"><rect x="-1800" y="-130" width="3600" height="260" fill="url(#chk)"/><rect id="shA" x="-1800" y="-130" width="300" height="260" fill="url(#sh)"/></g></g>
      <g transform="rotate(45)"><g id="bB"><rect x="-1800" y="-130" width="3600" height="260" fill="url(#dot)"/><rect id="shB" x="-1800" y="-130" width="300" height="260" fill="url(#sh)"/></g></g>
      <g id="dm" filter="url(#gl)"><rect x="-95" y="-95" width="190" height="190" transform="rotate(45)" fill="#eaff28"/><rect x="-55" y="-55" width="110" height="110" transform="rotate(45)" fill="#f8ffb0"/></g>
    </g><rect id="fl" x="-450" y="-450" width="900" height="900" rx="150" fill="#eaff28" opacity="0"/></g>
  </svg>
  <div class="wm" id="wm">Overlap</div>
  <div class="tl2" id="tl">Dos satélites. <b>Un solo calendario</b> honesto.</div>
  <div class="ev" id="ev">NASA Space Apps Challenge 2026 · Concepción, Chile</div>
  <div class="ai">Animación generada con IA</div><div class="fade" id="fade"></div>`;
  document.body.appendChild(st);
  const $s = (id) => document.getElementById(id);
  window.__frame = (t) => {
    css($s("fade"), { opacity: 1 - out(seg(t, 0, 0.5)) });
    // bands slide in along their own axis, then a light glint runs along them
    $s("bA").setAttribute("transform", `translate(${-2000 * (1 - out(seg(t, 0.2, 1.7)))},0)`);
    $s("bB").setAttribute("transform", `translate(${2000 * (1 - out(seg(t, 0.4, 1.9)))},0)`);
    const g = seg(t, 3.8, 6.6); $s("shA").setAttribute("x", -1200 + 2200 * g); $s("shB").setAttribute("x", 1000 - 2200 * g);
    // the overlap ignites with a flash
    const dk = out(seg(t, 1.9, 2.4)); $s("dm").setAttribute("transform", `scale(${dk})`); $s("dm").setAttribute("opacity", dk);
    const fk = seg(t, 2.0, 2.6); $s("fl").setAttribute("opacity", fk > 0 && fk < 1 ? 0.35 * Math.sin(Math.PI * fk) : 0);
    // camera pulls back from the crossing to the logo, beside the name
    const pk = io(seg(t, 2.6, 3.7)), s = 2.6 + (0.34 - 2.6) * pk, cx = 960 + (510 - 960) * pk, cy = 540 + (512 - 540) * pk;
    $s("em").setAttribute("transform", `translate(${cx},${cy}) scale(${s}) rotate(${-8 * (1 - pk)})`);
    const wk = out(seg(t, 3.3, 4.1)); css($s("wm"), { opacity: wk, clipPath: `inset(0 ${100 - 100 * wk}% 0 0)`, transform: `translateX(${(1 - wk) * -30}px)` });
    const tk = out(seg(t, 3.9, 4.6)); css($s("tl"), { opacity: tk, transform: `translateY(${(1 - tk) * 20}px)` });
    css($s("ev"), { opacity: out(seg(t, 4.6, 5.2)) });
    return null;
  };
})();
