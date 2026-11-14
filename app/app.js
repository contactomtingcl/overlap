// Written with AI assistance (Claude, Anthropic); reviewed by the Overlap team. See docs/AI_USE.md.
// Overlap web app: month x year burning activity calendar from pre-computed JSON (no server).
"use strict";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SOURCE_NAME = { SNPP: "VIIRS Suomi NPP (observed)", NOAA20: "VIIRS NOAA-20 (scaled)",
  Aqua: "MODIS Aqua (scaled)", Terra: "MODIS Terra, morning orbit (scaled)" };
// Sequential ramp, light to dark, readable for common colour-vision deficiencies.
const RAMP = ["#fdf3dc", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#b30000", "#7f0000"];
const NO_DATA = "#e9ecef";

const state = { aoi: "biobio", rows: "season", data: null, daily: {}, month: null };
const $ = (id) => document.getElementById(id);
const fmt = (v) => v == null ? "—" : Math.round(v).toLocaleString("en-US");

function colour(v, max) {
  if (v == null) return NO_DATA;
  const t = Math.log10(v + 1) / Math.log10(max + 1);
  return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
}

async function load() {
  const res = await fetch(`data/${state.aoi}.json`);
  state.data = await res.json();
  render();
}

function grid() {
  // rows: fire season (Jul-Jun) or calendar year; each row has 12 cells
  const byMonth = new Map(state.data.months.map((r) => [r.month, r]));
  const first = 2000, last = 2026;
  const rows = [];
  if (state.rows === "season") {
    for (let y = first; y <= last - 1 + (state.data.months.at(-1).month >= `${last}-07` ? 1 : 0); y++) {
      const cells = [];
      for (let i = 0; i < 12; i++) {
        const mm = ((6 + i) % 12) + 1, yy = i < 6 ? y : y + 1;
        cells.push({ key: `${yy}-${String(mm).padStart(2, "0")}`, mm });
      }
      rows.push({ label: `${y}–${String(y + 1).slice(2)}`, cells });
    }
  } else {
    for (let y = first; y <= last; y++) {
      rows.push({ label: String(y), cells: MONTHS.map((_, i) => ({ key: `${y}-${String(i + 1).padStart(2, "0")}`, mm: i + 1 })) });
    }
  }
  rows.forEach((r) => r.cells.forEach((c) => { c.rec = byMonth.get(c.key) || null; }));
  return rows;
}

function renderCalendar() {
  const rows = grid();
  const vals = state.data.months.map((r) => r.value).filter((v) => v != null);
  const max = Math.max(...vals);
  const cw = 54, ch = 22, left = 70, top = 26, right = 150;
  const W = left + 12 * cw + right, H = top + rows.length * ch + 8;
  const head = (state.rows === "season" ? [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5] : [...Array(12).keys()])
    .map((m, i) => `<text x="${left + i * cw + cw / 2}" y="16" text-anchor="middle" font-size="12" fill="#5c6670">${MONTHS[m]}</text>`).join("");
  let body = "";
  rows.forEach((row, ri) => {
    const y = top + ri * ch;
    body += `<text x="${left - 8}" y="${y + 15}" text-anchor="end" font-size="12" fill="#1d2329">${row.label}</text>`;
    const sources = new Set();
    row.cells.forEach((c, ci) => {
      const x = left + ci * cw, r = c.rec;
      const v = r ? r.value : null;
      const fill = colour(v, max);
      const hatch = v == null ? ` fill="url(#hatch)"` : ` fill="${fill}"`;
      body += `<rect class="cell" data-key="${c.key}" x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="3"${hatch} stroke="#fff"/>`;
      if (r && (r.status === "provisional" || r.status === "partial")) {
        sources.add("SNPP");
        body += `<rect x="${x + 2.5}" y="${y + 2.5}" width="${cw - 5}" height="${ch - 5}" rx="2" fill="none" stroke="#1d2329" stroke-width="1.2" stroke-dasharray="3 2" pointer-events="none"/>`;
      }
      if (r && r.status === "estimated") {
        sources.add(r.source);
        body += `<circle cx="${x + cw - 7}" cy="${y + 7}" r="2.4" fill="#1d2329" pointer-events="none"/>`;
      } else if (r && r.status === "observed") sources.add("SNPP");
    });
    const note = [...sources].map((s) => s === "SNPP" ? "VIIRS" : s === "NOAA20" ? "NOAA-20" : `MODIS ${s}`).join(" + ");
    body += `<text x="${left + 12 * cw + 10}" y="${y + 15}" font-size="11.5" fill="#5c6670">${note}</text>`;
  });
  $("calendar").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Burning activity calendar, ${state.data.name}">
    <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="${NO_DATA}"/><line x1="0" y1="0" x2="0" y2="6" stroke="#adb5bd" stroke-width="2"/></pattern></defs>
    ${head}${body}</svg>`;
  $("calendar").querySelectorAll(".cell").forEach((el) => {
    el.addEventListener("mousemove", (e) => tip(e, el.dataset.key));
    el.addEventListener("mouseleave", () => { $("tip").style.display = "none"; });
    el.addEventListener("click", () => showMonth(el.dataset.key));
  });
  const steps = [0, 10, 100, 1000, max].filter((v, i, a) => v <= max && a.indexOf(v) === i);
  $("legend").innerHTML = steps.map((v) => `<span><i class="sw" style="background:${colour(v, max)}"></i>${fmt(v)}</span>`).join("")
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#adb5bd 3px 5px)"></i>no data (not zero)</span>`
    + `<span>● estimated from MODIS or NOAA-20 (hover for range)</span>`
    + `<span><i class="sw" style="border:1.5px dashed #1d2329;background:#fff"></i>provisional (near real-time data, last months)</span>`;
  $("cal-sub").textContent = `${state.data.name}. Colour = hotspots per month in Suomi NPP-equivalent units, log scale. Right column: which sensor each row comes from. Click a month to see its days.`;
}

function tip(e, key) {
  const r = state.data.months.find((m) => m.month === key);
  const [y, m] = key.split("-");
  let html = `<b>${MONTHS[+m - 1]} ${y}</b><br>`;
  if (!r || r.value == null) html += "No satellite record for this month (not zero fire).";
  else {
    html += `${fmt(r.value)} hotspots (Suomi NPP-equivalent)<br>`;
    if (r.status === "estimated") html += `80% range: ${fmt(r.low)}–${fmt(r.high)}<br>Source: ${SOURCE_NAME[r.source]}<br>`;
    else if (r.status === "provisional") html += "Provisional: near real-time Suomi NPP data, final values arrive about 5 months later<br>";
    else if (r.status === "partial") html += `Partial month: data through ${r.through}, from NOAA-20 (Suomi NPP stopped on Nov 2, 2026)<br>`;
    else html += "Observed by VIIRS Suomi NPP<br>";
    const med = state.data.climatology_median[+m];
    html += `Median for ${MONTHS[+m - 1]}: ${fmt(med)}`;
  }
  const t = $("tip");
  t.innerHTML = html; t.style.display = "block";
  t.style.left = Math.min(e.clientX + 14, innerWidth - 290) + "px"; t.style.top = (e.clientY + 14) + "px";
}

function renderStatus() {
  const d = state.data, L = d.latest, [y, m] = L.month.split("-");
  const same = d.months.filter((r) => r.month.endsWith(`-${m}`) && r.month !== L.month && r.value != null && (r.status === "observed" || r.status === "estimated")).map((r) => r.value);
  const below = same.filter((v) => v < L.value).length;
  const pct = Math.round(100 * below / same.length);
  const level = pct >= 90 ? ["Critical", "#b30000"] : pct >= 75 ? ["Elevated", "#ef6548"] : ["Normal or below", "#2b8a3e"];
  const prov = L.status === "provisional";
  $("status-title").textContent = `${MONTHS[+m - 1]} ${y}${prov ? " (provisional)" : ""} vs every previous ${MONTHS[+m - 1]}`;
  $("status-sub").textContent = prov ? "Latest complete month, from near real-time data: it may change slightly when science-quality data arrives. November 2026 is still in progress." : "Latest month with science-quality data.";
  const seasons = {};
  d.months.forEach((r) => { if (r.value == null) return; const [yy, mm] = r.month.split("-").map(Number); const s = mm >= 7 ? yy : yy - 1; seasons[s] = (seasons[s] || 0) + r.value; });
  const full = Object.entries(seasons).filter(([s]) => +s >= 2001 && +s <= 2024);
  const top = full.sort((a, b) => b[1] - a[1])[0];
  $("status").innerHTML = `
    <div class="kpi" style="border-color:${level[1]}"><small>Status</small><b style="color:${level[1]}">${level[0]}</b><small>Higher than ${below} of ${same.length} previous ${MONTHS[+m - 1]}s (${pct}%)</small></div>
    <div class="kpi"><small>This month</small><b>${fmt(L.value)}</b><small>hotspots, Suomi NPP-equivalent</small></div>
    <div class="kpi"><small>Historical median</small><b>${fmt(L.median)}</b><small>for ${MONTHS[+m - 1]}, 2000–2026</small></div>
    <div class="kpi"><small>Most active season</small><b>${top[0]}–${String(+top[0] + 1).slice(2)}</b><small>${fmt(top[1])} hotspots (Jul–Jun)</small></div>`;
}

function renderMethod() {
  const f = state.data.factors;
  $("method").innerHTML = `All values are expressed as hotspots that VIIRS Suomi NPP would record (one satellite, never a sum of satellites). Where Suomi NPP did not exist, other sensors are scaled by ratios learned where both observed: MODIS Aqua × ${f.Aqua.k} (80% range ${f.Aqua.low}–${f.Aqua.high}), MODIS Terra × ${f.Terra.k} (${f.Terra.low}–${f.Terra.high}; morning orbit, less comparable), NOAA-20 × ${f.NOAA20.k}. Only science-quality FIRMS data, presumed vegetation fires (volcanoes, mining and industry removed), low-confidence detections removed.`;
}

function downloadCSV() {
  const head = "month,value_snpp_equivalent,low_80,high_80,status,source,terra_raw,aqua_raw,snpp_raw,noaa20_raw,noaa21_raw";
  const lines = state.data.months.map((r) => [r.month, r.value ?? "", r.low ?? "", r.high ?? "", r.status, r.source ?? "",
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
  state.month = key;
  const [y, m] = key.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const vals = Object.values(daily);
  const max = Math.max(...vals);
  let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dow">${d}</div>`).join("");
  html += "<div></div>".repeat(offset);
  let fireDays = 0, top = [0, null];
  for (let d = 1; d <= n; d++) {
    const k = `${key}-${String(d).padStart(2, "0")}`;
    const v = daily[k];
    let bg, label;
    if (v === undefined) { bg = `repeating-linear-gradient(45deg,${NO_DATA} 0 4px,#adb5bd 4px 6px)`; label = "no data"; }
    else if (v === 0) { bg = "#f6f8f4"; label = "0"; }
    else { bg = colour(v, max); label = fmt(v); fireDays++; if (v > top[0]) top = [v, d]; }
    const dark = v !== undefined && v > 0 && RAMP.indexOf(bg) >= 5;
    html += `<div class="day" style="background:${bg};${dark ? "color:#fff" : ""}" title="${k}: ${v === undefined ? "no satellite record" : label + " hotspots"}"><b>${d}</b>${v === undefined ? "" : label}</div>`;
  }
  $("day-grid").innerHTML = html;
  $("day-title").textContent = `${MONTHS[m - 1]} ${y}, day by day`;
  const status = r.status === "estimated" ? `estimated from ${SOURCE_NAME[r.source]}` : r.status === "provisional" ? "provisional, near real-time data" : r.status === "partial" ? "partial month" : r.status === "no_data" ? "no record" : "observed by VIIRS Suomi NPP";
  $("day-sub").textContent = r.value == null ? "No satellite record for this month." :
    `${fmt(r.value)} hotspots this month (${status}). Hotspots on ${fireDays} of ${n} days${top[1] ? `; busiest day: ${MONTHS[m - 1]} ${top[1]} with ${fmt(top[0])}` : ""}.`;
  $("day-legend").innerHTML = `<span><i class="sw" style="background:${colour(10, max)}"></i>hotspots detected (darker = more)</span>`
    + `<span><i class="sw" style="background:#f6f8f4"></i>observed, no hotspots</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#adb5bd 3px 5px)"></i>no satellite record</span>`
    + `<span>A day without hotspots can still hide fire under clouds or smoke.</span>`;
  $("day-panel").hidden = false;
  $("day-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function render() { renderStatus(); renderCalendar(); renderMethod(); }

$("aoi").addEventListener("change", (e) => { state.aoi = e.target.value; $("day-panel").hidden = true; load(); });
$("rows").addEventListener("change", (e) => { state.rows = e.target.value; renderCalendar(); });
$("csv").addEventListener("click", downloadCSV);
load();
