// Written with AI assistance (Claude, Anthropic); reviewed by the Overlap team. See docs/AI_USE.md.
// Overlap web app: month x year burning activity calendar from pre-computed JSON (no server).
"use strict";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SOURCE_NAME = { SNPP: "VIIRS Suomi NPP (observed)", NOAA20: "VIIRS NOAA-20 (scaled)",
  Aqua: "MODIS Aqua (scaled)", Terra: "MODIS Terra, morning orbit (scaled)" };
// Sequential ramp on a dark background: brightness grows with activity (slate -> blue -> lime glow),
// taken from the Overlap logo. Monotonic in lightness, so it also reads in greyscale.
const RAMP = ["#152a42", "#173f6c", "#0b5fae", "#0197f8", "#25c1d8", "#7fe08a", "#d6f53a", "#f7ffbf"];
const NO_DATA = "#0f1d38";
const LEVEL = { "unusually high": ["unusually high", "var(--high)"], "unusually low": ["unusually low", "var(--low)"], "within normal": ["within normal", "var(--normal)"] };
// Four-region CONAF check (pipeline/10, results/validation_conaf/jump_at_2012_vs_conaf.csv)
const CONAF_ALL = { unh: 4.7, h: 0.89, lo: 0.77, hi: 1.07 };

const state = { aoi: "r8", rows: "season", mode: "harmonized", data: null, daily: {}, max: 1, lastWidth: 0 };
const $ = (id) => document.getElementById(id);
const fmt = (v) => v == null ? "—" : Math.round(v).toLocaleString("en-US");
const shortName = () => state.data.name.replace(" region, Chile", "").replace(" (whole country)", "");

function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
const RAMP_RGB = RAMP.map(hex2rgb);
function lev(v, max) { return Math.max(0, Math.min(1, Math.log10(v + 1) / Math.log10(max + 1))); }
function colour(v, max) {
  if (v == null) return null;
  const t = lev(v, max) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(t)), f = t - i;
  const a = RAMP_RGB[i], b = RAMP_RGB[i + 1];
  return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * f)).join(",")})`;
}

// Value shown for a month: harmonized, or what you get by joining the sensors as they are.
function rawValue(r) {
  if (!r || r.value == null) return null;
  if (r.status === "estimated") return r.raw[r.source] ?? null;
  if (r.status === "observed") return r.raw.SNPP ?? r.value;
  return r.value; // provisional / partial months are already VIIRS
}
const shown = (r) => (state.mode === "raw" ? rawValue(r) : (r ? r.value : null));

async function load() {
  const res = await fetch(`data/${state.aoi}.json`);
  state.data = await res.json();
  state.max = Math.max(...state.data.months.map((r) => r.value).filter((v) => v != null));
  render(true);
}

function grid() {
  const byMonth = new Map(state.data.months.map((r) => [r.month, r]));
  const first = 2000, last = 2026, rows = [];
  if (state.rows === "season") {
    for (let y = first; y <= last - 1 + (state.data.months.at(-1).month >= `${last}-07` ? 1 : 0); y++) {
      const cells = [];
      for (let i = 0; i < 12; i++) {
        const mm = ((6 + i) % 12) + 1, yy = i < 6 ? y : y + 1;
        cells.push({ key: `${yy}-${String(mm).padStart(2, "0")}`, mm });
      }
      rows.push({ label: `${y}–${String(y + 1).slice(2)}`, start: y, cells });
    }
  } else {
    for (let y = first; y <= last; y++) {
      rows.push({ label: String(y), start: y, cells: MONTHS.map((_, i) => ({ key: `${y}-${String(i + 1).padStart(2, "0")}`, mm: i + 1 })) });
    }
  }
  rows.forEach((r) => r.cells.forEach((c) => { c.rec = byMonth.get(c.key) || null; }));
  return rows;
}

function cellFill(r) {
  if (r && r.withheld) return "url(#hatch)";
  const c = colour(shown(r), state.max);
  return c || "url(#hatch)";
}

function renderCalendar(animate) {
  const rows = grid();
  const box = $("calendar").clientWidth || 900;
  state.lastWidth = box;
  const narrow = box < 620;
  const left = narrow ? 50 : 70, right = narrow ? 36 : 160, top = 26, ch = narrow ? 20 : 22;
  const cw = Math.max(20, Math.min(58, Math.floor((box - left - right) / 12)));
  const W = left + 12 * cw + right, H = top + rows.length * ch + 10;
  const head = (state.rows === "season" ? [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5] : [...Array(12).keys()])
    .map((m, i) => `<text x="${left + i * cw + cw / 2}" y="15" text-anchor="middle" font-size="${narrow ? 10.5 : 12}" fill="#8fa6cc">${narrow ? MONTHS[m][0] : MONTHS[m]}</text>`).join("");
  let body = "", eraY = null;
  rows.forEach((row, ri) => {
    const y = top + ri * ch;
    if (row.start === 2012 && eraY == null) eraY = y;
    body += `<text x="${left - 8}" y="${y + ch / 2 + 4}" text-anchor="end" font-size="${narrow ? 10.5 : 12}" fill="#c9d6ea">${narrow ? row.label.replace(/^20/, "") : row.label}</text>`;
    const sources = new Set();
    row.cells.forEach((c, ci) => {
      const x = left + ci * cw, r = c.rec;
      const delay = animate ? ` class="cell pop" style="fill:${cellFill(r)};animation-delay:${ri * 28 + ci * 6}ms"` : ` class="cell" style="fill:${cellFill(r)}"`;
      body += `<rect${delay} data-key="${c.key}" x="${x + 1.5}" y="${y + 1.5}" width="${cw - 3}" height="${ch - 3}" rx="${narrow ? 3 : 4}"/>`;
      if (r && (r.status === "provisional" || r.status === "partial")) {
        body += `<rect x="${x + 2.5}" y="${y + 2.5}" width="${cw - 5}" height="${ch - 5}" rx="3" fill="none" stroke="#eaff28" stroke-width="1.2" stroke-dasharray="3 2" pointer-events="none"/>`;
      }
      if (r && r.value != null) sources.add(r.status === "estimated" ? r.source : r.source === "NOAA20" ? "NOAA20" : "SNPP");
    });
    const hasModis = sources.has("Aqua") || sources.has("Terra"), hasViirs = sources.has("SNPP") || sources.has("NOAA20");
    const ix = left + 12 * cw + 8, iy = y + ch / 2 - 6;
    if (hasModis) body += `<rect x="${ix}" y="${iy}" width="12" height="12" rx="2" fill="url(#pmodis)"/>`;
    if (hasViirs) body += `<rect x="${ix + (hasModis ? 14 : 0)}" y="${iy}" width="12" height="12" rx="2" fill="url(#pviirs)"/>`;
    if (!narrow) {
      const note = [...sources].map((s) => s === "SNPP" ? "VIIRS" : s === "NOAA20" ? "NOAA-20" : `MODIS ${s}`).join(" + ");
      body += `<text x="${ix + 32}" y="${y + ch / 2 + 4}" font-size="11.5" fill="#8fa6cc">${note}</text>`;
    }
  });
  let era = "";
  if (eraY != null) {
    era = `<line x1="${left - 4}" x2="${left + 12 * cw + 2}" y1="${eraY}" y2="${eraY}" stroke="#eaff28" stroke-width="2" filter="url(#glow)"/>`
;
  }
  $("calendar").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Burning activity calendar, ${state.data.name}">
    <defs>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="${NO_DATA}"/><line x1="0" y1="0" x2="0" y2="6" stroke="#2a3d63" stroke-width="2"/></pattern>
      <pattern id="pmodis" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#22384a"/><rect width="3" height="3" fill="#4d6b85"/><rect x="3" y="3" width="3" height="3" fill="#4d6b85"/></pattern>
      <pattern id="pviirs" width="3" height="3" patternUnits="userSpaceOnUse">
        <rect width="3" height="3" fill="#0d2a52"/><circle cx="1.5" cy="1.5" r=".8" fill="#4db8ff"/></pattern>
      <filter id="glow" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${head}${body}${era}</svg>`;
  $("calendar").querySelectorAll(".cell").forEach((el) => {
    el.addEventListener("mousemove", (e) => tip(e, el.dataset.key));
    el.addEventListener("mouseleave", () => { $("tip").style.display = "none"; });
    el.addEventListener("click", () => showMonth(el.dataset.key));
  });
  const max = state.max;
  const stops = RAMP.map((c, i) => `${c} ${Math.round((i / (RAMP.length - 1)) * 100)}%`).join(",");
  $("legend").innerHTML = `<span class="ramp">0 <i style="background:linear-gradient(90deg,${stops})"></i> ${fmt(max)} hotspots / month (log)</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>no data (not zero)</span>`
    + `<span><i class="sw" style="border:1.5px dashed #eaff28;background:transparent"></i>provisional (near real-time)</span>`
    + `<span><i class="ico modis"></i>estimated from MODIS (coarse pixels)</span>`
    + `<span><i class="ico viirs"></i>observed by VIIRS (fine pixels)</span>`
    + `<span><i class="sw" style="height:3px;width:18px;background:#eaff28;border:0;box-shadow:0 0 6px #eaff28;vertical-align:3px"></i>VIIRS era begins (2012)</span>`;
  calSub();
}

function calSub() {
  $("cal-sub").innerHTML = state.mode === "raw"
    ? `<b style="color:#c9d6ea">Raw view:</b> each sensor's own count, joined as they are. Notice how activity seems to jump when VIIRS starts in 2012: that jump is the sensor, not the fire.`
    : `${shortName()}. Colour = hotspots per month in Suomi NPP-equivalent units (brighter = more). Hover a month for its range; click it to see its days.`;
}

function setMode(mode) {
  state.mode = mode;
  $("mode-h").setAttribute("aria-pressed", mode === "harmonized");
  $("mode-r").setAttribute("aria-pressed", mode === "raw");
  const byMonth = new Map(state.data.months.map((r) => [r.month, r]));
  $("calendar").querySelectorAll(".cell").forEach((el) => {
    el.classList.remove("pop"); el.style.fill = cellFill(byMonth.get(el.dataset.key) || null);
  });
  calSub();
  renderJump();
}

function tip(e, key) {
  const r = state.data.months.find((m) => m.month === key);
  const [y, m] = key.split("-");
  let html = `<b>${MONTHS_LONG[+m - 1]} ${y}</b><br>`;
  if (r && r.withheld) html += "Withheld: near real-time data over the Atacama desert holds many daytime false detections. Shown when science-quality data arrives.";
  else if (!r || r.value == null) html += "No satellite record for this month (not zero fire).";
  else {
    html += `${fmt(r.value)} hotspots, harmonized (Suomi NPP-equivalent)<br>`;
    if (r.status === "estimated") html += `Raw ${r.source === "Terra" ? "MODIS Terra" : "MODIS Aqua"}: ${fmt(rawValue(r))}<br>80% range: ${fmt(r.low)}–${fmt(r.high)}<br>Method: ${r.methods.includes("qmap") ? (r.methods.includes("ratio") ? "quantile mapping + simple ratio (mixed regions)" : "quantile mapping, validated") : "simple ratio, not validated here"}<br>`;
    else if (r.status === "provisional") html += "Provisional: near real-time Suomi NPP data, final values arrive later<br>";
    else if (r.status === "partial") html += `Partial month: data through ${r.through}, from NOAA-20 (Suomi NPP stopped on Nov 2, 2026)<br>`;
    else html += "Observed by VIIRS Suomi NPP<br>";
    html += `Median for ${MONTHS_LONG[+m - 1]}: ${fmt(state.data.climatology_median[+m])}`;
    if (r.anomaly) html += `<br>${r.anomaly[0].toUpperCase() + r.anomaly.slice(1)} (robust z = ${r.z})`;
    if (r.note) html += `<br>${r.note}`;
  }
  const t = $("tip");
  t.innerHTML = html; t.style.display = "block";
  t.style.left = Math.min(e.clientX + 14, innerWidth - 300) + "px";
  t.style.top = Math.min(e.clientY + 14, innerHeight - t.offsetHeight - 8) + "px";
}

function seasonTotals() {
  // Complete fire seasons (Jul-Jun) with science-quality data only
  const by = new Map(state.data.months.map((r) => [r.month, r]));
  const out = [];
  for (let s = 2001; s <= 2025; s++) {
    let h = 0, raw = 0, ok = true;
    for (let i = 0; i < 12; i++) {
      const mm = ((6 + i) % 12) + 1, yy = i < 6 ? s : s + 1;
      const r = by.get(`${yy}-${String(mm).padStart(2, "0")}`);
      if (!r || r.value == null || !["observed", "estimated"].includes(r.status)) { ok = false; break; }
      h += r.value; raw += rawValue(r) ?? NaN;
    }
    if (ok && !isNaN(raw)) out.push({ s, h, raw });
  }
  return out;
}

function renderStatus() {
  const d = state.data, L = d.latest, [y, m] = L.month.split("-");
  const same = d.months.filter((r) => r.month.endsWith(`-${m}`) && r.month !== L.month && r.value != null && (r.status === "observed" || r.status === "estimated")).map((r) => r.value);
  const below = same.filter((v) => v < L.value).length;
  const lvl = LEVEL[L.anomaly] || LEVEL["within normal"];
  const prov = L.status === "provisional";
  $("status-kicker").textContent = `Latest complete month${prov ? " · provisional, near real-time data" : ""}`;
  $("headline").innerHTML = `${MONTHS_LONG[+m - 1]} ${y} in ${shortName()}: <span class="lvl" style="color:${lvl[1]}">${lvl[0]}</span> burning activity`;
  $("status-sub").textContent = (prov ? "It may change slightly when science-quality data arrives; November 2026 is still in progress. " : "")
    + `Unusual = more than 2 robust deviations from the ${MONTHS_LONG[+m - 1]} median on a log scale.`;
  const top = seasonTotals().sort((a, b) => b.h - a.h)[0];
  const pos = Math.max(0, Math.min(100, 50 + (L.z / 4) * 50));
  $("status").innerHTML = `
    <div class="kpi"><small>This month</small><b>${fmt(L.value)}</b><small>hotspots, Suomi NPP-equivalent</small></div>
    <div class="kpi"><small>Normal for ${MONTHS_LONG[+m - 1]}</small><b>${fmt(L.median)}</b><small>median, seasons 2000–01 to 2025–26</small></div>
    <div class="kpi"><small>Against ${same.length} previous ${MONTHS_LONG[+m - 1]}s</small><div class="gauge" title="robust z = ${L.z}"><i style="left:${pos}%"></i></div><small>higher than ${below} of ${same.length} · robust z = ${L.z}</small></div>
    ${top ? `<div class="kpi"><small>Most active season</small><b>${top.s}–${String(top.s + 1).slice(2)}</b><small>${fmt(top.h)} hotspots (Jul–Jun)</small></div>` : ""}`;
}

function renderJump() {
  const T = seasonTotals();
  const figs = $("jump-figs");
  const ok = state.data.trust.filter((t) => t.validated);
  if (ok.length === 1) {
    const t = ok[0];
    figs.innerHTML = `<div>False jump at 2012, ${t.region}, vs CONAF fire records<b>×${t.jump_unharmonized}</b>raw, joined as they are</div>`
      + `<div class="good">After harmonization<b>×${t.jump_harmonized[0]}</b>95% CI ${t.jump_harmonized[1]}–${t.jump_harmonized[2]} (1 = no jump)</div>`;
  } else if (ok.length > 1) {
    figs.innerHTML = `<div>False jump at 2012, Maule to La Araucanía, vs CONAF<b>×${CONAF_ALL.unh}</b>raw, joined as they are</div>`
      + `<div class="good">After harmonization<b>×${CONAF_ALL.h}</b>95% CI ${CONAF_ALL.lo}–${CONAF_ALL.hi} (1 = no jump)</div>`;
  } else {
    figs.innerHTML = `<div>This area has not been checked against CONAF fire records yet; the curves below show the same correction with a simple ratio (indicative).</div>`;
  }
  if (T.length < 4) { $("jump").innerHTML = ""; $("jump-legend").innerHTML = ""; return; }
  const W = Math.max(340, Math.min(1100, $("jump").clientWidth || 900)), H = W < 600 ? 230 : 290, l = W < 600 ? 46 : 58, r = 30, t = 18, b = 34;
  const ymax = Math.max(...T.map((d) => Math.max(d.h, d.raw))) * 1.08;
  const x = (s) => l + ((s - T[0].s) / (T.at(-1).s - T[0].s)) * (W - l - r);
  const y = (v) => t + (1 - v / ymax) * (H - t - b);
  const path = (k) => T.map((d, i) => `${i ? "L" : "M"}${x(d.s).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const nice = Math.pow(10, Math.floor(Math.log10(ymax / 4))), step = [1, 2, 2.5, 5, 10].map((k) => k * nice).find((k) => ymax / k <= 5);
  let grid = "";
  for (let v = 0; v <= ymax; v += step) grid += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(140,180,255,.12)"/><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8fa6cc">${fmt(v)}</text>`;
  const every = W < 600 ? 8 : 4;
  const ticks = T.filter((d) => d.s % every === 1).map((d) => `<text x="${x(d.s)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#8fa6cc">${d.s}–${String(d.s + 1).slice(2)}</text>`).join("");
  const x12 = x(2011.6);
  const rawOn = state.mode === "raw";
  $("jump").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Season totals, raw versus harmonized">
    <defs><filter id="lglow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="ov" x1="0" x2="1"><stop offset="0" stop-color="#0197f8" stop-opacity=".18"/><stop offset="1" stop-color="#0197f8" stop-opacity=".04"/></linearGradient></defs>
    <rect x="${x12}" y="${t}" width="${W - r - x12}" height="${H - t - b}" fill="url(#ov)"/>
    ${grid}${ticks}
    <line x1="${x12}" x2="${x12}" y1="${t}" y2="${H - b}" stroke="#eaff28" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="${x12 + 6}" y="${t + 12}" font-size="11.5" fill="#eaff28" font-weight="600">${W < 600 ? "VIIRS starts" : "VIIRS starts · overlap 2012–2026"}</text>
    <path d="${path("h")}" fill="none" stroke="#eaff28" stroke-width="${rawOn ? 2.2 : 3}" opacity="${rawOn ? .55 : 1}" filter="url(#lglow)"/>
    <path d="${path("raw")}" fill="none" stroke="${rawOn ? "#c9d6ea" : "#7d93b8"}" stroke-width="${rawOn ? 3 : 2.2}" stroke-dasharray="6 4"/>
    ${T.map((d) => `<circle cx="${x(d.s)}" cy="${y(d.h)}" r="3.2" fill="#eaff28"><title>${d.s}–${String(d.s + 1).slice(2)}: harmonized ${fmt(d.h)}, raw ${fmt(d.raw)}</title></circle>`).join("")}
  </svg>`;
  $("jump-legend").innerHTML = `<span><i class="sw" style="background:#eaff28;border:0"></i>harmonized (one unit for all years)</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(90deg,#7d93b8 0 6px,transparent 6px 9px);border:0"></i>raw: MODIS before 2012, VIIRS after</span>`
    + `<span>Hotspots per fire season (Jul–Jun), complete seasons only.</span>`;
}

function renderMethod() {
  const M = state.data.method;
  let txt = "All values are expressed as hotspots that VIIRS Suomi NPP would record (one satellite, never a sum of satellites). Before Suomi NPP (2012), MODIS counts are mapped to that unit. ";
  if (M.qmap_regions.length) txt += `<b>${M.qmap_regions.join(", ")}:</b> quantile mapping fitted where both sensors observed (2012–2026), tested on hidden years 2020–2026 and checked against CONAF fire records 2002–2020 (per-region results in the trust table). Maule, Ñuble, Biobío and La Araucanía together: unharmonized, the series jumps ×4.7 at 2012 relative to real fire activity; harmonized, ×0.89 (95% interval includes 1, no jump). `;
  if (M.ratio_regions.length) txt += `<b>${M.ratio_regions.length > 3 ? "Other regions" : M.ratio_regions.join(", ")}:</b> simple ratio (` + Object.entries(M.factors).slice(0, 3).map(([n, f]) => `${n}: Aqua × ${f.Aqua.k}`).join("; ") + `${Object.keys(M.factors).length > 3 ? "; …" : ""}), not yet validated. `;
  txt += "Only science-quality FIRMS data, presumed vegetation fires (volcanoes, mining and industry removed), low-confidence detections removed. Regions use the BCN commune boundaries (referential, not official limits).";
  $("method").innerHTML = txt;
}

function downloadCSV() {
  const head = "month,value_snpp_equivalent,low_80,high_80,status,source,anomaly,robust_z,terra_raw,aqua_raw,snpp_raw,noaa20_raw,noaa21_raw";
  const lines = state.data.months.map((r) => [r.month, r.value ?? "", r.low ?? "", r.high ?? "", r.status, r.source ?? "", r.anomaly ?? "", r.z ?? "",
    r.raw.Terra ?? "", r.raw.Aqua ?? "", r.raw.SNPP ?? "", r.raw.NOAA20 ?? "", r.raw.NOAA21 ?? ""].join(","));
  const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `overlap_${state.aoi}_monthly.csv`; a.click();
  URL.revokeObjectURL(a.href);
}

async function showMonth(key) {
  const r = state.data.months.find((m) => m.month === key);
  if (!r) return;
  if (!state.daily[state.aoi]) state.daily[state.aoi] = await (await fetch(`data/${state.aoi}_daily.json`)).json();
  const daily = state.daily[state.aoi];
  const [y, m] = key.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const max = Math.max(...Object.values(daily));
  let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dow">${d}</div>`).join("");
  html += "<div></div>".repeat(offset);
  let fireDays = 0, top = [0, null];
  for (let d = 1; d <= n; d++) {
    const k = `${key}-${String(d).padStart(2, "0")}`;
    const v = daily[k];
    let bg, label, dark = false;
    if (v === undefined) { bg = `repeating-linear-gradient(45deg,${NO_DATA} 0 4px,#2a3d63 4px 6px)`; label = "no data"; }
    else if (v === 0) { bg = "#0c1a35"; label = "0"; }
    else { bg = colour(v, max); label = fmt(v); fireDays++; if (v > top[0]) top = [v, d]; dark = lev(v, max) > 0.62; }
    html += `<div class="day" style="background:${bg};${dark ? "color:#0a1430" : ""}" title="${k}: ${v === undefined ? "no satellite record" : label + " hotspots"}"><b>${d}</b>${v === undefined ? "" : label}</div>`;
  }
  $("day-grid").innerHTML = html;
  $("day-title").textContent = `${MONTHS_LONG[m - 1]} ${y}, day by day`;
  const status = r.status === "estimated" ? `estimated from ${SOURCE_NAME[r.source]}` : r.status === "provisional" ? "provisional, near real-time data" : r.status === "partial" ? "partial month" : r.status === "no_data" ? "no record" : "observed by VIIRS Suomi NPP";
  $("day-sub").textContent = r.value == null ? "No satellite record for this month." :
    `${fmt(r.value)} hotspots this month (${status}). Hotspots on ${fireDays} of ${n} days${top[1] ? `; busiest day: ${MONTHS[m - 1]} ${top[1]} with ${fmt(top[0])}` : ""}.`
    + (r.status === "estimated" ? ` Daily values are raw ${r.source === "Terra" ? "MODIS Terra" : "MODIS Aqua"} detections; only the monthly total is harmonized.` : "");
  $("day-legend").innerHTML = `<span><i class="sw" style="background:${colour(10, max)}"></i>hotspots detected (brighter = more)</span>`
    + `<span><i class="sw" style="background:#0c1a35"></i>observed, no hotspots</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>no satellite record</span>`
    + `<span>A day without hotspots can still hide fire under clouds or smoke.</span>`;
  $("day-panel").hidden = false;
  $("day-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderTrust() {
  const T = state.data.trust, ok = T.filter((t) => t.validated), no = T.filter((t) => !t.validated);
  const era = (e) => `typical monthly error ×${e.typical_factor}<br><small style="color:var(--quiet)">total bias ${e.bias_pct > 0 ? "+" : ""}${e.bias_pct}% · 80% band held ${Math.round(e.coverage80_pct)}% of months</small>`;
  let html = "";
  if (ok.length) {
    html += `<div class="tablewrap"><table class="trust"><thead><tr><th>Region</th><th>False jump at 2012 vs CONAF<br>(1 = no jump)</th><th>MODIS Aqua years<br>2002–2012</th><th>MODIS Terra years<br>2000–2002</th></tr></thead><tbody>`
      + ok.map((t) => `<tr><td><b>${t.region}</b></td><td>raw ×${t.jump_unharmonized} → <span class="ok">×${t.jump_harmonized[0]}</span><br><small style="color:var(--quiet)">95% CI ${t.jump_harmonized[1]}–${t.jump_harmonized[2]}</small></td><td>${era(t.Aqua)}</td><td>${era(t.Terra)}</td></tr>`).join("")
      + `</tbody></table></div>`;
  }
  if (no.length) html += `<p class="sub" style="margin-top:10px">${no.length === T.length ? "This region uses" : `${no.map((t) => t.region).join(", ")} use`} a simple ratio between sensors that has not been validated yet. Treat the years before 2012 as indicative.</p>`;
  if (ok.length) {
    const cov = ok.map((t) => Math.round(t.Aqua.coverage80_pct)), f = ok[0].Aqua.typical_factor;
    html += `<p class="sub">A typical error of ×${f} means the harmonized value is usually within a factor of ${f} of what Suomi NPP would have recorded. The 80% band on estimated months should contain 8 of 10 months; for MODIS Aqua on the hidden years it held ${Math.min(...cov)}${cov.length > 1 ? `–${Math.max(...cov)}` : ""}%, slightly fewer than promised.</p>`;
  }
  $("trust").innerHTML = html;
}

function render(animate) { renderStatus(); renderCalendar(animate); renderJump(); renderMethod(); renderTrust(); }

async function init() {
  const aois = await (await fetch("data/aois.json")).json();
  $("aoi").innerHTML = aois.map((a) => `<option value="${a.key}"${a.key === state.aoi ? " selected" : ""}>${a.name.replace(" region, Chile", "")}</option>`).join("");
  load();
}

$("aoi").addEventListener("change", (e) => { state.aoi = e.target.value; $("day-panel").hidden = true; load(); });
$("rows").addEventListener("change", (e) => { state.rows = e.target.value; renderCalendar(true); });
$("mode-h").addEventListener("click", () => setMode("harmonized"));
$("mode-r").addEventListener("click", () => setMode("raw"));
$("csv").addEventListener("click", downloadCSV);
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (state.data && Math.abs($("calendar").clientWidth - state.lastWidth) > 30) { renderCalendar(false); renderJump(); } }, 150); });
init();
