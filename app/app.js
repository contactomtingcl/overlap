// Written with AI assistance (Claude, Anthropic); reviewed by the Overlap team. See docs/AI_USE.md.
// Overlap web app: month x year burning activity calendar from pre-computed JSON (no server). English / Spanish.
"use strict";
// Cache-busting: index.html loads app.js?v=<build>; data files are fetched with the same version.
const V = (() => { try { return new URL(document.currentScript.src).searchParams.get("v") || ""; } catch (e) { return ""; } })();
const DATA = (path) => `data/${path}${V ? `?v=${V}` : ""}`;

// ---------- language ----------
const I18N = {
  en: {
    locale: "en-US",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    monthsLong: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    dows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    logo_alt: "Overlap logo: a coarse-pixel band and a fine-dot band crossing in a glowing square",
    def_hotspot: "A <b>hotspot</b> is a spot on the ground, about 375 m to 1 km wide, where a satellite measured unusual heat as it passed over. It can be a forest fire, an agricultural burn or another fire; one large fire produces many hotspots.",
    info_anom: "<b>Anomaly</b> compares this month with the same month in the previous 25 seasons, in the same area. <b>Normal</b> is the middle value: half of those years had less, half had more. <b>Unusually high</b> or <b>low</b> means far from normal, something that almost never happens in 25 years.<br><small>Technically: robust z on a log scale beyond ±2.</small>",
    info_unit: "Every number is on the <b>VIIRS scale</b>: hotspots counted as if today's satellite (VIIRS Suomi NPP, 375 m pixels) had watched all 25 years. Before 2012 only MODIS existed, which sees fewer small fires, so those months are estimated and show their range. Hover a cell to see it.",
    info_lbl: "What does this mean?",
    read_climate: "<b>Weather and climate.</b> El Niño, droughts and heat waves change how much fire there really is: Overlap shows that a month or a season is unusual, not why. The conversion between sensors was learned over 14 seasons that include El Niño, La Niña and the 2017 and 2023 megafires, and tested on years it never saw. Not yet done: adjusting the season-clock trends for El Niño, and testing the drift of the MODIS orbits after 2021.",

    title: "Overlap · two satellites, <em>one honest</em> burning calendar",
    tag: "25 years of NASA FIRMS fire hotspots from MODIS (coarse pixels, since 2000) and VIIRS (fine pixels, since 2012), harmonized into one comparable series for Chile. Every estimate shows how much to trust it.",
    controls: "Controls", area: "Area", rows: "Rows", opt_season: "Fire season (Jul–Jun)", opt_year: "Calendar year (Jan–Dec)",
    mode_h: "Harmonized (comparable)", mode_r: "As each satellite saw it", csv: "Download CSV",
    cal_h: "Hotspot calendar, month by month",
    cvd: "Colour-blind palette", share: "Copy link", copied: "Link copied", play: "Play or pause the months",
    loadErr: "The data could not be loaded. Check your connection and reload the page.",
    likeNote: (l) => ` Compared like for like, without the Atacama desert regions (${l}), whose recent data are hidden.`,
    desertNote: " In this region the months after July 2026 are hidden: over the Atacama desert, provisional data hold many false daytime hotspots.",
    clockPlainShift: (a, d, dir) => `The busiest time of the fire season is still around <b>${a}</b>, but it is coming <b>${d} days ${dir < 0 ? "earlier" : "later"} per decade</b>, and the change holds in the VIIRS-only years.`, gis_lead: "Download for GIS (QGIS, ArcGIS):",
    gis_note: "Region polygons (WGS84, BCN boundaries, referential and simplified) with the latest month, plus a monthly table for every region since 2000. In QGIS, join regions_monthly to regions on codregion; month is a date, so the Temporal Controller can animate it.",
    back: "← Chile", whereH: (r) => `Where in ${r}`,
    whereNote: (sen) => `Hotspots ${sen} saw in each commune: they show where they fall, as the satellite saw them.`,
    whereNone: "No hotspots detected in any commune this month.", whereWithheld: "Hidden this month: over the Atacama desert, provisional data hold many false hotspots.",
    comConv: (sat, raw, v) => `<b>Whole region:</b> ${sat} saw <b>${raw}</b> hotspots <span class="arr">→</span> <b class="lime">≈ ${v}</b> on the VIIRS scale. Only the region total is converted; communes show what the satellite saw.`,
    comEra: (mo) => `The map is at ${mo}, in the MODIS era. This chart starts in 2012, with VIIRS, so it only compares numbers from the same satellite.`,
    gis_sum: "Download for GIS (QGIS, ArcGIS)",
    mlgNorth: "North hidden in recent months: over the Atacama desert, provisional data hold many false daytime hotspots. It will appear with the final data.",
    tipClick: "Click: see its days",
    cTip: (v, sh) => `${v} hotspots${sh == null ? "" : ` · ${sh} of the region`}`,
    map_hint: "Click a region to open it and zoom into its communes.",
    map_h: "Chile, region by region", mm_z: "Anomaly", mm_v: "Hotspots",
    map_sub: "Each region compared with normal for that same month over its 25 years. Press ▶ to watch 25 years, month by month.",
    north: "◂ North (Arica)", south: "South (Magallanes) ▸",
    mlgZ: ["much lower than normal", "normal", "much higher than normal"], mlgV: (m) => `0 – ${m} hotspots a month · multiplying scale (1, 10, 100…)`, mlgNo: "hatched: no data or month in progress", mlgC: (m) => `communes: 0 – ${m} hotspots a month, as the satellite saw them · multiplying scale`,
    mTip: (v, lvl) => `${v} hotspots (VIIRS scale)${lvl ? `<br>${lvl}` : ""}`,
    ch_where: "Where · pick a region", ch_now: "Now · this month and this season", ch_history: "Calendar · 25 years in one unit",
    nav: ["Where", "Now", "Calendar", "Trust"], cta: "See the 25-year calendar", share_s: "Link", cvd_s: "Colour-blind", csv_s: "CSV",
    comH: (c, r) => `${c} <span class="muted">· ${r}</span>`,
    comNow: (mo, v, sh) => `${mo}: <b>${v}</b> hotspots${sh == null ? "" : `, ${sh} of the region`}.`,
    comSeasons: "Hotspots per fire season (VIIRS Suomi NPP, 2012–13 to 2025–26)",
    comMonthly: "Month by month since 2012, with VIIRS · the yellow line marks the map's month",
    comMo: (mo, sat) => `hotspots ${sat} saw in ${mo}`, comShare: (p) => `${p} of the region's hotspots this month`,
    comBefore: "Before 2012 another sensor counted (MODIS): not shown here",
    comBest: (mo, v) => `Busiest month on record: ${mo} (${v}).`,
    comNote: "Hotspots as one satellite (VIIRS) saw them, comparable between these seasons. MODIS years are left out here because that satellite sees fewer small fires and the conversion is done per region, not per commune.",
    comNone: "No hotspots detected in this commune since 2012.",
    backTo: (r) => `← ${r}`, comHint: "Click a commune to zoom in and see its history.",
    kH: "How many more hotspots does VIIRS see than MODIS?",
    kSub: (a) => `For each hotspot MODIS Aqua sees, how many VIIRS sees in ${a}, season by season, when both watched together.`,
    kPlain: (lo, hi, n) => `VIIRS sees between <b>${lo}</b> and <b>${hi} times</b> more hotspots than MODIS, depending on the season. That is why one number is not enough: the conversion learns from the ${n} seasons when both satellites watched together and is tested on years it never saw.`,
    kLg: ["VIIRS hotspots per MODIS Aqua hotspot, per fire season", "all seasons pooled"],
    kNote: "It changes with fire sizes, clouds and weather. It is the same factor you see when you open the days of an old month. Next step: test it against El Niño indices (NOAA CPC) and the drift of the MODIS orbits after 2021.", ch_trust: "Trust · why these numbers hold",
    more_curve: "See the full curve, month by month",
    seasonIntro: "Fire season 2026–27 (July to June), in hotspots on the VIIRS scale.",
    clockPlainUnclear: (a, b) => `<b>No clear change in 25 seasons.</b> The busiest month was ${a} in the MODIS years (2001–2012) and is ${b} in the VIIRS years (2012–2026), but it varies so much from season to season that there is no firm evidence the season has moved.`, more_clock: "See every season and the trend tests",
    seasonPlain: (area, mo, cur, med, lo, hi, lvl) => `${area} has <b>${cur}</b> hotspots so far this season (to ${mo}). A normal season has about ${med} by now; 8 of every 10 seasons had between ${lo} and ${hi}. <span class="${lvl}">${lvl === "lo" ? "So far, a quiet season." : lvl === "hi" ? "So far, a busy season." : "So far, a normal season."}</span>`,
    meterLg: ["usual range: 8 of every 10 past seasons were here", "normal", "this season"],
    dialThen: "seasons 2001–02 to 2011–12", dialNow: "seasons 2012–13 to 2025–26",
    clockPlainMoved: (a, b) => `The busiest time of the fire season <b>moved from ${a} to ${b}</b>, and the change holds in the VIIRS-only years.`,
    clockPlainMaybe: (a, b) => `<b>Possible change, not confirmed.</b> The busiest time may have moved from ${a} to ${b}, but it is not confirmed in the VIIRS-only years.`,
    clockPlainSame: (a) => `<b>No clear change in 25 seasons.</b> The busiest time of the fire season is still around ${a}.`,
    dialLg: ["each wedge: share of the season's hotspots in that month", "now: seasons 2012–13 to 2025–26 (VIIRS)", "before: seasons 2001–02 to 2011–12 (estimated from MODIS)", "hand = busiest month"],
    clock_h: "Season clock: is the fire season shifting?",
    clockIntro: "When in the year do the hotspots happen, and has that changed? The dial is the year: January at 1 o'clock, December at 12. Climate cycles such as El Niño can create or hide an apparent shift over 25 seasons; trends are not adjusted for them yet.",
    clockSub: "Each bar is one fire season: it starts when 10% of its hotspots have occurred, ends at 90%, and the dot marks the busiest month. Trends use Theil-Sen slopes and the Mann-Kendall test over 25 seasons; a shift counts as confirmed only if it also appears in the VIIRS-only seasons (2012–13 to 2025–26). Hotspot seasons include agricultural burning.",
    clockDesert: "Not shown for the Atacama desert regions: their hotspots include persistent false detections, so the season shape is not meaningful.",
    clockMetric: { onset: "Start (10%)", peak: "Busiest month", end: "End (90%)", length: "Length" },
    clockVal: (k, v) => k === "length" ? `${Math.abs(v)} days ${v < 0 ? "shorter" : "longer"} per decade` : `${Math.abs(v)} days ${v < 0 ? "earlier" : "later"} per decade`,
    clockV: { robust: "confirmed in VIIRS-only years", possible: "possible, not confirmed in VIIRS-only years", none: "no clear change" },
    clockCI: (a, b, p) => `95% CI ${a} to ${b} · p = ${p}`,
    clockLg: ["season, start to end (colour = total hotspots)", "busiest month", "trend of the busiest month"],
    clockMulti: "With 16 regions and 4 measures, a few apparent trends are expected by chance; the VIIRS-only check filters most of them.",
    scen: (v, a, b) => `If the rest of the season is like past seasons: about ${v} hotspots by June (${a}–${b}). A scenario, not a forecast.`,
    scenLg: "scenarios: the rest of the season like past seasons (10–90%)",
    season_h: "This season so far vs every past season",
    seasonSub: (area) => `${area}, fire season 2026–27 (July to June): hotspots added up month by month, on the VIIRS scale, with a multiplying axis. The band holds 8 of every 10 past seasons (2001–02 to 2025–26).`,
    seasonWarn: " A quiet or busy start is not a forecast: from Valparaíso to La Araucanía, July–October activity did not anticipate November–June in the last 25 seasons.",
    seasonExcl: (l) => ` Atacama desert regions (${l}) are left out of both sides, because their recent data are hidden.`,
    sThrough: (mo) => `Through ${mo}`, sThroughSub: "hotspots so far this season",
    sVs: "Compared with the median past season", sVsSub: (b, n) => `higher than ${b} of ${n} past seasons at this point`,
    sCur: "Season 2026–27 (open dots: provisional; dashed: November in progress)", sMed: "median of past seasons", sBand: "10th–90th percentile of past seasons",
    sTop: (s) => `${s} (most active)`, sPt: (mo, v, st) => `${mo}: ${v} hotspots so far${st}`, sProv: " (provisional)", sPart: " (partial, through Nov 7)",
    jump_h: "The 2012 jump, before and after",
    jump_sub: "When VIIRS arrives in 2012 it sees many more small fires than MODIS: joined as they are, the numbers seem to explode from one year to the next. The test: for each fire in CONAF's records, how many hotspots appear after 2012 compared with before? If the numbers are comparable, the answer is ×1.",
    trust_h: "How much to trust these numbers",
    trust_sub: "Joining two sensors is never exact. We measured the error on years the model never saw (2020–2026) and against CONAF fire records of 2002–2020 (76,002 fires in the four calibrated regions; 109,947 in all of Chile).",
    read_h: "How to read this",
    read_nodetect: "<b>No detection is not the same as no fire.</b> Each polar satellite sees a place only about twice a day, and clouds, smoke and satellite gaps hide fires. Hatched cells mean the record could not be built for that month, not zero fire.",
    read_notfire: "<b>Hotspots are not fires.</b> One large fire produces many hotspots; small agricultural or short-lived burns may produce none.",
    read_wip: "Work in progress (NASA Space Apps Challenge 2026). Harmonization v1: own quantile maps in Maule, Ñuble, Biobío and La Araucanía; a pooled quantile map in nine other regions; a simple ratio in Los Ríos, Los Lagos and Aysén. All tested on hidden years and against CONAF fire records.",
    footer: "Data: NASA FIRMS (MODIS Collection 6.1, VIIRS Collection 2); CONAF fire records (CC BY 4.0); BCN commune boundaries. We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (<a href=\"https://earthdata.nasa.gov/firms\">earthdata.nasa.gov/firms</a>), part of NASA's Earth Science Data and Information System (ESDIS). Code: <a href=\"https://github.com/contactomtingcl/overlap\">github.com/contactomtingcl/overlap</a>.",
    aoi: { chile: "Chile (whole country)", biobio_hist: "Biobío + Ñuble (historical Biobío region, CONAF validation area)" },
    aoiShort: { chile: "Chile", biobio_hist: "Biobío + Ñuble" },
    level: { "unusually high": "unusually high", "unusually low": "unusually low", "within normal": "within normal" },
    headline: (mo, y, area, lvl) => `${mo} ${y} in ${area}: ${lvl}`,
    levelHead: { "unusually high": "far more hotspots than normal", "unusually low": "far fewer hotspots than normal", "within normal": "hotspots within normal" },
    kicker: (prov) => `Latest complete month${prov ? " · provisional, near real-time data" : ""}`,
    statusSub: (prov, mo) => (prov ? "Provisional, near real-time data: it may change slightly. November 2026 is still in progress. " : "") + `"Far more" or "far fewer" means something that almost never happens in 25 years of ${mo}.`,
    kThis: "This month", kThisSub: (est) => est ? "hotspots, estimated on the VIIRS scale" : "hotspots, measured by VIIRS",
    kNormal: (mo) => `Normal for ${mo}`, kNormalSub: "the middle value over seasons 2000–01 to 2025–26",
    kAgainst: (n, mo) => `Against ${n} previous ${mo}s`, kAgainstSub: (b, n, mo) => b === 0 ? `no previous ${mo} had fewer hotspots` : b === n ? `no previous ${mo} had more hotspots` : `${b} of ${n} had fewer hotspots`,
    kTop: "Most active season", kTopSub: (v) => `${v} hotspots (Jul–Jun)`,
    calSub: (area) => `${area}. Colour = hotspots in the month on the VIIRS scale (brighter, more yellow = more). Hover a month to see what the satellite saw and its range; click it to see its days.`,
    calSubRaw: "<b>As each satellite saw it:</b> each one's own count, joined as they are. Notice how hotspots seem to jump when VIIRS starts in 2012: that jump is the satellite, not the fire.",
    lgRamp: (max) => `${max} hotspots a month · multiplying scale (1, 10, 100…)`, lgNoData: "no data (not zero)", lgProv: "provisional (near real-time)",
    lgModis: "estimated from MODIS (1 km pixels)", lgViirs: "measured by VIIRS (375 m pixels)", lgEra: "VIIRS era begins (2012)",
    srcModis: (s) => `estimated · MODIS ${s}`, srcViirs: "measured · VIIRS", srcNoaa: "measured · NOAA-20",
    tipWithheld: "Hidden: over the Atacama desert, provisional data hold many false daytime hotspots. Shown with the final data.",
    tipNoData: "No satellite record for this month (not zero fire).",
    tipValue: (v, est) => `<b class="tv">${est ? "≈ " : ""}${v}</b> hotspots on the VIIRS scale`,
    tipRaw: (sen, v) => `What ${sen} saw: ${v}`, tipRange: (a, b) => `Probably between ${a} and ${b}`,
    tipMethod: "Method", methodName: { qmap: "own quantile map", qmap_pooled: "pooled quantile map", ratio: "simple ratio", mixed: "mixed (summed regions)" },
    tipProv: "Provisional: near real-time data, may change slightly",
    tipPartial: (d) => `Partial month: data through ${d}, from NOAA-20 (Suomi NPP stopped on Nov 2, 2026)`,
    tipObs: "Measured directly by VIIRS Suomi NPP", tipMedian: (mo, v) => `Normal for ${mo}: ${v}`,
    tipAnom: { "unusually high": "Unusually high", "unusually low": "Unusually low", "within normal": "Within normal" },
    robustZ: "robust z",
    noteDesert: "Without the Atacama desert regions, hidden this month",
    figRaw: (area) => `Not harmonized · ${area}`, figRawSub: "hotspots per CONAF fire after 2012 vs before: a false jump, caused by the change of satellite",
    figH: "Harmonized", figHSub: (lo, hi) => `≈ 1: no jump (95% confidence: between ${lo} and ${hi})`,
    figAll: "Maule to La Araucanía", figNone: "This area has not been checked against CONAF fire records; the harmonization here was tested on hidden years 2020–2026 (see the trust table).",
    chVIIRS: "VIIRS starts · overlap 2012–2026", chVIIRSshort: "VIIRS starts",
    chTitle: (s, h, r) => `${s}: harmonized ${h}, raw ${r}`,
    chLgH: "harmonized (one unit for all years)", chLgR: "as each satellite saw it: MODIS before 2012, VIIRS after", chLgNote: "Hotspots per fire season (Jul–Jun), complete seasons only.",
    thRegion: "Region", thJump: "2012 jump vs CONAF<br>(×1 = no jump)", thAqua: "Years estimated from MODIS Aqua<br>2002–2012", thTerra: "Years with only MODIS Terra<br>2000–2002", thMethod: "Method",
    raw: "not harmonized", ci: "95% confidence:",
    errLine: (f, lo, hi, b, c) => `if we show 100, the real value is usually between <b>${lo} and ${hi}</b><br><small>mean error ×${f} · ${b}${c == null ? "" : ` · the range was right in ${c} of 100 months`}</small>`,
    biasTxt: (v) => Math.abs(v) < 0.5 ? "no overall bias" : `overall ${dec(Math.abs(v), 1)}% ${v < 0 ? "too low" : "too high"}`,
    testedH: "Other regions: tested on hidden years 2020–2026 and against CONAF fire records",
    testedNote: "The pooled map was fitted on Maule, Ñuble, Biobío and La Araucanía together and tested in regions it never saw; where it lost to the region's own simple ratio, the ratio is used. Against CONAF (109,947 fires in all regions), the false 2012 jump disappears in 9 of the 11 regions with enough fires. Valparaíso is overcorrected and Metropolitana keeps part of the jump; the north and Magallanes have too few CONAF fires to judge. Errors are larger than in the calibrated regions, so treat the years before 2012 there as indicative.",
    thConaf: "2012 jump vs CONAF<br>(×1 = no jump)",
    verdict: { removed: "jump removed", over: (p) => `overcorrected: the years before 2012 come out about ${p}% too high`, under: (p) => `undercorrected: the years before 2012 come out about ${p}% too low`, few_fires: (n) => `only ${n} CONAF fires: cannot judge` },
    figConaf: (v) => `In this region: ${v}.`,
    trustNote: (f, cov) => `How to read it: with a mean error of ×${f}, if an old month shows 100 hotspots, what VIIRS would have seen is usually between 100 ÷ ${f} and 100 × ${f}. Each month's range should be right 8 times out of 10; for MODIS Aqua, on years the model never saw, it was right ${cov} times out of 100, slightly fewer than promised.`,
    method: {
      unit: "All values are expressed as hotspots that VIIRS Suomi NPP would record (one satellite, never a sum of satellites). Before Suomi NPP (2012), MODIS counts are mapped to that unit. ",
      qmap: (r) => `<b>${r}:</b> quantile mapping fitted where both sensors observed (2012–2026), tested on hidden years 2020–2026 and checked against CONAF fire records 2002–2020. Maule, Ñuble, Biobío and La Araucanía together: unharmonized, the series jumps ×4.7 at 2012 relative to real fire activity; harmonized, ×0.89 (95% interval includes 1, no jump). `,
      pooled: (r) => `<b>${r}:</b> one quantile map fitted on Maule, Ñuble, Biobío and La Araucanía together, applied region by region (never to a national total), tested on hidden years in each region and checked against CONAF fire records where there are enough of them. `,
      ratio: (r, f) => `<b>${r}:</b> simple ratio between sensors (${f}), because the pooled map did worse there on hidden years. `,
      data: "Only science-quality FIRMS data, presumed vegetation fires (volcanoes, mining and industry removed), low-confidence detections removed. Regions use the BCN commune boundaries (referential, not official limits).",
    },
    dayTitle: (mo, y) => `${mo} ${y}, day by day`,
    dayNone: "No satellite record for this month.",
    dayStatus: { estimated: (s) => `estimated from ${s}`, provisional: "provisional, near real-time data", partial: "partial month", no_data: "no record", observed: "observed by VIIRS Suomi NPP" },
    daySub: (v, st, fd, n, top) => `${v} hotspots this month (${st}). Hotspots on ${fd} of ${n} days${top ? `; busiest day: ${top}` : ""}.`,
    dayTop: (mo, d, v) => `${mo} ${d} with ${v}`,
    dayRaw: (s) => ` Daily values are raw ${s} detections; only the monthly total is harmonized.`,
    sat: { Terra: "MODIS Terra", Aqua: "MODIS Aqua", SNPP: "VIIRS Suomi NPP", NOAA20: "VIIRS NOAA-20" },
    dx: {
      estimated: (sat, raw, v, lo, hi) => `There was no VIIRS data yet that month. ${sat} has 1 km pixels and misses small fires: it saw ${raw} hotspots. To compare with today, Overlap estimates how many VIIRS Suomi NPP (375 m pixels) would have seen: about ${v}, probably between ${lo} and ${hi}.`,
      partial: (raw, v, d) => `Month in progress, data through ${d}. Suomi NPP stopped sending data on Nov 2, so only its twin VIIRS NOAA-20 is available: it saw ${raw} hotspots, about ${v} on the Suomi NPP scale.`,
      observed: (v) => `VIIRS Suomi NPP saw ${v} hotspots this month. It is Overlap's reference satellite, so this number is not converted.`,
      prov: " Near real-time data: it may change slightly.",
      top: (mo, d, v) => ` The busiest day was ${mo} ${d}, with ${v}.`,
      none: " No day with hotspots.",
      thru: (d, mo) => `${mo[0].toUpperCase() + mo.slice(1)} ${d}`,
    },
    cv: { saw: (s) => `What ${s} saw`, days: (fd, n) => `hotspots, on ${fd} of ${n} days`, arrow: "converted to the VIIRS scale", factor: (f) => `≈ ×${f} this month`,
      out: "Number comparable across years", range: (lo, hi) => `probably between ${lo} and ${hi}`, direct: "measured directly, no conversion" },
    cap: { estimated: (sat, sum) => `Each day: hotspots ${sat} saw (they add up to ${sum}). Days show what the satellite saw; only the monthly total is converted.`,
      observed: (sum) => `Each day: hotspots VIIRS Suomi NPP saw (they add up to ${sum}).`, partial: "Each day: VIIRS NOAA-20 hotspots on the Suomi NPP scale (approximate)." },
    dlg: ["hotspots detected (brighter, more yellow = more)", "observed, no hotspots", "no satellite record", "A day without hotspots can still hide fire under clouds or smoke."],
    dayTipNone: "no satellite record", dayTipHot: (v) => `${v} hotspots`,
    sources: { SNPP: "VIIRS Suomi NPP (observed)", NOAA20: "VIIRS NOAA-20 (scaled)", Aqua: "MODIS Aqua (scaled)", Terra: "MODIS Terra, morning orbit (scaled)" },
  },
  es: {
    locale: "es-CL",
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    monthsLong: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    dows: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
    logo_alt: "Logo de Overlap: una franja de píxeles gruesos y otra de puntos finos que se cruzan en un cuadrado luminoso",
    def_hotspot: "Un <b>foco de calor</b> es un punto de la superficie, de unos 375 m a 1 km, donde un satélite midió un calor anormal al pasar. Puede ser un incendio forestal, una quema agrícola u otro fuego; un incendio grande produce muchos focos.",
    info_anom: "La <b>anomalía</b> compara este mes con el mismo mes de las 25 temporadas anteriores, en la misma área. <b>Lo normal</b> es el valor del medio: la mitad de esos años tuvo menos y la mitad tuvo más. <b>Inusualmente alta</b> o <b>baja</b> significa muy lejos de lo normal, algo que casi nunca pasa en 25 años.<br><small>Técnicamente: z robusto en escala logarítmica más allá de ±2.</small>",
    info_unit: "Todas las cifras están en <b>escala VIIRS</b>: cuentan los focos como si el satélite de hoy (VIIRS Suomi NPP, píxeles de 375 m) hubiera observado los 25 años. Antes de 2012 solo existía MODIS, que ve menos fuegos pequeños, así que esos meses se estiman y muestran su rango. Pasa el cursor sobre una celda para verlo.",
    info_lbl: "¿Qué significa esto?",
    read_climate: "<b>Tiempo y clima.</b> El Niño, las sequías y las olas de calor cambian cuánto fuego hay realmente: Overlap muestra que un mes o una temporada es inusual, no por qué. La conversión entre sensores se aprendió en 14 temporadas que incluyen El Niño, La Niña y los megaincendios de 2017 y 2023, y se probó en años que nunca vio. Pendiente: ajustar por El Niño las tendencias del reloj de la temporada y probar la deriva de las órbitas de MODIS después de 2021.",

    title: "Overlap · dos satélites, <em>un solo calendario</em> honesto de quemas",
    tag: "25 años de focos de calor de NASA FIRMS, de MODIS (píxeles gruesos, desde 2000) y VIIRS (píxeles finos, desde 2012), armonizados en una sola serie comparable para Chile. Cada estimación muestra cuánto confiar en ella.",
    controls: "Controles", area: "Área", rows: "Filas", opt_season: "Temporada de incendios (jul–jun)", opt_year: "Año calendario (ene–dic)",
    mode_h: "Armonizado (comparable)", mode_r: "Como lo vio cada satélite", csv: "Descargar CSV",
    cal_h: "Calendario de focos de calor, mes a mes",
    cvd: "Paleta para daltonismo", share: "Copiar link", copied: "Link copiado", play: "Reproducir o pausar los meses",
    loadErr: "No se pudieron cargar los datos. Revisa tu conexión y recarga la página.",
    likeNote: (l) => ` Comparación equivalente, sin las regiones del desierto de Atacama (${l}), cuyos datos recientes están ocultos.`,
    desertNote: " En esta región los meses posteriores a julio de 2026 están ocultos: sobre el desierto de Atacama los datos provisorios traen muchos focos falsos de día.",
    clockPlainShift: (a, d, dir) => `El momento de más focos de la temporada sigue siendo cerca de <b>${a}</b>, pero llega <b>${d} días ${dir < 0 ? "antes" : "después"} por década</b>, y el cambio se mantiene en los años solo VIIRS.`, gis_lead: "Descarga para SIG (QGIS, ArcGIS):",
    gis_note: "Polígonos de las regiones (WGS84, límites de la BCN, referenciales y simplificados) con el último mes, más una tabla mensual de cada región desde 2000. En QGIS, une regions_monthly con regions por codregion; month es una fecha, así que el Controlador temporal puede animarla.",
    back: "← Chile", whereH: (r) => `Dónde, en ${r}`,
    whereNote: (sen) => `Focos que vio ${sen} en cada comuna: muestran dónde caen, tal como los vio el satélite.`,
    whereNone: "No se detectaron focos en ninguna comuna este mes.", whereWithheld: "Oculto este mes: sobre el desierto de Atacama los datos provisorios traen muchos focos falsos.",
    comConv: (sat, raw, v) => `<b>Toda la región:</b> ${sat} vio <b>${raw}</b> focos <span class="arr">→</span> <b class="lime">≈ ${v}</b> en escala VIIRS. Solo el total de la región se convierte; las comunas muestran lo que vio el satélite.`,
    comEra: (mo) => `El mapa está en ${mo}, en la era MODIS. Este gráfico parte en 2012, con VIIRS, para comparar solo cifras del mismo satélite.`,
    gis_sum: "Descargar para SIG (QGIS, ArcGIS)",
    mlgNorth: "Norte oculto en los meses recientes: sobre el desierto de Atacama los datos provisorios traen muchos focos falsos de día. Aparecerá con los datos definitivos.",
    tipClick: "Clic: ver sus días",
    cTip: (v, sh) => `${v} focos de calor${sh == null ? "" : ` · ${sh} de la región`}`,
    map_hint: "Haz clic en una región para abrirla y acercarte a sus comunas.",
    map_h: "Chile, región por región", mm_z: "Anomalía", mm_v: "Focos de calor",
    map_sub: "Cada región comparada con lo normal en ese mismo mes de sus 25 años. Presiona ▶ para ver 25 años, mes a mes.",
    north: "◂ Norte (Arica)", south: "Sur (Magallanes) ▸",
    mlgZ: ["mucho menor que lo normal", "normal", "mucho mayor que lo normal"], mlgV: (m) => `0 – ${m} focos al mes · escala multiplicativa (1, 10, 100…)`, mlgNo: "achurado: sin datos o mes en curso", mlgC: (m) => `comunas: 0 – ${m} focos al mes, como los vio el satélite · escala multiplicativa`,
    mTip: (v, lvl) => `${v} focos (escala VIIRS)${lvl ? `<br>${lvl}` : ""}`,
    ch_where: "Dónde · elige una región", ch_now: "Ahora · este mes y esta temporada", ch_history: "Calendario · 25 años en una sola unidad",
    nav: ["Dónde", "Ahora", "Calendario", "Confianza"], cta: "Ver el calendario de 25 años", share_s: "Link", cvd_s: "Daltonismo", csv_s: "CSV",
    comH: (c, r) => `${c} <span class="muted">· ${r}</span>`,
    comNow: (mo, v, sh) => `${mo}: <b>${v}</b> focos${sh == null ? "" : `, ${sh} de la región`}.`,
    comSeasons: "Focos por temporada (VIIRS Suomi NPP, 2012–13 a 2025–26)",
    comMonthly: "Mes a mes desde 2012, con VIIRS · la línea amarilla marca el mes del mapa",
    comMo: (mo, sat) => `focos que vio ${sat} en ${mo}`, comShare: (p) => `${p} de los focos de la región este mes`,
    comBefore: "Antes de 2012 contaba otro sensor (MODIS): no se muestra aquí",
    comBest: (mo, v) => `Mes con más focos registrado: ${mo} (${v}).`,
    comNote: "Focos tal como los vio un solo satélite (VIIRS), comparables entre estas temporadas. Los años MODIS no se muestran aquí porque ese satélite ve menos fuegos pequeños y la conversión se hace por región, no por comuna.",
    comNone: "No se detectaron focos en esta comuna desde 2012.",
    backTo: (r) => `← ${r}`, comHint: "Haz clic en una comuna para acercarte y ver su historia.",
    kH: "¿Cuántos focos más ve VIIRS que MODIS?",
    kSub: (a) => `Por cada foco que ve MODIS Aqua, cuántos ve VIIRS en ${a}, temporada por temporada, cuando ambos observaron juntos.`,
    kPlain: (lo, hi, n) => `VIIRS ve entre <b>${lo}</b> y <b>${hi} veces</b> más focos que MODIS, según la temporada. Por eso no basta un solo número: la conversión aprende de las ${n} temporadas en que ambos satélites observaron juntos y se prueba en años que nunca vio.`,
    kLg: ["focos de VIIRS por cada foco de MODIS Aqua, por temporada", "todas las temporadas juntas"],
    kNote: "Cambia con el tamaño de los fuegos, las nubes y el clima. Es el mismo factor que ves al abrir los días de un mes antiguo. Siguiente paso: contrastarlo con los índices de El Niño (NOAA CPC) y con la deriva de las órbitas de MODIS después de 2021.", ch_trust: "Confianza · por qué estas cifras se sostienen",
    more_curve: "Ver la curva completa, mes a mes",
    seasonIntro: "Temporada de incendios 2026–27 (julio a junio), en focos de calor en escala VIIRS.",
    clockPlainUnclear: (a, b) => `<b>Sin un cambio claro en 25 temporadas.</b> El mes con más focos fue ${a} en los años MODIS (2001–2012) y es ${b} en los años VIIRS (2012–2026), pero varía tanto de una temporada a otra que no hay evidencia firme de que la temporada se haya movido.`, more_clock: "Ver cada temporada y las pruebas de tendencia",
    seasonPlain: (area, mo, cur, med, lo, hi, lvl) => `${area} lleva <b>${cur}</b> focos de calor en esta temporada (hasta ${mo}). Una temporada normal lleva cerca de ${med} a esta altura; 8 de cada 10 temporadas tenían entre ${lo} y ${hi}. <span class="${lvl}">${lvl === "lo" ? "Por ahora, una temporada tranquila." : lvl === "hi" ? "Por ahora, una temporada activa." : "Por ahora, una temporada normal."}</span>`,
    meterLg: ["rango habitual: 8 de cada 10 temporadas anteriores estaban aquí", "lo normal", "esta temporada"],
    dialThen: "temporadas 2001–02 a 2011–12", dialNow: "temporadas 2012–13 a 2025–26",
    clockPlainMoved: (a, b) => `El momento de más focos de la temporada <b>se movió de ${a} a ${b}</b>, y el cambio se mantiene en los años solo VIIRS.`,
    clockPlainMaybe: (a, b) => `<b>Posible cambio, sin confirmar.</b> El momento de más focos podría haberse movido de ${a} a ${b}, pero no se confirma en los años solo VIIRS.`,
    clockPlainSame: (a) => `<b>Sin un cambio claro en 25 temporadas.</b> El momento de más focos de la temporada sigue siendo cerca de ${a}.`,
    dialLg: ["cada sector: parte de los focos de la temporada en ese mes", "ahora: temporadas 2012–13 a 2025–26 (VIIRS)", "antes: temporadas 2001–02 a 2011–12 (estimado desde MODIS)", "aguja = mes con más focos"],
    clock_h: "Reloj de la temporada: ¿se está desplazando la temporada de incendios?",
    clockIntro: "¿En qué momento del año ocurren los focos, y ha cambiado eso? El reloj es el año: enero a la 1, diciembre a las 12. Ciclos climáticos como El Niño pueden crear u ocultar un desplazamiento aparente en 25 temporadas; las tendencias aún no se ajustan por ellos.",
    clockSub: "Cada barra es una temporada: empieza cuando ocurrió el 10 % de sus focos, termina al 90 %, y el punto marca el mes con más focos. Las tendencias usan pendientes de Theil-Sen y la prueba de Mann-Kendall sobre 25 temporadas; un desplazamiento se considera confirmado solo si también aparece en las temporadas solo VIIRS (2012–13 a 2025–26). Las temporadas de focos incluyen las quemas agrícolas.",
    clockDesert: "No se muestra para las regiones del desierto de Atacama: sus focos incluyen focos falsos persistentes, así que la forma de la temporada no tiene sentido.",
    clockMetric: { onset: "Inicio (10 %)", peak: "Mes con más focos", end: "Fin (90 %)", length: "Duración" },
    clockVal: (k, v) => k === "length" ? `${dec(Math.abs(v), 1)} días ${v < 0 ? "más corta" : "más larga"} por década` : `${dec(Math.abs(v), 1)} días ${v < 0 ? "antes" : "después"} por década`,
    clockV: { robust: "confirmado en los años solo VIIRS", possible: "posible, no confirmado en los años solo VIIRS", none: "sin cambio claro" },
    clockCI: (a, b, p) => `IC 95 % ${a} a ${b} · p = ${p}`,
    clockLg: ["temporada, de inicio a fin (color = total de focos)", "mes con más focos", "tendencia del mes con más focos"],
    clockMulti: "Con 16 regiones y 4 medidas, se esperan algunas tendencias aparentes por azar; la prueba con los años solo VIIRS filtra la mayoría.",
    scen: (v, a, b) => `Si el resto de la temporada fuera como las anteriores: cerca de ${v} focos a junio (${a}–${b}). Es un escenario, no un pronóstico.`,
    scenLg: "escenarios: el resto de la temporada como las anteriores (10–90 %)",
    season_h: "Esta temporada hasta ahora frente a todas las anteriores",
    seasonSub: (area) => `${area}, temporada de incendios 2026–27 (julio a junio): focos de calor acumulados mes a mes, en escala VIIRS, con eje multiplicativo. La franja contiene 8 de cada 10 temporadas anteriores (2001–02 a 2025–26).`,
    seasonWarn: " Un inicio tranquilo o activo no es un pronóstico: de Valparaíso a La Araucanía, la actividad de julio a octubre no anticipó la de noviembre a junio en las últimas 25 temporadas.",
    seasonExcl: (l) => ` Las regiones del desierto de Atacama (${l}) quedan fuera de ambos lados, porque sus datos recientes están ocultos.`,
    sThrough: (mo) => `Hasta ${mo}`, sThroughSub: "focos de calor acumulados en la temporada",
    sVs: "Frente a la temporada mediana", sVsSub: (b, n) => `mayor que ${b} de ${n} temporadas anteriores a esta altura`,
    sCur: "Temporada 2026–27 (puntos huecos: provisorio; punteado: noviembre en curso)", sMed: "mediana de las temporadas anteriores", sBand: "percentil 10–90 de las temporadas anteriores",
    sTop: (s) => `${s} (la más activa)`, sPt: (mo, v, st) => `${mo}: ${v} focos acumulados${st}`, sProv: " (provisorio)", sPart: " (parcial, hasta el 7 de noviembre)",
    jump_h: "El salto de 2012, antes y después",
    jump_sub: "Cuando VIIRS llega en 2012 ve muchos más fuegos pequeños que MODIS: unidas tal cual, las cifras parecen dispararse de un año a otro. La prueba: por cada incendio registrado por CONAF, ¿cuántos focos se ven después de 2012 frente a antes? Si las cifras son comparables, la respuesta es ×1.",
    trust_h: "Cuánto confiar en estas cifras",
    trust_sub: "Unir dos sensores nunca es exacto. Medimos el error en años que el modelo nunca vio (2020–2026) y contra los registros de incendios de CONAF de 2002–2020 (76.002 incendios en las cuatro regiones calibradas; 109.947 en todo Chile).",
    read_h: "Cómo leer esto",
    read_nodetect: "<b>Sin detección no es lo mismo que sin fuego.</b> Cada satélite polar ve un lugar solo unas dos veces al día, y las nubes, el humo y los vacíos de cobertura ocultan fuegos. Las celdas achuradas indican que no se pudo construir el registro de ese mes, no que no hubo fuego.",
    read_notfire: "<b>Un foco de calor no es un incendio.</b> Un incendio grande produce muchos focos; quemas agrícolas pequeñas o breves pueden no producir ninguno.",
    read_wip: "Trabajo en curso (NASA Space Apps Challenge 2026). Armonización v1: mapas de cuantiles propios en Maule, Ñuble, Biobío y La Araucanía; un mapa de cuantiles agrupado en otras nueve regiones; una razón simple en Los Ríos, Los Lagos y Aysén. Todo probado en años reservados y contra los registros de incendios de CONAF.",
    footer: "Datos: NASA FIRMS (MODIS Colección 6.1, VIIRS Colección 2); registros de incendios de CONAF (CC BY 4.0); límites comunales de la BCN. Agradecemos el uso de datos o imágenes del Fire Information for Resource Management System (FIRMS) de la NASA (<a href=\"https://earthdata.nasa.gov/firms\">earthdata.nasa.gov/firms</a>), parte del Earth Science Data and Information System (ESDIS) de la NASA. Código: <a href=\"https://github.com/contactomtingcl/overlap\">github.com/contactomtingcl/overlap</a>.",
    aoi: { chile: "Chile (todo el país)", biobio_hist: "Biobío + Ñuble (antigua Región del Biobío, área validada con CONAF)" },
    aoiShort: { chile: "Chile", biobio_hist: "Biobío + Ñuble" },
    level: { "unusually high": "inusualmente alta", "unusually low": "inusualmente baja", "within normal": "dentro de lo normal" },
    headline: (mo, y, area, lvl) => `${mo[0].toUpperCase() + mo.slice(1)} de ${y} en ${area}: ${lvl}`,
    levelHead: { "unusually high": "muchos más focos de lo normal", "unusually low": "muchos menos focos de lo normal", "within normal": "focos dentro de lo normal" },
    kicker: (prov) => `Último mes completo${prov ? " · provisorio, datos casi en tiempo real" : ""}`,
    statusSub: (prov, mo) => (prov ? "Datos provisorios, casi en tiempo real: pueden cambiar levemente. Noviembre de 2026 sigue en curso. " : "") + `"Muchos más" o "muchos menos" significa algo que casi nunca pasa en 25 años de ${mo}.`,
    kThis: "Este mes", kThisSub: (est) => est ? "focos de calor, estimados en escala VIIRS" : "focos de calor, medidos por VIIRS",
    kNormal: (mo) => `Lo normal para ${mo}`, kNormalSub: "el valor del medio en las temporadas 2000–01 a 2025–26",
    kAgainst: (n, mo) => `Frente a los ${n} meses de ${mo} anteriores`, kAgainstSub: (b, n, mo) => b === 0 ? `ningún ${mo} anterior tuvo menos focos` : b === n ? `ningún ${mo} anterior tuvo más focos` : `${b} de ${n} tuvieron menos focos`,
    kTop: "Temporada más activa", kTopSub: (v) => `${v} focos de calor (jul–jun)`,
    calSub: (area) => `${area}. Color = focos de calor del mes en escala VIIRS (más claro y amarillo = más focos). Pasa el cursor sobre un mes para ver lo que vio el satélite y su rango; haz clic para ver sus días.`,
    calSubRaw: "<b>Como lo vio cada satélite:</b> el conteo propio de cada uno, unido tal cual. Fíjate cómo los focos parecen saltar cuando empieza VIIRS en 2012: ese salto es del satélite, no del fuego.",
    lgRamp: (max) => `${max} focos al mes · escala multiplicativa (1, 10, 100…)`, lgNoData: "sin datos (no es cero)", lgProv: "provisorio (casi en tiempo real)",
    lgModis: "estimado desde MODIS (píxeles de 1 km)", lgViirs: "medido por VIIRS (píxeles de 375 m)", lgEra: "comienza la era VIIRS (2012)",
    srcModis: (s) => `estimado · MODIS ${s}`, srcViirs: "medido · VIIRS", srcNoaa: "medido · NOAA-20",
    tipWithheld: "Oculto: sobre el desierto de Atacama los datos provisorios traen muchos focos falsos de día. Se mostrará con los datos definitivos.",
    tipNoData: "Sin registro satelital para este mes (no significa cero fuego).",
    tipValue: (v, est) => `<b class="tv">${est ? "≈ " : ""}${v}</b> focos en escala VIIRS`,
    tipRaw: (sen, v) => `Lo que vio ${sen}: ${v}`, tipRange: (a, b) => `Probablemente entre ${a} y ${b}`,
    tipMethod: "Método", methodName: { qmap: "mapa de cuantiles propio", qmap_pooled: "mapa de cuantiles agrupado", ratio: "razón simple", mixed: "mixto (suma de regiones)" },
    tipProv: "Provisorio: datos casi en tiempo real, pueden cambiar levemente",
    tipPartial: (d) => `Mes parcial: datos hasta el ${d}, de NOAA-20 (Suomi NPP dejó de entregar datos el 2 de noviembre de 2026)`,
    tipObs: "Medido directo por VIIRS Suomi NPP", tipMedian: (mo, v) => `Lo normal en ${mo}: ${v}`,
    tipAnom: { "unusually high": "Inusualmente alto", "unusually low": "Inusualmente bajo", "within normal": "Dentro de lo normal" },
    robustZ: "z robusto",
    noteDesert: "Sin las regiones del desierto de Atacama, ocultas este mes",
    figRaw: (area) => `Sin armonizar · ${area}`, figRawSub: "focos por incendio de CONAF después de 2012 frente a antes: un salto falso, causado por el cambio de satélite",
    figH: "Armonizado", figHSub: (lo, hi) => `≈ 1: sin salto (95 % de confianza: entre ${lo} y ${hi})`,
    figAll: "Maule a La Araucanía", figNone: "Esta área no se ha contrastado con los registros de CONAF; la armonización aquí se probó en los años reservados 2020–2026 (ver la tabla de confianza).",
    chVIIRS: "Empieza VIIRS · traslape 2012–2026", chVIIRSshort: "Empieza VIIRS",
    chTitle: (s, h, r) => `${s}: armonizado ${h}, crudo ${r}`,
    chLgH: "armonizado (una sola unidad para todos los años)", chLgR: "como lo vio cada satélite: MODIS antes de 2012, VIIRS después", chLgNote: "Focos de calor por temporada de incendios (jul–jun), solo temporadas completas.",
    thRegion: "Región", thJump: "Salto de 2012 frente a CONAF<br>(×1 = sin salto)", thAqua: "Años estimados desde MODIS Aqua<br>2002–2012", thTerra: "Años con solo MODIS Terra<br>2000–2002", thMethod: "Método",
    raw: "sin armonizar", ci: "95 % de confianza:",
    errLine: (f, lo, hi, b, c) => `si mostramos 100, lo real suele estar entre <b>${lo} y ${hi}</b><br><small>error medio ×${f} · ${b}${c == null ? "" : ` · el rango acertó ${c} de cada 100 meses`}</small>`,
    biasTxt: (v) => Math.abs(v) < 0.5 ? "en total, sin sesgo" : `en total, ${dec(Math.abs(v), 1)} % ${v < 0 ? "por debajo" : "por encima"}`,
    testedH: "Otras regiones: probadas en los años reservados 2020–2026 y contra los registros de incendios de CONAF",
    testedNote: "El mapa agrupado se ajustó con Maule, Ñuble, Biobío y La Araucanía juntas y se probó en regiones que nunca vio; donde perdió frente a la razón simple propia de la región, se usa la razón. Contra CONAF (109.947 incendios en todas las regiones), el salto falso de 2012 desaparece en 9 de las 11 regiones con suficientes incendios. Valparaíso queda sobrecorregida y la Metropolitana conserva parte del salto; el norte y Magallanes tienen muy pocos incendios de CONAF para evaluar. Los errores son mayores que en las regiones calibradas, así que allí los años anteriores a 2012 son referenciales.",
    thConaf: "Salto de 2012 frente a CONAF<br>(×1 = sin salto)",
    verdict: { removed: "salto eliminado", over: (p) => `sobrecorregido: los años antes de 2012 quedan cerca de ${p} % más altos`, under: (p) => `subcorregido: los años antes de 2012 quedan cerca de ${p} % más bajos`, few_fires: (n) => `solo ${n} incendios de CONAF: no se puede evaluar` },
    figConaf: (v) => `En esta región: ${v}.`,
    trustNote: (f, cov) => `Cómo leerlo: con un error medio de ×${f}, si un mes antiguo muestra 100 focos, lo que habría visto VIIRS suele estar entre 100 ÷ ${f} y 100 × ${f}. El rango de cada mes debería acertar 8 de cada 10 veces; con MODIS Aqua, en años que el modelo nunca vio, acertó ${cov} de cada 100, algo menos de lo prometido.`,
    method: {
      unit: "Todos los valores se expresan como los focos de calor que registraría VIIRS Suomi NPP (un solo satélite, nunca una suma de satélites). Antes de Suomi NPP (2012), los conteos de MODIS se llevan a esa unidad. ",
      qmap: (r) => `<b>${r}:</b> mapeo de cuantiles ajustado donde ambos sensores observaron (2012–2026), probado en los años reservados 2020–2026 y contrastado con los registros de incendios de CONAF 2002–2020. Maule, Ñuble, Biobío y La Araucanía juntas: sin armonizar, la serie salta ×4,7 en 2012 respecto de la actividad real de fuego; armonizada, ×0,89 (el intervalo de 95 % incluye 1: sin salto). `,
      pooled: (r) => `<b>${r}:</b> un solo mapa de cuantiles ajustado con Maule, Ñuble, Biobío y La Araucanía juntas, aplicado región por región (nunca a un total nacional), probado en los años reservados de cada región y contrastado con los registros de CONAF donde hay suficientes incendios. `,
      ratio: (r, f) => `<b>${r}:</b> razón simple entre sensores (${f}), porque allí el mapa agrupado tuvo peor desempeño en los años reservados. `,
      data: "Solo datos FIRMS de calidad científica, fuegos presuntos de vegetación (se excluyen volcanes, minería e industria) y sin detecciones de baja confianza. Las regiones usan los límites comunales de la BCN (referenciales, no oficiales).",
    },
    dayTitle: (mo, y) => `${mo[0].toUpperCase() + mo.slice(1)} de ${y}, día a día`,
    dayNone: "Sin registro satelital para este mes.",
    dayStatus: { estimated: (s) => `estimado desde ${s}`, provisional: "provisorio, datos casi en tiempo real", partial: "mes parcial", no_data: "sin registro", observed: "observado por VIIRS Suomi NPP" },
    daySub: (v, st, fd, n, top) => `${v} focos de calor este mes (${st}). Hubo focos en ${fd} de ${n} días${top ? `; día con más focos: ${top}` : ""}.`,
    dayTop: (mo, d, v) => `${d} de ${mo}, con ${v}`,
    dayRaw: (s) => ` Los valores diarios son detecciones crudas de ${s}; solo el total mensual está armonizado.`,
    sat: { Terra: "MODIS Terra", Aqua: "MODIS Aqua", SNPP: "VIIRS Suomi NPP", NOAA20: "VIIRS NOAA-20" },
    dx: {
      estimated: (sat, raw, v, lo, hi) => `Ese mes aún no había datos de VIIRS. ${sat} tiene píxeles de 1 km y no ve muchos fuegos pequeños: vio ${raw} focos. Para comparar con hoy, Overlap estima cuántos habría visto VIIRS Suomi NPP (píxeles de 375 m): unos ${v}, probablemente entre ${lo} y ${hi}.`,
      partial: (raw, v, d) => `Mes en curso, datos hasta el ${d}. Suomi NPP dejó de enviar datos el 2 de noviembre, así que solo está su gemelo VIIRS NOAA-20: vio ${raw} focos, unos ${v} en la escala de Suomi NPP.`,
      observed: (v) => `VIIRS Suomi NPP vio ${v} focos este mes. Es el satélite de referencia de Overlap, así que esta cifra no se convierte.`,
      prov: " Son datos casi en tiempo real: pueden cambiar levemente.",
      top: (mo, d, v) => ` El día con más focos fue el ${d} de ${mo}, con ${v}.`,
      none: " Ningún día con focos.",
      thru: (d, mo) => `${d} de ${mo}`,
    },
    cv: { saw: (s) => `Lo que vio ${s}`, days: (fd, n) => `focos, en ${fd} de ${n} días`, arrow: "convertido a escala VIIRS", factor: (f) => `≈ ×${f} este mes`,
      out: "Cifra comparable entre años", range: (lo, hi) => `probablemente entre ${lo} y ${hi}`, direct: "medido directo, sin conversión" },
    cap: { estimated: (sat, sum) => `Cada día: focos que vio ${sat} (suman ${sum}). Los días muestran lo que vio el satélite; solo el total del mes se convierte.`,
      observed: (sum) => `Cada día: focos que vio VIIRS Suomi NPP (suman ${sum}).`, partial: "Cada día: focos de VIIRS NOAA-20 llevados a la escala de Suomi NPP (aproximado)." },
    dlg: ["focos detectados (más claro y amarillo = más)", "observado, sin focos", "sin registro satelital", "Un día sin focos igual puede ocultar fuego bajo nubes o humo."],
    dayTipNone: "sin registro satelital", dayTipHot: (v) => `${v} focos de calor`,
    sources: { SNPP: "VIIRS Suomi NPP (observado)", NOAA20: "VIIRS NOAA-20 (escalado)", Aqua: "MODIS Aqua (escalado)", Terra: "MODIS Terra, órbita de la mañana (escalado)" },
  },
};

function pickLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "es" || q === "en") return q;
  try { const s = localStorage.getItem("overlap-lang"); if (s === "es" || s === "en") return s; } catch (e) { /* storage blocked */ }
  return (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
}

// ---------- data & state ----------
// Sequential ramp on a dark background: brightness grows with activity (slate -> blue -> lime glow),
// taken from the Overlap logo. Monotonic in lightness, so it also reads in greyscale.
const PALETTES = {
  // "inferno" (matplotlib), from 0.2 so the fewest hotspots still show on the dark background: dark purple ->
  // red -> orange -> yellow-white, read as heat, perceptually uniform and monotonic in lightness.
  fire: ["#420a68", "#6a176e", "#932667", "#bc3754", "#dd513a", "#f37819", "#fca50a", "#f6d746", "#fcffa4"],
  // cividis (Nuñez et al. 2018): designed to read the same with and without colour-vision deficiency
  cvd: ["#00224e", "#123570", "#3b496c", "#575d6d", "#707173", "#8a8779", "#a69d75", "#c4b56c", "#e4cf5b", "#fee838"],
};
let RAMP = PALETTES.fire;
const NO_DATA = "#0f1d38";
const LEVEL_COLOUR = { "unusually high": "var(--high)", "unusually low": "var(--low)", "within normal": "var(--normal)" };
// Four-region CONAF check (pipeline/10, results/validation_conaf/jump_at_2012_vs_conaf.csv)
const CONAF_ALL = { unh: 4.7, h: 0.89, lo: 0.77, hi: 1.07 };

const DESERT_AOI = ["r15", "r1", "r2", "r3"];
const state = { aoi: "r8", rows: "season", mode: "harmonized", lang: pickLang(), aois: [], data: null, daily: {}, max: 1, lastWidth: 0, month: null };
const L = () => I18N[state.lang];
const $ = (id) => document.getElementById(id);
const fmt = (v) => v == null ? "—" : Math.round(v).toLocaleString(L().locale);
const dec = (v, d = 2) => v == null ? "—" : Number(v).toLocaleString(L().locale, { maximumFractionDigits: d });
const pct = (v) => `${v > 0 ? "+" : ""}${dec(v, 1)}${state.lang === "es" ? " %" : "%"}`;
const aoiName = (key, json) => L().aoi[key] || json.replace(" region, Chile", "");
const shortName = () => L().aoiShort[state.aoi] || state.data.name.replace(" region, Chile", "");

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Count a number up from zero (KPIs, big figures). Elements carry data-count, data-dec, data-pre.
function countUp(root) {
  root.querySelectorAll("[data-count]").forEach((el) => {
    const to = +el.dataset.count, d = +(el.dataset.dec || 0), pre = el.dataset.pre || "", suf = el.dataset.suf || "";
    const out = (v) => pre + (d ? dec(v, d) : fmt(v)) + suf;
    if (REDUCED) { el.textContent = out(to); return; }
    const t0 = performance.now(), dur = 1100;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = out(to * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
const num = (v, d = 0, pre = "") => `<b data-count="${v}" data-dec="${d}" data-pre="${pre}">${pre}${d ? dec(v, d) : fmt(v)}</b>`;

// A satellite swath sweeping down the calendar (on load and when switching raw / harmonized).
function sweep(svg) {
  if (REDUCED || !svg) return;
  const a = svg.querySelector("#swath");
  a && a.querySelectorAll("animate, animateTransform").forEach((x) => x.beginElement());
}

function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
let RAMP_RGB = RAMP.map(hex2rgb);
// Position of a value on the colour scale (log), between a floor `min` and `max`; values at or below the floor
// take the darkest colour. A floor above zero lets areas that never have quiet months use the whole palette.
function lev(v, max, min = 0) {
  const lo = Math.log10(min + 1), hi = Math.log10(max + 1);
  return hi > lo ? Math.max(0, Math.min(1, (Math.log10(v + 1) - lo) / (hi - lo))) : 0;
}
function colour(v, max, min = 0) {
  if (v == null) return null;
  const t = lev(v, max, min) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(t)), f = t - i;
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

// Small "i" buttons: a plain-language explanation on hover, focus or tap.
function showInfo(btn) {
  const t = $("tip"), r = btn.getBoundingClientRect();
  t.innerHTML = L()[btn.dataset.info]; t.style.display = "block"; t.classList.add("infotip");
  t.style.left = Math.max(8, Math.min(r.left - 10, innerWidth - t.offsetWidth - 8)) + "px";
  t.style.top = (r.bottom + 8 + t.offsetHeight > innerHeight ? r.top - t.offsetHeight - 8 : r.bottom + 8) + "px";
}
function hideInfo() { const t = $("tip"); if (t.classList.contains("infotip")) { t.style.display = "none"; t.classList.remove("infotip"); } }
function bindInfo() {
  document.querySelectorAll(".info:not([data-bound])").forEach((b) => {
    b.dataset.bound = "1";
    b.setAttribute("aria-label", L().info_lbl); b.title = "";
    b.addEventListener("mouseenter", () => showInfo(b)); b.addEventListener("mouseleave", hideInfo);
    b.addEventListener("focus", () => showInfo(b)); b.addEventListener("blur", hideInfo);
    b.addEventListener("click", (e) => { e.stopPropagation(); $("tip").style.display === "block" && $("tip").classList.contains("infotip") ? hideInfo() : showInfo(b); });
  });
}
document.addEventListener("click", hideInfo);
addEventListener("scroll", hideInfo, { passive: true });

function showError(e) { console.error(e); $("err").textContent = L().loadErr; $("err").hidden = false; }

async function load() {
  let res;
  try { res = await fetch(DATA(`${state.aoi}.json`)); if (!res.ok) throw new Error(res.status); state.data = await res.json(); }
  catch (e) { showError(e); return; }
  $("err").hidden = true;
  const vals = state.data.months.map((r) => r.value).filter((v) => v != null).sort((a, b) => a - b);
  state.max = vals.at(-1);
  state.min = Math.floor(vals[Math.floor(vals.length * 0.02)] || 0); // 2nd percentile as the floor of the scale
  render(true);
  updateURL();
}

// ---------- static text ----------
function applyStatic() {
  document.documentElement.lang = state.lang;
  document.title = state.lang === "es" ? "Overlap · Calendario armonizado de actividad de quemas" : "Overlap · Harmonized burning activity calendar";
  document.querySelectorAll("[data-i18n]").forEach((el) => { const v = L()[el.dataset.i18n]; if (typeof v === "string") el.innerHTML = v; });
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => { el.alt = L()[el.dataset.i18nAlt]; });
  document.querySelectorAll("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", L()[el.dataset.i18nLabel]); });
  document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
  document.querySelectorAll("[data-nav]").forEach((el) => { el.textContent = L().nav[+el.dataset.nav]; });
  document.querySelectorAll(".info").forEach((b) => b.setAttribute("aria-label", L().info_lbl));
  bindInfo();
  document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = L()[el.dataset.i18nTitle]; el.setAttribute("aria-label", L()[el.dataset.i18nTitle]); });
  if (state.aois.length) $("aoi").innerHTML = state.aois.map((a) => `<option value="${a.key}"${a.key === state.aoi ? " selected" : ""}>${aoiName(a.key, a.name)}</option>`).join("");
}

// The address bar always describes the current view, so any view can be shared as a link.
function updateURL() {
  const u = new URL(location.href), q = u.searchParams;
  q.set("lang", state.lang); q.set("area", state.aoi);
  if (state.mode === "raw") q.set("view", "raw"); else q.delete("view");
  if (state.month && !$("day-panel").hidden) q.set("m", state.month); else q.delete("m");
  if (state.cvd) q.set("cvd", "1"); else q.delete("cvd");
  history.replaceState(null, "", u);
}

async function copyLink() {
  updateURL();
  const done = () => { $("share-t").textContent = L().copied; setTimeout(() => { $("share-t").textContent = L().share_s; }, 2200); };
  try { await navigator.clipboard.writeText(location.href); done(); }
  catch (e) {
    const t = document.createElement("textarea"); t.value = location.href; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); done(); } finally { t.remove(); }
  }
}

function setLang(lang) {
  state.lang = lang;
  try { localStorage.setItem("overlap-lang", lang); } catch (e) { /* storage blocked */ }
  updateURL();
  applyStatic();
  if (state.data) { render(false); if (!$("day-panel").hidden && state.month) showMonth(state.month, false); }
}

// ---------- calendar ----------
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
      rows.push({ label: String(y), start: y, cells: L().months.map((_, i) => ({ key: `${y}-${String(i + 1).padStart(2, "0")}`, mm: i + 1 })) });
    }
  }
  rows.forEach((r) => r.cells.forEach((c) => { c.rec = byMonth.get(c.key) || null; }));
  return rows;
}

function cellFill(r) {
  if (r && r.withheld) return "url(#hatch)";
  return colour(shown(r), state.max, state.min) || "url(#hatch)";
}

function renderCalendar(animate) {
  const T = L(), rows = grid();
  const box = $("calendar").clientWidth || 900;
  state.lastWidth = box;
  const narrow = box < 620;
  const left = narrow ? 50 : 70, right = narrow ? 36 : 170, top = 26, ch = narrow ? 20 : 22;
  const cw = Math.max(20, Math.min(58, Math.floor((box - left - right) / 12)));
  const W = left + 12 * cw + right, H = top + rows.length * ch + 10;
  const head = (state.rows === "season" ? [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5] : [...Array(12).keys()])
    .map((m, i) => `<text x="${left + i * cw + cw / 2}" y="15" text-anchor="middle" font-size="${narrow ? 10.5 : 12}" fill="#8fa6cc">${narrow ? T.months[m][0].toUpperCase() : T.months[m]}</text>`).join("");
  let body = "", eraY = null;
  rows.forEach((row, ri) => {
    const y = top + ri * ch;
    if (row.start === 2012 && eraY == null) eraY = y;
    body += `<text x="${left - 8}" y="${y + ch / 2 + 4}" text-anchor="end" font-size="${narrow ? 10.5 : 12}" fill="#c9d6ea">${narrow ? row.label.replace(/^20/, "") : row.label}</text>`;
    const sources = new Set();
    row.cells.forEach((c, ci) => {
      const x = left + ci * cw, r = c.rec;
      const cls = animate ? ` class="cell pop" style="fill:${cellFill(r)};animation-delay:${ri * 28 + ci * 6}ms"` : ` class="cell" style="fill:${cellFill(r)}"`;
      body += `<rect${cls} data-key="${c.key}" data-ri="${ri}" x="${x + 1.5}" y="${y + 1.5}" width="${cw - 3}" height="${ch - 3}" rx="${narrow ? 3 : 4}"/>`;
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
      const note = [...sources].map((s) => s === "SNPP" ? T.srcViirs : s === "NOAA20" ? T.srcNoaa : T.srcModis(s)).join(" + ");
      body += `<text x="${ix + 32}" y="${y + ch / 2 + 4}" font-size="11.5" fill="#8fa6cc">${note}</text>`;
    }
  });
  const swath = `<g id="swath" opacity="0" pointer-events="none"><rect x="${left - 4}" y="-46" width="${12 * cw + 6}" height="44" fill="url(#swg)"/><rect x="${left - 4}" y="-3" width="${12 * cw + 6}" height="2.5" fill="#eaff28" filter="url(#glow)"/>`
    + `<animateTransform attributeName="transform" type="translate" from="0 ${top}" to="0 ${H}" dur="1.25s" begin="indefinite" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/>`
    + `<animate attributeName="opacity" values="1;1;0" keyTimes="0;.85;1" dur="1.25s" begin="indefinite" fill="freeze"/></g>`;
  const era = eraY == null ? "" : `<line x1="${left - 4}" x2="${left + 12 * cw + 2}" y1="${eraY}" y2="${eraY}" stroke="#eaff28" stroke-width="2" filter="url(#glow)"/>`;
  $("calendar").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${T.cal_h}, ${shortName()}">
    <defs>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="${NO_DATA}"/><line x1="0" y1="0" x2="0" y2="6" stroke="#2a3d63" stroke-width="2"/></pattern>
      <pattern id="pmodis" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#22384a"/><rect width="3" height="3" fill="#4d6b85"/><rect x="3" y="3" width="3" height="3" fill="#4d6b85"/></pattern>
      <pattern id="pviirs" width="3" height="3" patternUnits="userSpaceOnUse">
        <rect width="3" height="3" fill="#0d2a52"/><circle cx="1.5" cy="1.5" r=".8" fill="#4db8ff"/></pattern>
      <linearGradient id="swg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaff28" stop-opacity="0"/><stop offset="1" stop-color="#eaff28" stop-opacity=".22"/></linearGradient>
      <filter id="glow" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${head}${body}${era}${swath}</svg>`;
  if (animate) sweep($("calendar").querySelector("svg"));
  $("calendar").querySelectorAll(".cell").forEach((el) => {
    el.addEventListener("mousemove", (e) => tip(e, el.dataset.key));
    el.addEventListener("mouseleave", () => { $("tip").style.display = "none"; });
    el.addEventListener("click", () => showMonth(el.dataset.key));
  });
  const stops = RAMP.map((c, i) => `${c} ${Math.round((i / (RAMP.length - 1)) * 100)}%`).join(",");
  $("legend").innerHTML = `<span class="ramp">${state.min > 0 ? "≤ " : ""}${fmt(state.min)} <i style="background:linear-gradient(90deg,${stops})"></i> ${T.lgRamp(fmt(state.max))}</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>${T.lgNoData}</span>`
    + `<span><i class="sw" style="border:1.5px dashed #eaff28;background:transparent"></i>${T.lgProv}</span>`
    + `<span><i class="ico modis"></i>${T.lgModis}</span>`
    + `<span><i class="ico viirs"></i>${T.lgViirs}</span>`
    + `<span><i class="sw" style="height:3px;width:18px;background:#eaff28;border:0;box-shadow:0 0 6px #eaff28;vertical-align:3px"></i>${T.lgEra}</span>`;
  calSub();
}

function calSub() { $("cal-sub").innerHTML = state.mode === "raw" ? L().calSubRaw : L().calSub(shortName()); }

function setMode(mode) {
  state.mode = mode;
  $("mode-h").setAttribute("aria-pressed", mode === "harmonized");
  $("mode-r").setAttribute("aria-pressed", mode === "raw");
  const byMonth = new Map(state.data.months.map((r) => [r.month, r]));
  $("calendar").querySelectorAll(".cell").forEach((el) => {
    el.classList.remove("pop"); el.style.animationDelay = "";
    el.style.transitionDelay = REDUCED ? "0ms" : `${+el.dataset.ri * 42}ms`;
    el.style.fill = cellFill(byMonth.get(el.dataset.key) || null);
  });
  sweep($("calendar").querySelector("svg"));
  calSub();
  renderJump();
  updateURL();
}

function methodLabel(methods) {
  const T = L();
  if (methods.length > 1) return T.methodName.mixed;
  return T.methodName[methods[0]] || methods[0];
}

function tip(e, key) {
  const T = L(), r = state.data.months.find((m) => m.month === key);
  const [y, m] = key.split("-");
  let html = `<b>${T.monthsLong[+m - 1]} ${y}</b><br>`;
  if (r && r.withheld) html += T.tipWithheld;
  else if (!r || r.value == null) html += T.tipNoData;
  else {
    const est = r.status === "estimated" || r.status === "partial";
    html += `${T.tipValue(fmt(r.value), est)}<br>`;
    if (r.status === "estimated") html += `<span class="tq">${T.tipRange(fmt(r.low), fmt(r.high))}</span><br>${T.tipRaw(r.source === "Terra" ? "MODIS Terra" : "MODIS Aqua", fmt(rawValue(r)))}<br>`;
    else if (r.status === "provisional") html += `${T.tipProv}<br>`;
    else if (r.status === "partial") html += `${T.tipPartial(r.through)}<br>`;
    else html += `${T.tipObs}<br>`;
    html += T.tipMedian(T.monthsLong[+m - 1], fmt(r.median_like ?? state.data.climatology_median[+m]));
    if (r.anomaly) html += ` · <span style="color:${LEVEL_COLOUR[r.anomaly]}">${T.tipAnom[r.anomaly]}</span>`;
    if (r.note) html += `<br>${T.noteDesert}`;
    html += `<br><span class="tq">${T.tipClick}</span>`;
  }
  const t = $("tip");
  t.classList.remove("infotip"); t.innerHTML = html; t.style.display = "block";
  t.style.left = Math.min(e.clientX + 14, innerWidth - 300) + "px";
  t.style.top = Math.min(e.clientY + 14, innerHeight - t.offsetHeight - 8) + "px";
}

// ---------- status ----------
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
  const T = L(), d = state.data, Lt = d.latest, [y, m] = Lt.month.split("-");
  const mo = T.monthsLong[+m - 1];
  const below = Lt.below, nSame = Lt.n; // computed in pipeline/03 (like for like when desert regions are withheld)
  const an = Lt.anomaly || "within normal";
  const prov = Lt.status === "provisional";
  $("status-kicker").innerHTML = `<span class="live"></span>${T.kicker(prov)}`;
  $("headline").innerHTML = T.headline(mo, y, shortName(), `<span class="lvl" style="color:${LEVEL_COLOUR[an]}">${T.levelHead[an]}</span>`) + ` <button type="button" class="info" data-info="info_anom">i</button>`;
  bindInfo();
  $("status-sub").textContent = T.statusSub(prov, mo) + ((Lt.excluded || []).length ? T.likeNote(Lt.excluded.join(", ")) : "") + (DESERT_AOI.includes(state.aoi) ? T.desertNote : "");
  const top = seasonTotals().sort((a, b) => b.h - a.h)[0];
  const pos = Math.max(0, Math.min(100, 50 + (Lt.z / 4) * 50));
  $("status").innerHTML = `
    <div class="kpi"><small>${T.kThis}</small>${num(Lt.value)}<small>${T.kThisSub(["estimated", "partial"].includes(Lt.status))}</small></div>
    <div class="kpi"><small>${T.kNormal(mo)}</small>${num(Lt.median)}<small>${T.kNormalSub}</small></div>
    <div class="kpi"><small>${T.kAgainst(nSame, mo)}</small><div class="gauge"><i style="left:${state.animNext ? 50 : pos}%" data-pos="${pos}"></i></div><small>${T.kAgainstSub(below, nSame, mo)}</small></div>
    ${top ? `<div class="kpi"><small>${T.kTop}</small><b>${top.s}–${String(top.s + 1).slice(2)}</b><small>${T.kTopSub(fmt(top.h))}</small></div>` : ""}`;
  if (state.animNext) {
    countUp($("status"));
    requestAnimationFrame(() => requestAnimationFrame(() => { const g = $("status").querySelector(".gauge i"); if (g) g.style.left = g.dataset.pos + "%"; }));
  }
}

// ---------- map of Chile ----------
// Diverging scale for the robust z: blue below normal, dark at normal, orange to gold above.
const ZPAL = {
  brand: [[-3, "#3d9bff"], [-1.5, "#1f4f8a"], [0, "#17284c"], [1.5, "#9a4f2c"], [3, "#ff8a3d"], [4.5, "#ffe08a"]],
  cvd: [[-3, "#4f9cff"], [-1.5, "#24467e"], [0, "#1c2440"], [1.5, "#7b7350"], [3, "#d8c25a"], [4.5, "#fee838"]],
};
let ZSTOPS = ZPAL.brand.map(([z, c]) => [z, hex2rgb(c)]);
function setPalette(cvd) {
  state.cvd = cvd;
  RAMP = cvd ? PALETTES.cvd : PALETTES.fire; RAMP_RGB = RAMP.map(hex2rgb);
  ZSTOPS = (cvd ? ZPAL.cvd : ZPAL.brand).map(([z, c]) => [z, hex2rgb(c)]);
  $("cvd").setAttribute("aria-pressed", cvd);
  try { localStorage.setItem("overlap-cvd", cvd ? "1" : "0"); } catch (e) { /* storage blocked */ }
}
function zcol(z) {
  if (z == null) return "url(#mhatch)";
  z = Math.max(-3, Math.min(4.5, z));
  let i = 0; while (i < ZSTOPS.length - 2 && z > ZSTOPS[i + 1][0]) i++;
  const [z0, a] = ZSTOPS[i], [z1, b] = ZSTOPS[i + 1], f = (z - z0) / (z1 - z0);
  return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * f)).join(",")})`;
}
const map = { geo: null, reg: null, i: 0, mode: "z", timer: null, vmax: 1, zoom: null, vb: null, com: {}, anim: null };
const SENSOR_NAME = { Terra: "MODIS Terra", Aqua: "MODIS Aqua", SNPP: "VIIRS Suomi NPP", NOAA20: "VIIRS NOAA-20" };
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function initMap() {
  [map.geo, map.reg] = await Promise.all([fetch(DATA("geo/regions_svg.json")).then((r) => r.json()), fetch(DATA("regions_monthly.json")).then((r) => r.json())]);
  map.vmax = Math.max(...Object.values(map.reg.regions).flatMap((r) => r.v.filter((x) => x != null)));
  const M = map.reg.months;
  map.i = M.lastIndexOf("2026-10");
  $("map-slider").max = M.length - 1; $("map-slider").value = map.i;
  buildMap();
}

// The country is drawn lying down (north to the left) on wide screens and upright (north up) on phones,
// where a lying-down Chile would be too small to tap.
const mapHome = () => (map.vert ? [0, 0, map.geo.width, 1000] : [0, 0, 1000, map.geo.width]);
const mapHomeHeight = () => (map.vert ? 520 : ($("map").clientWidth || 1000) * map.geo.width / 1000);
function buildMap() {
  const w = map.geo.width;
  map.vert = ($("map").clientWidth || 1000) < 620;
  map.vb = mapHome();
  $("map").innerHTML = `<svg viewBox="${map.vb.join(" ")}" style="height:${mapHomeHeight()}px" role="img" aria-label="${L().map_h}">
    <defs><pattern id="mhatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${NO_DATA}"/><line x1="0" y1="0" x2="0" y2="4" stroke="#2a3d63" stroke-width="1.5"/></pattern></defs>
    <g${map.vert ? "" : ` transform="translate(0,${w}) rotate(-90)"`}><g id="mregs">${Object.entries(map.geo.regions).map(([k, d]) => `<path class="reg" data-r="${k}" d="${d}" vector-effect="non-scaling-stroke"/>`).join("")}</g><g id="mcoms"></g></g></svg>
    <button type="button" id="map-back" class="mapback" hidden></button>`;
  $("map-back").addEventListener("click", () => { if (map.com_sel && map.zoom) { map.com_sel = null; map.panelKey = null; zoomTo(map.zoom); } else zoomOut(); });
  $("map").querySelectorAll(".reg").forEach((el) => {
    el.addEventListener("mousemove", (e) => mapTip(e, el.dataset.r));
    el.addEventListener("mouseleave", () => { $("tip").style.display = "none"; });
    el.addEventListener("click", () => { $("tip").style.display = "none"; selectAoi(`r${el.dataset.r}`, false); });
  });
  document.querySelector(".ns").hidden = map.vert;
  map.zoom = null; $("map-side").innerHTML = "";
  paintMap();
}

// ---- zoom into a region and its communes ----
function setViewBox(vb) { map.vb = vb; $("map").querySelector("svg").setAttribute("viewBox", vb.map((v) => v.toFixed(2)).join(" ")); }
function flyTo(target, height, instant) {
  const svg = $("map").querySelector("svg"), from = map.vb.slice(), t0 = performance.now(), dur = instant || REDUCED ? 0 : 1100;
  svg.style.height = height + "px";
  cancelAnimationFrame(map.anim);
  const step = (t) => {
    const k = dur ? Math.min(1, (t - t0) / dur) : 1, e = ease(k);
    setViewBox(from.map((v, i) => v + (target[i] - v) * e));
    if (k < 1) map.anim = requestAnimationFrame(step);
  };
  map.anim = requestAnimationFrame(step);
}

// Wide screens: when zoomed, the map moves to the left and the live panel takes the right half.
const SPLIT_H = 600;
function zoomFrame() {
  const wrap = document.querySelector(".mapwrap"), split = innerWidth >= 900 && !map.vert;
  wrap.classList.toggle("split", split);
  const box = $("map").clientWidth || 1000; // read after the class change, so the narrower column counts
  return split ? { box, aspect: box / SPLIT_H, h: SPLIT_H } : { box, aspect: box < 620 ? 1.15 : 2.1, h: Math.min(560, box / (box < 620 ? 1.15 : 2.1)) };
}

async function zoomTo(r, instant) {
  map.com_sel = null; map.panelKey = null;
  const w = map.geo.width, F = zoomFrame();
  const el = $("map").querySelector(`.reg[data-r="${r}"]`);
  if (!el) return;
  map.zoom = r;
  const bb = el.getBBox(); // in map units; on wide screens the map is drawn rotated (north to the left)
  const [x1, x2, y1, y2] = map.vert ? [bb.x, bb.x + bb.width, bb.y, bb.y + bb.height] : [bb.y, bb.y + bb.height, w - (bb.x + bb.width), w - bb.x];
  const aspect = F.aspect, pad = 0.08;
  let bw = (x2 - x1) * (1 + 2 * pad), bh = (y2 - y1) * (1 + 2 * pad);
  if (bw / bh > aspect) bh = bw / aspect; else bw = bh * aspect;
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  flyTo([cx - bw / 2, cy - bh / 2, bw, bh], F.h, instant);
  // the communes cover the selected region; its coarser outline would show through at this zoom
  $("map").querySelectorAll(".reg").forEach((p) => { p.classList.toggle("dim", p.dataset.r !== r); p.classList.toggle("under", p.dataset.r === r); });
  $("map-back").hidden = false; $("map-back").textContent = L().back;
  document.querySelector(".ns").hidden = true;
  if (!map.com[r]) {
    const [geo, data] = await Promise.all([fetch(DATA(`geo/comunas/r${r}.json`)).then((x) => x.json()), fetch(DATA(`comunas_monthly/r${r}.json`)).then((x) => x.json())]);
    let cmax = 1; Object.values(data.v).forEach((o) => Object.values(o).forEach((n) => { if (n > cmax) cmax = n; }));
    map.com[r] = { geo, data, cmax };
  }
  if (map.zoom !== r) return;
  const C = map.com[r];
  $("mcoms").innerHTML = Object.entries(C.geo.paths).map(([cod, d], i) =>
    `<path class="com${instant || REDUCED ? "" : " draw"}" data-c="${cod}" d="${d}" pathLength="1" vector-effect="non-scaling-stroke" style="animation-delay:${400 + i * 25}ms"/>`).join("");
  $("mcoms").querySelectorAll(".com").forEach((p) => {
    p.addEventListener("mousemove", (e) => comTip(e, r, p.dataset.c));
    p.addEventListener("mouseleave", () => { $("tip").style.display = "none"; });
    p.addEventListener("click", (e) => { e.stopPropagation(); $("tip").style.display = "none"; zoomToCommune(r, p.dataset.c); });
  });
  paintMap();
}

// Second level of zoom: one commune, with its own history (raw VIIRS detections only, see comNote).
function boxFor(el, aspect) {
  const w = map.geo.width, bb = el.getBBox();
  const [x1, x2, y1, y2] = map.vert ? [bb.x, bb.x + bb.width, bb.y, bb.y + bb.height] : [bb.y, bb.y + bb.height, w - (bb.x + bb.width), w - bb.x];
  let bw = Math.max((x2 - x1) * 2.6, 8), bh = Math.max((y2 - y1) * 2.6, 8);
  if (bw / bh > aspect) bh = bw / aspect; else bw = bh * aspect;
  return [(x1 + x2) / 2 - bw / 2, (y1 + y2) / 2 - bh / 2, bw, bh];
}

function zoomToCommune(r, cod, instant) {
  const el = $("mcoms").querySelector(`.com[data-c="${cod}"]`);
  if (!el) return;
  if (state.aoi !== `r${r}`) { state.aoi = `r${r}`; $("aoi").value = state.aoi; $("day-panel").hidden = true; load(); }
  map.com_sel = cod;
  const F = zoomFrame();
  flyTo(boxFor(el, F.aspect), F.h, instant);
  $("mcoms").querySelectorAll(".com").forEach((p) => { p.classList.remove("draw"); p.classList.toggle("csel", p.dataset.c === cod); p.classList.toggle("cdim", p.dataset.c !== cod); });
  $("map-back").textContent = L().backTo(map.reg.regions[r].name);
  paintComunas();
}

function zoomOut() {
  map.zoom = null; map.com_sel = null; map.panelKey = null;
  document.querySelector(".mapwrap").classList.remove("split");
  $("mcoms").innerHTML = "";
  $("map").querySelectorAll(".reg").forEach((p) => p.classList.remove("dim", "under"));
  $("map-back").hidden = true;
  document.querySelector(".ns").hidden = map.vert;
  flyTo(mapHome(), mapHomeHeight());
  $("map-side").innerHTML = "";
}

function comValue(r, cod) {
  const C = map.com[r];
  if (C.data.withheld.includes(map.i)) return undefined;
  return (C.data.v[cod] && C.data.v[cod][map.i]) || 0;
}

function comTip(e, r, cod) {
  const T = L(), C = map.com[r], v = comValue(r, cod);
  const tot = Object.keys(C.geo.paths).reduce((a, c) => a + (comValue(r, c) || 0), 0);
  const mo = map.reg.months[map.i], [y, m] = mo.split("-");
  $("tip").classList.remove("infotip"); $("tip").innerHTML = `<b>${C.geo.names[cod]}</b><br>${T.monthsLong[+m - 1]} ${y} · ${SENSOR_NAME[C.data.sensor[map.i]]}<br>`
    + (v === undefined ? T.whereWithheld : T.cTip(fmt(v), tot ? `${Math.round((100 * v) / tot)}${state.lang === "es" ? " %" : "%"}` : null));
  $("tip").style.display = "block";
  $("tip").style.left = Math.min(e.clientX + 14, innerWidth - 300) + "px";
  $("tip").style.top = Math.min(e.clientY + 14, innerHeight - $("tip").offsetHeight - 8) + "px";
}

function paintComunas() {
  const r = map.zoom, C = r && map.com[r];
  if (!C) { $("map-side").innerHTML = ""; return; }
  const T = L();
  const vals = Object.keys(C.geo.paths).map((cod) => [cod, comValue(r, cod)]);
  $("mcoms").querySelectorAll(".com").forEach((p) => {
    const v = comValue(r, p.dataset.c);
    p.style.fill = v === undefined ? "url(#mhatch)" : v === 0 ? "#0f1f3d" : colour(v, C.cmax);
  });
  const name = map.reg.regions[r].name, sen = SENSOR_NAME[C.data.sensor[map.i]];
  let body;
  if (vals.some(([, v]) => v === undefined)) body = `<p class="sub">${T.whereWithheld}</p>`;
  else {
    const top = vals.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6), max = top.length ? top[0][1] : 1;
    body = top.length ? `<div class="bars">${top.map(([cod, v]) => `<div class="bar"><span>${C.geo.names[cod]}</span><i style="width:${Math.max(4, (100 * v) / max)}%;background:${colour(v, C.cmax)}"></i><b>${fmt(v)}</b></div>`).join("")}</div>` : `<p class="sub">${T.whereNone}</p>`;
  }
  if (map.com_sel) {
    const key = `${r}:${map.com_sel}:${state.lang}:${state.cvd}`;
    if (map.panelKey !== key) { buildCommunePanel(r, map.com_sel); map.panelKey = key; }
    updateCommunePanel();
    return;
  }
  map.panel = null; map.panelKey = null;
  $("map-side").innerHTML = `<h3>${T.whereH(name)}</h3>${regionConv(r)}${body}<p class="sub" style="margin:8px 0 0">${T.whereNote(sen)} ${T.comHint}</p>`;
}

// Before 2012 the region figure is converted but communes show what MODIS saw, so say how the two relate.
function regionConv(r) {
  const C = map.com[r], sen = C.data.sensor[map.i];
  if (!sen || sen === "SNPP") return "";
  const raw = Object.keys(C.geo.paths).reduce((a, c) => a + (comValue(r, c) || 0), 0), v = map.reg.regions[r].v[map.i];
  if (v == null || comValue(r, Object.keys(C.geo.paths)[0]) === undefined) return "";
  return `<p class="rconv">${L().comConv(SENSOR_NAME[sen], fmt(raw), fmt(v))}</p>`;
}

// The commune panel is built once per commune and then updated in place on every month change (slider, ▶),
// so the cursor, the numbers and the bars move smoothly instead of being redrawn.
function communeSeries(r, cod) {
  const C = map.com[r], M = C.data.months, v = C.data.v[cod] || {};
  const idx = M.map((m, i) => i).filter((i) => C.data.sensor[i] === "SNPP" && M[i] <= "2026-10" && !C.data.withheld.includes(i));
  const seasons = [];
  for (let s = 2012; s <= 2025; s++) seasons.push([s, idx.filter((i) => { const [y, m] = M[i].split("-").map(Number); return (m >= 7 ? y : y - 1) === s && M[i] <= "2026-07"; }).reduce((a, i) => a + (v[i] || 0), 0)]);
  let best = [0, null];
  idx.forEach((i) => { if ((v[i] || 0) > best[0]) best = [v[i], M[i]]; });
  return { M, v, idx, seasons, best };
}

function buildCommunePanel(r, cod) {
  const T = L(), C = map.com[r], S = communeSeries(r, cod);
  const W = 560, H = 150, l = 34, rr = 8, t = 12, b = 22, vmax = Math.max(1, ...S.idx.map((i) => S.v[i] || 0));
  const x = (k) => l + (k / (S.idx.length - 1)) * (W - l - rr), y = (v) => t + (1 - Math.sqrt(v / vmax)) * (H - t - b);
  const pts = S.idx.map((i, k) => `${x(k).toFixed(1)},${y(S.v[i] || 0).toFixed(1)}`);
  const area = `M${x(0)},${y(0)}L${pts.join("L")}L${x(S.idx.length - 1)},${y(0)}Z`;
  const years = S.idx.map((i, k) => [S.M[i], k]).filter(([m]) => m.endsWith("-01") && +m.slice(0, 4) % 2 === 0)
    .map(([m, k]) => `<text x="${x(k)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#8fa6cc">${m.slice(0, 4)}</text><line x1="${x(k)}" x2="${x(k)}" y1="${t}" y2="${H - b}" stroke="rgba(140,180,255,.08)"/>`).join("");
  const gl = [vmax, vmax / 4].map((v) => `<text x="${l - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9.5" fill="#8fa6cc">${fmt(v)}</text><line x1="${l}" x2="${W - rr}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(140,180,255,.10)"/>`).join("");
  const smax = Math.max(1, ...S.seasons.map((x) => x[1])), SW = 560, SH = 92, bw = SW / S.seasons.length;
  const bars = S.seasons.map(([s, n], i) => `<rect class="cp-sbar" data-s="${s}" x="${i * bw + 2}" y="${SH - 16 - (n / smax) * (SH - 30)}" width="${bw - 4}" height="${Math.max(1.5, (n / smax) * (SH - 30))}" rx="3" fill="${n ? colour(n, smax) : "#10203d"}"><title>${s}–${String(s + 1).slice(2)}: ${fmt(n)}</title></rect>`
    + (i % 3 === 0 || i === S.seasons.length - 1 ? `<text x="${i * bw + bw / 2}" y="${SH - 3}" text-anchor="middle" font-size="9.5" fill="#8fa6cc">${String(s).slice(2)}–${String(s + 1).slice(2)}</text>` : "")).join("");
  const [by, bm] = S.best[1] ? S.best[1].split("-") : [];
  map.panel = { r, cod, S, x, y, vmax };
  $("map-side").innerHTML = `<div class="cp">
    <div class="cp-head"><div><div class="cp-kicker">${map.reg.regions[r].name}</div><h3 class="cp-name">${C.geo.names[cod]}</h3></div><span class="cp-chip" id="cp-sensor"></span></div>
    <div class="cp-now"><div><b id="cp-val">0</b><span id="cp-mo"></span></div>
      <div class="cp-share"><div class="cp-track"><i id="cp-share-fill"></i></div><span id="cp-share-txt"></span></div></div>
    <div id="cp-conv"></div>
    <p class="cp-label">${T.comMonthly}</p>
    <p class="cp-era" id="cp-era" hidden></p>
    <svg class="cp-spark" viewBox="0 0 ${W} ${H}">
      <defs><linearGradient id="cpg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${RAMP[0]}" stop-opacity=".35"/><stop offset=".6" stop-color="${RAMP[Math.floor(RAMP.length * .6)]}" stop-opacity=".75"/><stop offset="1" stop-color="${RAMP.at(-1)}" stop-opacity=".95"/></linearGradient></defs>
      ${gl}${years}<path d="${area}" fill="url(#cpg)"/><polyline points="${pts.join(" ")}" fill="none" stroke="#fca50a" stroke-width="1.2" opacity=".9"/>
      <g id="cp-cursor" class="cp-cursor"><line x1="0" x2="0" y1="${t}" y2="${H - b}" stroke="#eaff28" stroke-width="1.6"/><circle id="cp-dot" cx="0" cy="${H - b}" r="5" fill="#eaff28" stroke="#071536" stroke-width="2"/></g>
    </svg>
    <p class="cp-label">${T.comSeasons}</p>
    <svg class="cp-seasons" viewBox="0 0 ${SW} ${SH}">${bars}</svg>
    <p class="sub cp-best">${S.best[1] ? T.comBest(`${T.monthsLong[+bm - 1]} ${by}`, fmt(S.best[0])) : T.comNone}</p>
    <p class="sub"><small>${T.comNote}</small></p></div>`;
}

function updateCommunePanel() {
  const P = map.panel; if (!P) return;
  const T = L(), C = map.com[P.r], i = map.i, mo = C.data.months[i], [y, m] = mo.split("-");
  const here = comValue(P.r, P.cod), tot = Object.keys(C.geo.paths).reduce((a, c) => a + (comValue(P.r, c) || 0), 0);
  $("cp-val").textContent = here === undefined ? "—" : fmt(here);
  $("cp-mo").textContent = here === undefined ? T.whereWithheld : T.comMo(`${T.monthsLong[+m - 1]} ${y}`, SENSOR_NAME[C.data.sensor[i]]);
  $("cp-conv").innerHTML = regionConv(P.r);
  $("cp-sensor").textContent = SENSOR_NAME[C.data.sensor[i]];
  const sh = here && tot ? (100 * here) / tot : 0;
  $("cp-share-fill").style.width = `${Math.max(0, Math.min(100, sh))}%`;
  $("cp-share-txt").textContent = here === undefined ? "" : T.comShare(`${Math.round(sh)}${state.lang === "es" ? " %" : "%"}`);
  const k = P.S.idx.indexOf(i), cur = $("cp-cursor");
  if (k >= 0) {
    cur.style.transform = `translateX(${P.x(k).toFixed(1)}px)`; cur.style.opacity = 1;
    $("cp-dot").setAttribute("cy", P.y(P.S.v[i] || 0).toFixed(1)); $("cp-era").hidden = true;
  } else {
    cur.style.opacity = 0;
    $("cp-era").hidden = mo >= "2012-02";
    $("cp-era").textContent = T.comEra(`${T.monthsLong[+m - 1]} ${y}`);
  }
  const s = +m >= 7 ? +y : +y - 1;
  document.querySelectorAll(".cp-sbar").forEach((b) => b.classList.toggle("on", +b.dataset.s === s));
}

function paintMap() {
  if (!map.reg) return;
  const T = L(), M = map.reg.months, mo = M[map.i], [y, m] = mo.split("-");
  $("map-month").textContent = `${T.monthsLong[+m - 1][0].toUpperCase() + T.monthsLong[+m - 1].slice(1)} ${y}`;
  $("map").querySelectorAll(".reg").forEach((el) => {
    const R = map.reg.regions[el.dataset.r];
    el.style.fill = map.mode === "z" ? zcol(R.z[map.i]) : (colour(R.v[map.i], map.vmax) || "url(#mhatch)");
    el.classList.toggle("sel", state.aoi === `r${el.dataset.r}`);
  });
  paintComunas();
  const grad = (stops) => `linear-gradient(90deg,${stops.join(",")})`;
  const Cz = map.zoom && map.com[map.zoom];
  $("map-legend").innerHTML = Cz ? `<span class="ramp"><i style="background:${grad(RAMP)}"></i> ${T.mlgC(fmt(Cz.cmax))}</span><span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>${T.mlgNo}</span>` : (map.mode === "z"
    ? `<span class="ramp">${T.mlgZ[0]} <i style="background:${grad((state.cvd ? ZPAL.cvd : ZPAL.brand).map((x) => x[1]))}"></i> ${T.mlgZ[2]}</span>`
    : `<span class="ramp"><i style="background:${grad(RAMP)}"></i> ${T.mlgV(fmt(map.vmax))}</span>`)
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>${T.mlgNo}</span>`
    + (!Cz && mo >= "2026-08" && ["15", "1", "2", "3"].some((k) => map.reg.regions[k] && map.reg.regions[k].v[map.i] == null) ? `<span class="north">${T.mlgNorth}</span>` : "");
  document.querySelectorAll("[data-mm]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mm === map.mode));
}

function mapTip(e, r) {
  const T = L(), R = map.reg.regions[r], mo = map.reg.months[map.i], [y, m] = mo.split("-");
  const v = R.v[map.i], z = R.z[map.i];
  $("tip").classList.remove("infotip"); $("tip").innerHTML = `<b>${R.name}</b><br>${T.monthsLong[+m - 1]} ${y}<br>${v == null ? T.mlgNo : T.mTip(fmt(v), z == null ? null : T.tipAnom[z >= 2 ? "unusually high" : z <= -2 ? "unusually low" : "within normal"])}`;
  $("tip").style.display = "block";
  $("tip").style.left = Math.min(e.clientX + 14, innerWidth - 300) + "px";
  $("tip").style.top = Math.min(e.clientY + 14, innerHeight - $("tip").offsetHeight - 8) + "px";
}

function togglePlay() {
  if (map.timer) { clearInterval(map.timer); map.timer = null; $("play").textContent = "▶"; return; }
  if (map.i >= map.reg.months.length - 1) map.i = 0;
  $("play").textContent = "❚❚";
  map.timer = setInterval(() => {
    map.i++; $("map-slider").value = map.i; paintMap();
    if (map.i >= map.reg.months.length - 1) togglePlay();
  }, REDUCED ? 400 : 140);
}

function selectAoi(key, scroll = true) {
  state.aoi = key; $("aoi").value = key; $("day-panel").hidden = true; load();
  if (map.geo) { if (key.startsWith("r")) zoomTo(key.slice(1)); else if (map.zoom) zoomOut(); }
  if (scroll) document.querySelector(".headline").closest(".card").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
}

// ---------- this season vs past seasons ----------
function renderSeason() {
  const T = L(), S = state.data.season_to_date, card = $("season").closest(".card");
  if (!S || !S.current.length) { card.hidden = true; return; }
  card.hidden = false;
  const seasonMonths = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
  $("season-sub").textContent = T.seasonIntro + T.seasonWarn + (S.excluded.length ? T.seasonExcl(S.excluded.join(", ")) : "");
  $("season-tech").textContent = T.seasonSub(shortName());
  renderMeter(S, seasonMonths);
  if (S.compare_index != null) {
    const k = S.compare_index, r = S.ratio_to_median, b = S.below, n = S.n_seasons;
    const col = b <= 2 ? "var(--low)" : b >= n - 2 ? "var(--high)" : "var(--ink)";
    $("season-figs").innerHTML = `<div>${T.sThrough(T.monthsLong[seasonMonths[k]])}${num(S.current[k])}${T.sThroughSub}</div>`
      + (r == null ? "" : `<div>${T.sVs}<b data-count="${Math.round(r * 100)}" data-dec="0" data-suf="${state.lang === "es" ? " %" : "%"}" style="color:${col}">${Math.round(r * 100)}${state.lang === "es" ? " %" : "%"}</b>${T.sVsSub(b, n)}</div>`);
    if (S.scenario) { const e = S.scenario; $("season-figs").innerHTML += `<div style="max-width:340px">${T.scen(fmt(e.p50.at(-1)), fmt(e.p10.at(-1)), fmt(e.p90.at(-1)))}</div>`; }
  } else $("season-figs").innerHTML = "";
  const W = Math.max(340, Math.min(1100, $("season").clientWidth || 900)), H = W < 600 ? 240 : 300, l = W < 600 ? 46 : 58, r = 30, t = 14, b = 30;
  const all = [...S.p90, ...S.current, ...S.top.cum, ...S.last, ...S.p10, ...(S.scenario ? S.scenario.p90 : [])].filter((v) => v > 0);
  const lo = Math.floor(Math.log10(Math.max(1, Math.min(...all)))), hi = Math.ceil(Math.log10(Math.max(...all) + 1));
  const x = (i) => l + (i / 11) * (W - l - r);
  const y = (v) => t + (1 - (Math.log10(Math.max(v, 1)) - lo) / (hi - lo)) * (H - t - b);
  const line = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const band = line(S.p90) + S.p10.map((v, i) => `L${x(11 - i).toFixed(1)},${y(S.p10[11 - i]).toFixed(1)}`).join("") + "Z";
  let g = "";
  for (let e = lo; e <= hi; e++) g += `<line x1="${l}" x2="${W - r}" y1="${y(10 ** e)}" y2="${y(10 ** e)}" stroke="rgba(140,180,255,.12)"/><text x="${l - 8}" y="${y(10 ** e) + 4}" text-anchor="end" font-size="11" fill="#8fa6cc">${(10 ** e).toLocaleString(L().locale, { notation: "compact" })}</text>`;
  g += seasonMonths.map((m, i) => `<text x="${x(i)}" y="${H - 9}" text-anchor="middle" font-size="11" fill="#8fa6cc">${W < 600 ? T.months[m][0].toUpperCase() : T.months[m]}</text>`).join("");
  const cur = S.current, k = cur.length - 1, partial = S.status[k] === "partial";
  const solid = partial ? cur.slice(0, k) : cur;
  const pts = cur.map((v, i) => {
    const st = S.status[i], open = st !== "observed";
    return `<circle cx="${x(i)}" cy="${y(v)}" r="${i === k ? 5 : 4}" fill="${open ? "#071536" : "#eaff28"}" stroke="#eaff28" stroke-width="2"><title>${T.sPt(T.monthsLong[seasonMonths[i]], fmt(v), st === "provisional" ? T.sProv : st === "partial" ? T.sPart : "")}</title></circle>`;
  }).join("");
  const topLabel = `${S.top.season}–${String(S.top.season + 1).slice(2)}`;
  $("season").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${T.season_h}">
    <defs><clipPath id="wipe2"><rect class="wipe" x="0" y="0" width="${state.chartAnim && !REDUCED ? 0 : W}" height="${H}"><animate attributeName="width" from="0" to="${W}" dur="1.8s" begin="indefinite" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".65 0 .35 1"/></rect></clipPath>
      <linearGradient id="bandg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0197f8" stop-opacity=".30"/><stop offset="1" stop-color="#0197f8" stop-opacity=".10"/></linearGradient></defs>
    ${g}
    <path d="${band}" fill="url(#bandg)" stroke="none"/>
    <path d="${line(S.top.cum)}" fill="none" stroke="#ff8a3d" stroke-width="1.6" stroke-dasharray="1.5 3" stroke-linecap="round" opacity=".85"/>
    <path d="${line(S.last)}" fill="none" stroke="#8fa6cc" stroke-width="1.5" opacity=".6"/>
    <path d="${line(S.p50)}" fill="none" stroke="#c9d6ea" stroke-width="2" stroke-dasharray="5 4"/>
    ${S.scenario ? `<path d="${S.scenario.p90.map((v, j) => `${j ? "L" : "M"}${x(S.scenario.from + j).toFixed(1)},${y(v).toFixed(1)}`).join("") + S.scenario.p10.map((v, j, a) => `L${x(S.scenario.from + a.length - 1 - j).toFixed(1)},${y(a[a.length - 1 - j]).toFixed(1)}`).join("")}Z" fill="rgba(234,255,40,.10)" stroke="rgba(234,255,40,.35)" stroke-dasharray="3 3"/>
    <path d="${S.scenario.p50.map((v, j) => `${j ? "L" : "M"}${x(S.scenario.from + j).toFixed(1)},${y(v).toFixed(1)}`).join("")}" fill="none" stroke="#eaff28" stroke-width="1.6" stroke-dasharray="2 4" opacity=".8"/>` : ""}
    <g clip-path="url(#wipe2)">
      <path d="${line(solid)}" fill="none" stroke="#eaff28" stroke-width="3.2" filter="url(#lglow2)"/>
      ${partial && k > 0 ? `<path d="M${x(k - 1)},${y(cur[k - 1])}L${x(k)},${y(cur[k])}" fill="none" stroke="#eaff28" stroke-width="2.4" stroke-dasharray="4 4"/>` : ""}
      ${pts}
    </g>
    <filter id="lglow2" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </svg>`;
  $("season-legend").innerHTML = `<span><i class="sw" style="background:#eaff28;border:0"></i>${T.sCur}</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(90deg,#c9d6ea 0 5px,transparent 5px 8px);border:0;height:3px;vertical-align:3px"></i>${T.sMed}</span>`
    + `<span><i class="sw" style="background:rgba(1,151,248,.3)"></i>${T.sBand}</span>`
    + (S.scenario ? `<span><i class="sw" style="background:rgba(234,255,40,.15);border:1px dashed rgba(234,255,40,.5)"></i>${T.scenLg}</span>` : "")
    + `<span><i class="sw" style="background:#8fa6cc;border:0;height:3px;vertical-align:3px"></i>2025–26</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(90deg,#ff8a3d 0 2px,transparent 2px 5px);border:0;height:3px;vertical-align:3px"></i>${T.sTop(topLabel)}</span>`;
  if (state.chartAnim) armWipe("season", "season-figs");
}

// Plain-language status of the season and a simple "thermometer": where this season stands among past ones.
function renderMeter(S, seasonMonths) {
  const T = L(), k = S.compare_index;
  if (k == null) { $("season-plain").innerHTML = ""; $("season-meter").innerHTML = ""; return; }
  const cur = S.current[k], lo = S.p10[k], med = S.p50[k], hi = S.p90[k];
  const lvl = S.below <= 2 ? "lo" : S.below >= S.n_seasons - 2 ? "hi" : "";
  $("season-plain").innerHTML = T.seasonPlain(shortName(), T.monthsLong[seasonMonths[k]], fmt(cur), fmt(med), fmt(lo), fmt(hi), lvl);
  const W = Math.max(320, Math.min(1100, $("season-meter").clientWidth || 900)), H = 74, pad = 16;
  const top = Math.max(hi, cur) * 1.12, x = (v) => pad + (v / top) * (W - 2 * pad);
  const mk = lvl === "lo" ? "#4db8ff" : lvl === "hi" ? "#ff8a3d" : "#eaff28";
  // The ends of the usual range go above the bar unless the "normal" label is there, then below unless "this season" is.
  const endLabel = (px, txt, anchor) => {
    const dx = anchor === "start" ? 22 : -22, yTop = Math.abs(px + dx - x(med)) > 95 ? 14 : Math.abs(px + dx - x(cur)) > 95 ? 66 : null;
    return yTop == null ? "" : `<text x="${px}" y="${yTop}" text-anchor="${anchor}" font-size="11.5" font-weight="600" fill="#4db8ff">${txt}</text>`;
  };
  $("season-meter").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${T.season_h}">
    <rect x="${pad}" y="26" width="${W - 2 * pad}" height="14" rx="7" fill="#10203d"/>
    <rect x="${x(lo)}" y="26" width="${x(hi) - x(lo)}" height="14" rx="7" fill="rgba(1,151,248,.38)"/>
    <line x1="${x(med)}" x2="${x(med)}" y1="20" y2="46" stroke="#c9d6ea" stroke-width="2" stroke-dasharray="3 2"/>
    <text x="${x(med)}" y="14" text-anchor="middle" font-size="11.5" fill="#c9d6ea">${T.meterLg[1]} · ${fmt(med)}</text>
    <circle cx="${x(cur)}" cy="33" r="10" fill="${mk}" stroke="#071536" stroke-width="2" style="filter:drop-shadow(0 0 8px ${mk})"/>
    <text x="${x(cur)}" y="66" text-anchor="middle" font-size="12.5" font-weight="600" fill="${mk}">${T.meterLg[2]} · ${fmt(cur)}</text>
    ${endLabel(x(lo), fmt(lo), "start")}${endLabel(x(hi), fmt(hi), "end")}
  </svg><div class="legend"><span><i class="sw" style="background:rgba(1,151,248,.38)"></i>${T.meterLg[0]}</span></div>`;
}

// A literal clock: 12 months on a dial, like 12 hours (January at 1 o'clock, December at 12).
function monthShares(from, to) {
  const by = new Map(state.data.months.map((r) => [r.month, r])), acc = Array(12).fill(0);
  let n = 0;
  for (let s = from; s <= to; s++) {
    const v = [];
    for (let i = 0; i < 12; i++) { const mm = ((6 + i) % 12) + 1, yy = i < 6 ? s : s + 1; const r = by.get(`${yy}-${String(mm).padStart(2, "0")}`); v.push(r && ["observed", "estimated"].includes(r.status) ? r.value : null); }
    if (v.includes(null)) continue;
    const tot = v.reduce((a, b) => a + b, 0);
    if (!tot) continue;
    v.forEach((x, i) => { acc[((6 + i) % 12)] += x / tot; }); n++;
  }
  return n ? acc.map((x) => x / n) : null;
}

function renderDial() {
  const T = L(), then = monthShares(2001, 2011), now = monthShares(2012, 2025);
  if (!then || !now) { $("dial").innerHTML = ""; return; }
  const S = 340, c = S / 2, R = 120, mx = Math.max(...then, ...now);
  const ang = (m) => ((m + 1) / 12) * 2 * Math.PI - Math.PI / 2; // month index 0 = January at 1 o'clock
  const pt = (a, r) => [c + r * Math.cos(a), c + r * Math.sin(a)];
  const wedge = (m, r) => { const a0 = ang(m) - Math.PI / 12 + 0.02, a1 = ang(m) + Math.PI / 12 - 0.02, [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${c},${c}L${x0.toFixed(1)},${y0.toFixed(1)}A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}Z`; };
  const rad = (v) => 14 + Math.sqrt(v / mx) * (R - 14); // area-true
  const pkThen = then.indexOf(Math.max(...then)), pkNow = now.indexOf(Math.max(...now));
  let g = `<circle cx="${c}" cy="${c}" r="${R + 6}" fill="#0c1a35" stroke="rgba(140,180,255,.18)"/>`;
  for (let m = 0; m < 12; m++) {
    g += `<path d="${wedge(m, rad(now[m]))}" fill="${colour(now[m], mx)}" opacity=".95"><title>${T.monthsLong[m]}: ${Math.round(now[m] * 100)}% (${T.dialNow}) · ${Math.round(then[m] * 100)}% (${T.dialThen})</title></path>`
      + `<path d="${wedge(m, rad(then[m]))}" fill="none" stroke="#c9d6ea" stroke-width="1.4" stroke-dasharray="3 3" pointer-events="none"/>`;
    const [tx, ty] = pt(ang(m), R + 22);
    g += `<text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle" font-size="12" fill="${m === pkNow ? "#eaff28" : "#8fa6cc"}" font-weight="${m === pkNow ? 700 : 400}">${T.months[m]}</text>`;
  }
  const hand = (m, len, colr, w, dash) => { const [hx, hy] = pt(ang(m), len); return `<line x1="${c}" y1="${c}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${colr}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`; };
  g += hand(pkThen, R * 0.62, "#c9d6ea", 3, "4 4") + `<g class="hand">${hand(pkNow, R * 0.86, "#eaff28", 5)}</g><circle cx="${c}" cy="${c}" r="7" fill="#eaff28"/>`;
  $("dial").innerHTML = `<svg viewBox="-30 -30 ${S + 60} ${S + 60}" role="img" aria-label="${T.clock_h}"><style>.hand{filter:drop-shadow(0 0 6px #eaff28)}</style>${g}</svg>`;
  const C = state.data.season_clock, v = C ? clockVerdict(C.trend.peak, C.trend_viirs.peak) : "none";
  const a = T.monthsLong[pkThen], b = T.monthsLong[pkNow];
  const tp = C && C.trend.peak;
  $("clock-plain").innerHTML = pkThen !== pkNow
    ? (v === "robust" ? T.clockPlainMoved(a, b) : v === "possible" ? T.clockPlainMaybe(a, b) : T.clockPlainUnclear(a, b))
    : (v === "robust" ? T.clockPlainShift(b, dec(Math.abs(tp.per_decade), 0), tp.per_decade) : T.clockPlainSame(b));
  $("dial-legend").innerHTML = `<span>${T.dialLg[0]}</span><span><i class="sw" style="background:linear-gradient(90deg,${RAMP.join(",")});border:0"></i>${T.dialLg[1]}</span>`
    + `<span><i class="sw" style="border:1.5px dashed #c9d6ea;background:transparent"></i>${T.dialLg[2]}</span><span><i class="sw" style="background:#eaff28;border:0;height:4px;vertical-align:3px"></i>${T.dialLg[3]}</span>`;
}

// ---------- season clock ----------
function clockVerdict(t, tv) {
  if (!t || t.p >= 0.05) return "none";
  return tv && tv.p < 0.05 && Math.sign(tv.per_decade) === Math.sign(t.per_decade) ? "robust" : "possible";
}

function renderClock() {
  const T = L(), C = state.data.season_clock, card = $("clock").closest(".card");
  const desert = DESERT_AOI.includes(state.aoi);
  if (!C || !C.seasons.length) { card.hidden = true; return; }
  card.hidden = false;
  $("clock-sub").textContent = desert ? T.clockDesert : T.clockIntro;
  $("clock-tech").textContent = desert ? "" : T.clockSub;
  if (desert) { $("clock-chips").innerHTML = $("clock").innerHTML = $("clock-legend").innerHTML = $("dial").innerHTML = $("clock-plain").innerHTML = $("dial-legend").innerHTML = ""; return; }
  renderDial();
  const col = { robust: "var(--high)", possible: "var(--ink)", none: "var(--quiet)" };
  $("clock-chips").innerHTML = ["onset", "peak", "end", "length"].map((k) => {
    const t = C.trend[k], v = clockVerdict(t, C.trend_viirs[k]);
    return `<div class="chip">${T.clockMetric[k]}<b style="color:${col[v]}">${v === "none" || !t ? T.clockV.none : T.clockVal(k, t.per_decade)}</b>${t ? `${v === "none" ? "" : T.clockV[v] + "<br>"}${T.clockCI(dec(t.lo, 1), dec(t.hi, 1), dec(t.p, 3))}` : ""}</div>`;
  }).join("");
  const S = C.seasons, W = Math.max(340, Math.min(1100, $("clock").clientWidth || 900)), l = W < 600 ? 40 : 64, r = 14, top = 22, rh = W < 600 ? 10 : 12;
  const H = top + S.length * rh + 8, x = (d) => l + (d / 365) * (W - l - r);
  const maxT = Math.max(...S.map((s) => s.total)), minT = Math.min(...S.map((s) => s.total)) * 0.8;
  const starts = [0, 31, 62, 92, 123, 153, 184, 215, 243, 274, 304, 335], mlab = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
  let g = starts.map((d, i) => `<line x1="${x(d)}" x2="${x(d)}" y1="${top - 4}" y2="${H - 6}" stroke="rgba(140,180,255,.10)"/><text x="${x(d + 15)}" y="12" text-anchor="middle" font-size="10.5" fill="#8fa6cc">${W < 600 ? T.months[mlab[i]][0].toUpperCase() : T.months[mlab[i]]}</text>`).join("");
  S.forEach((s, i) => {
    const y = top + i * rh;
    if (W >= 600 || s.season % 5 === 0) g += `<text x="${l - 6}" y="${y + rh / 2 + 3.5}" text-anchor="end" font-size="10" fill="#8fa6cc">${W < 600 ? String(s.season).slice(2) : `${s.season}–${String(s.season + 1).slice(2)}`}</text>`;
    g += `<rect x="${x(s.onset)}" y="${y + 2}" width="${Math.max(2, x(s.end) - x(s.onset))}" height="${rh - 4}" rx="${(rh - 4) / 2}" fill="${colour(s.total, maxT, minT)}"><title>${s.season}–${String(s.season + 1).slice(2)}</title></rect>`
      + `<circle cx="${x(s.peak)}" cy="${y + rh / 2}" r="${rh / 2 - 1.5}" fill="#eaff28" stroke="#071536" stroke-width="1"/>`;
  });
  const tp = C.trend.peak;
  if (tp && clockVerdict(tp, C.trend_viirs.peak) !== "none") {
    const s0 = S[0].season, s1 = S.at(-1).season, med = (arr) => { const a = [...arr].sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; };
    const b = med(S.map((s) => s.peak - (tp.per_decade / 10) * (s.season - s0)));
    const yAt = (ss) => top + (ss - s0) * rh + rh / 2;
    g += `<line x1="${x(b)}" y1="${yAt(s0)}" x2="${x(b + (tp.per_decade / 10) * (s1 - s0))}" y2="${yAt(s1)}" stroke="#eaff28" stroke-width="2" stroke-dasharray="6 4" opacity=".9"/>`;
  }
  $("clock").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${T.clock_h}">${g}</svg>`;
  $("clock-legend").innerHTML = `<span><i class="sw" style="background:linear-gradient(90deg,${RAMP.join(",")});border:0;border-radius:6px;width:28px"></i>${T.clockLg[0]}</span>`
    + `<span><i class="sw" style="background:#eaff28;border-radius:50%;border:0"></i>${T.clockLg[1]}</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(90deg,#eaff28 0 6px,transparent 6px 10px);border:0;height:3px;vertical-align:3px"></i>${T.clockLg[2]}</span>`
    + `<span>${T.clockMulti}</span>`;
}

// ---------- 2012 jump ----------
function renderJump() {
  const T = L(), S = seasonTotals();
  const ok = state.data.trust.filter((t) => t.validated);
  const fig = (area, unh, h, lo, hi) => `<div>${T.figRaw(area)}${num(unh, 2, "×")}${T.figRawSub}</div>`
    + `<div class="${lo <= 1 && 1 <= hi ? "good" : ""}">${T.figH}${num(h, 2, "×")}${T.figHSub(dec(lo), dec(hi))}</div>`;
  if (ok.length === 1) { const t = ok[0]; $("jump-figs").innerHTML = fig(t.region, t.jump_unharmonized, ...t.jump_harmonized); }
  else if (ok.length > 1) $("jump-figs").innerHTML = fig(T.figAll, CONAF_ALL.unh, CONAF_ALL.h, CONAF_ALL.lo, CONAF_ALL.hi);
  else {
    const tc = state.data.trust.length === 1 && state.data.trust[0].conaf;
    $("jump-figs").innerHTML = tc && tc.verdict !== "few_fires"
      ? fig(state.data.trust[0].region, tc.unh, ...tc.h) + `<div>${T.figConaf(verdictText(tc))}</div>`
      : `<div>${tc ? T.figConaf(verdictText(tc)) : T.figNone}</div>`;
  }
  if (S.length < 4) { $("jump").innerHTML = ""; $("jump-legend").innerHTML = ""; return; }
  const W = Math.max(340, Math.min(1100, $("jump").clientWidth || 900)), H = W < 600 ? 230 : 290, l = W < 600 ? 46 : 58, r = 30, t = 18, b = 34;
  const ymax = Math.max(...S.map((d) => Math.max(d.h, d.raw))) * 1.08;
  const x = (s) => l + ((s - S[0].s) / (S.at(-1).s - S[0].s)) * (W - l - r);
  const y = (v) => t + (1 - v / ymax) * (H - t - b);
  const path = (k) => S.map((d, i) => `${i ? "L" : "M"}${x(d.s).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const nice = Math.pow(10, Math.floor(Math.log10(ymax / 4))), step = [1, 2, 2.5, 5, 10].map((k) => k * nice).find((k) => ymax / k <= 5);
  let gridl = "";
  for (let v = 0; v <= ymax; v += step) gridl += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(140,180,255,.12)"/><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8fa6cc">${fmt(v)}</text>`;
  const every = W < 600 ? 8 : 4;
  const ticks = S.filter((d) => d.s % every === 1).map((d) => `<text x="${x(d.s)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#8fa6cc">${d.s}–${String(d.s + 1).slice(2)}</text>`).join("");
  const x12 = x(2011.6), rawOn = state.mode === "raw";
  $("jump").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${T.jump_h}">
    <defs><filter id="lglow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <clipPath id="wipe"><rect x="0" y="0" width="${state.chartAnim && !REDUCED ? 0 : W}" height="${H}"><animate attributeName="width" from="0" to="${W}" dur="2.2s" begin="indefinite" fill="freeze" calcMode="spline" keySplines=".65 0 .35 1" keyTimes="0;1"/></rect></clipPath>
      <linearGradient id="ov" x1="0" x2="1"><stop offset="0" stop-color="#0197f8" stop-opacity=".18"/><stop offset="1" stop-color="#0197f8" stop-opacity=".04"/></linearGradient></defs>
    <rect x="${x12}" y="${t}" width="${W - r - x12}" height="${H - t - b}" fill="url(#ov)"/>
    ${gridl}${ticks}
    <line x1="${x12}" x2="${x12}" y1="${t}" y2="${H - b}" stroke="#eaff28" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="${x12 + 6}" y="${t + 12}" font-size="11.5" fill="#eaff28" font-weight="600">${W < 600 ? T.chVIIRSshort : T.chVIIRS}</text>
    <g clip-path="url(#wipe)">
    <path d="${path("h")}" fill="none" stroke="#eaff28" stroke-width="${rawOn ? 2.2 : 3}" opacity="${rawOn ? .55 : 1}" filter="url(#lglow)"/>
    <path d="${path("raw")}" fill="none" stroke="${rawOn ? "#c9d6ea" : "#7d93b8"}" stroke-width="${rawOn ? 3 : 2.2}" stroke-dasharray="6 4"/>
    ${S.map((d) => `<circle cx="${x(d.s)}" cy="${y(d.h)}" r="3.2" fill="#eaff28"><title>${T.chTitle(`${d.s}–${String(d.s + 1).slice(2)}`, fmt(d.h), fmt(d.raw))}</title></circle>`).join("")}</g>
  </svg>`;
  if (state.chartAnim) armWipe("jump", "jump-figs");
  $("jump-legend").innerHTML = `<span><i class="sw" style="background:#eaff28;border:0"></i>${T.chLgH}</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(90deg,#7d93b8 0 6px,transparent 6px 9px);border:0"></i>${T.chLgR}</span>`
    + `<span>${T.chLgNote}</span>`;
}

// Draw the chart (and count its figures) the first time it scrolls into view after an area loads.
function armWipe(id, figsId) {
  const card = $(id).closest(".card");
  const go = () => {
    countUp($(figsId));
    const a = $(id).querySelector("clipPath animate");
    if (a && !REDUCED) a.beginElement();
  };
  if (card.classList.contains("in")) { requestAnimationFrame(go); return; }
  card._pending = go;
}

// ---------- is the sensor conversion stable? ----------
function renderK() {
  const T = L(), by = {};
  state.data.months.forEach((r) => {
    if (r.status !== "observed" || !r.raw || r.raw.Aqua == null || r.raw.SNPP == null) return;
    const [yy, mm] = r.month.split("-").map(Number), s = mm >= 7 ? yy : yy - 1;
    if (s < 2012 || s > 2025) return;
    const a = by[s] || (by[s] = [0, 0]); a[0] += r.raw.SNPP; a[1] += r.raw.Aqua;
  });
  const S = Object.entries(by).filter(([, a]) => a[1] >= 20).map(([s, a]) => [+s, a[0] / a[1]]);
  const card = $("kcard");
  if (S.length < 6) { card.hidden = true; return; }
  card.hidden = false;
  const tS = Object.values(by).reduce((a, b) => a + b[0], 0), tA = Object.values(by).reduce((a, b) => a + b[1], 0), pooled = tS / tA;
  const ks = S.map((x) => x[1]);
  $("k-sub").textContent = T.kSub(shortName());
  $("k-plain").innerHTML = T.kPlain(dec(Math.min(...ks), 1), dec(Math.max(...ks), 1), S.length);
  const W = Math.max(340, Math.min(1100, $("kchart").clientWidth || 900)), H = 190, l = 40, r = 12, t = 14, b = 26;
  const ymax = Math.ceil(Math.max(...ks) + 0.5), bw = (W - l - r) / S.length;
  const y = (v) => t + (1 - v / ymax) * (H - t - b);
  let g = "";
  for (let v = 0; v <= ymax; v += ymax > 8 ? 2 : 1) g += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(140,180,255,.10)"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10.5" fill="#8fa6cc">×${v}</text>`;
  S.forEach(([s, k], i) => {
    g += `<rect x="${l + i * bw + 3}" y="${y(k)}" width="${bw - 6}" height="${y(0) - y(k)}" rx="4" fill="#0197f8" opacity=".75"><title>${s}–${String(s + 1).slice(2)}: ×${dec(k, 2)}</title></rect>`
      + (W >= 600 || i % 2 === 0 ? `<text x="${l + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#8fa6cc">${String(s).slice(2)}–${String(s + 1).slice(2)}</text>` : "");
  });
  g += `<line x1="${l}" x2="${W - r}" y1="${y(pooled)}" y2="${y(pooled)}" stroke="#eaff28" stroke-width="2" stroke-dasharray="6 4"/><rect x="${l + 4}" y="${y(pooled) - 22}" width="46" height="18" rx="5" fill="#071536"/><text x="${l + 27}" y="${y(pooled) - 9}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#eaff28">×${dec(pooled, 1)}</text>`;
  $("kchart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${T.kH}">${g}</svg>`;
  $("k-legend").innerHTML = `<span><i class="sw" style="background:#0197f8;border:0"></i>${T.kLg[0]}</span><span><i class="sw" style="background:repeating-linear-gradient(90deg,#eaff28 0 6px,transparent 6px 10px);border:0;height:3px;vertical-align:3px"></i>${T.kLg[1]}</span><span>${T.kNote}</span>`;
}

// ---------- method & trust ----------
function renderMethod() {
  const T = L(), M = state.data.method;
  let txt = T.method.unit;
  if (M.qmap_regions.length) txt += T.method.qmap(M.qmap_regions.join(", "));
  if ((M.pooled_regions || []).length) txt += T.method.pooled(M.pooled_regions.join(", "));
  if (M.ratio_regions.length) txt += T.method.ratio(M.ratio_regions.join(", "), Object.entries(M.factors).map(([n, f]) => `${n}: Aqua × ${dec(f.Aqua.k)}`).join("; "));
  txt += T.method.data;
  $("method").innerHTML = txt;
}

function verdictText(c) {
  const V = L().verdict;
  if (c.verdict === "removed") return `<span class="ok">${V.removed}</span>`;
  if (c.verdict === "few_fires") return `<span style="color:var(--quiet)">${V.few_fires(fmt(c.fires))}</span>`;
  const p = Math.round(c.verdict === "over" ? (1 / c.h[0] - 1) * 100 : (1 - 1 / c.h[0]) * 100);
  return `<span style="color:var(--high)">${c.verdict === "over" ? V.over(p) : V.under(p)}</span>`;
}

function renderTrust() {
  const T = L(), TR = state.data.trust, ok = TR.filter((t) => t.validated), tested = TR.filter((t) => !t.validated);
  const err = (e) => T.errLine(dec(e.typical_factor), fmt(100 / e.typical_factor), fmt(100 * e.typical_factor), T.biasTxt(e.bias_pct), e.coverage80_pct == null ? null : Math.round(e.coverage80_pct));
  let html = "";
  if (ok.length) {
    html += `<div class="tablewrap"><table class="trust"><thead><tr><th>${T.thRegion}</th><th>${T.thJump}</th><th>${T.thAqua}</th><th>${T.thTerra}</th></tr></thead><tbody>`
      + ok.map((t) => `<tr><td><b>${t.region}</b></td><td>${T.raw} ×${dec(t.jump_unharmonized)} → <span class="ok">×${dec(t.jump_harmonized[0])}</span><br><small>${T.ci} ${dec(t.jump_harmonized[1])}–${dec(t.jump_harmonized[2])}</small></td><td>${err(t.Aqua)}</td><td>${err(t.Terra)}</td></tr>`).join("")
      + `</tbody></table></div>`;
    const cov = ok.map((t) => Math.round(t.Aqua.coverage80_pct)), fs = ok.map((t) => t.Aqua.typical_factor), f = fs.length > 1 ? `${dec(Math.min(...fs))}–${dec(Math.max(...fs))}` : dec(fs[0]);
    html += `<p class="sub" style="margin-top:10px">${T.trustNote(f, `${Math.min(...cov)}${cov.length > 1 ? `–${Math.max(...cov)}` : ""}`)}</p>`;
  }
  if (tested.length) {
    html += `<h3 style="font-size:14.5px;margin:14px 0 6px">${T.testedH}</h3><div class="tablewrap"><table class="trust"><thead><tr><th>${T.thRegion}</th><th>${T.thConaf}</th><th>${T.thAqua}</th><th>${T.thTerra}</th></tr></thead><tbody>`
      + tested.map((t) => `<tr><td><b>${t.region}</b><br><small>${T.methodName[t.Aqua.method]}</small></td><td>${t.conaf ? `${T.raw} ×${dec(t.conaf.unh)} → <b>×${dec(t.conaf.h[0])}</b><br><small>${T.ci} ${dec(t.conaf.h[1])}–${dec(t.conaf.h[2])} · ${verdictText(t.conaf)}</small>` : "—"}</td><td>${err(t.Aqua)}</td><td>${err(t.Terra)}</td></tr>`).join("")
      + `</tbody></table></div><p class="sub" style="margin-top:10px">${T.testedNote}</p>`;
  }
  $("trust").innerHTML = html;
}

// ---------- day panel ----------
async function showMonth(key, scroll = true) {
  const T = L(), r = state.data.months.find((m) => m.month === key);
  if (!r) return;
  if (!state.daily[state.aoi]) state.daily[state.aoi] = await (await fetch(DATA(`${state.aoi}_daily.json`))).json();
  const daily = state.daily[state.aoi];
  state.month = key;
  const [y, m] = key.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const max = Math.max(...Object.values(daily));
  let html = T.dows.map((d) => `<div class="dow">${d}</div>`).join("") + "<div></div>".repeat(offset);
  let fireDays = 0, top = [0, null], sum = 0, seen = 0;
  for (let d = 1; d <= n; d++) {
    const k = `${key}-${String(d).padStart(2, "0")}`, v = daily[k];
    let bg, label, dark = false;
    if (v === undefined) { bg = `repeating-linear-gradient(45deg,${NO_DATA} 0 4px,#2a3d63 4px 6px)`; label = T.dayTipNone; }
    else if (v === 0) { bg = "#0c1a35"; label = "0"; seen++; }
    else { bg = colour(v, max); label = fmt(v); fireDays++; sum += v; seen++; if (v > top[0]) top = [v, d]; dark = lev(v, max) > 0.62; }
    html += `<div class="day" style="background:${bg};${dark ? "color:#0a1430" : ""}" title="${k}: ${v === undefined ? T.dayTipNone : T.dayTipHot(label)}"><b>${d}</b>${v === undefined ? "" : label}</div>`;
  }
  $("day-grid").innerHTML = html;
  $("day-title").textContent = T.dayTitle(T.monthsLong[m - 1], y);
  // One plain sentence, then the conversion drawn as "what the satellite saw -> comparable number".
  const src = r.source, sat = T.sat[src] || src, raw = r.raw ? r.raw[src] : null;
  const conv = r.value != null && src !== "SNPP", mo = T.monthsLong[m - 1];
  const thru = r.through ? T.dx.thru(+r.through.slice(8), T.monthsLong[+r.through.slice(5, 7) - 1]) : "";
  const tail = (r.status === "provisional" ? T.dx.prov : "") + (top[1] ? T.dx.top(mo, top[1], fmt(top[0])) : T.dx.none);
  $("day-sub").textContent = r.value == null ? T.dayNone
    : r.status === "partial" ? T.dx.partial(fmt(raw), fmt(r.value), thru) + tail
    : conv ? T.dx.estimated(sat, fmt(raw), fmt(r.value), fmt(r.low), fmt(r.high)) + tail
    : T.dx.observed(fmt(r.value)) + tail;
  const f = conv && raw ? (r.value / raw).toLocaleString(T.locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : null;
  $("day-conv").innerHTML = r.value == null ? "" : conv
    ? `<div class="conv"><div class="cv raw"><small>${T.cv.saw(sat)}</small><b>${fmt(raw)}</b><span>${T.cv.days(fireDays, seen)}</span></div>`
      + `<div class="cv arrow" aria-hidden="true"><span>${T.cv.arrow}</span><i></i>${f ? `<small>${T.cv.factor(f)}</small>` : ""}</div>`
      + `<div class="cv out"><small>${T.cv.out}</small><b>≈ ${fmt(r.value)}</b><span>${T.cv.range(fmt(r.low), fmt(r.high))}</span></div></div>`
    : `<div class="conv one"><div class="cv out"><small>${T.cv.saw(sat)}</small><b>${fmt(r.value)}</b><span>${T.cv.days(fireDays, seen)} · ✓ ${T.cv.direct}</span></div></div>`;
  $("day-cap").textContent = r.value == null ? "" : r.status === "partial" ? T.cap.partial : conv ? T.cap.estimated(sat, fmt(sum)) : T.cap.observed(fmt(sum));
  $("day-legend").innerHTML = `<span><i class="sw" style="background:${colour(10, max)}"></i>${T.dlg[0]}</span>`
    + `<span><i class="sw" style="background:#0c1a35"></i>${T.dlg[1]}</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>${T.dlg[2]}</span>`
    + `<span>${T.dlg[3]}</span>`;
  $("day-panel").hidden = false;
  updateURL();
  if (scroll) $("day-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function downloadCSV() {
  const head = "month,value_snpp_equivalent,low_80,high_80,status,source,methods,anomaly,robust_z,terra_raw,aqua_raw,snpp_raw,noaa20_raw,noaa21_raw";
  const lines = state.data.months.map((r) => [r.month, r.value ?? "", r.low ?? "", r.high ?? "", r.status, r.source ?? "", (r.methods || []).join("+"), r.anomaly ?? "", r.z ?? "",
    r.raw.Terra ?? "", r.raw.Aqua ?? "", r.raw.SNPP ?? "", r.raw.NOAA20 ?? "", r.raw.NOAA21 ?? ""].join(","));
  const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `overlap_${state.aoi}_monthly.csv`; a.click();
  URL.revokeObjectURL(a.href);
}

function render(animate) {
  state.animNext = animate; state.chartAnim = animate;
  renderStatus(); paintMap(); renderSeason(); renderClock(); renderCalendar(animate); renderJump(); renderK(); renderMethod(); renderTrust();
  state.animNext = false; state.chartAnim = false;
}

// The chapter menu marks the section you are reading.
function spyNav() {
  let cur = "ch1";
  ["ch1", "ch2", "ch3", "ch4"].forEach((id) => { const h = $(id); if (h && h.getBoundingClientRect().top < innerHeight * 0.35) cur = id; });
  document.querySelectorAll(".chnav a").forEach((a) => { const on = a.dataset.go === cur; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"); });
}
let spyQueued = false;
addEventListener("scroll", () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(() => { spyQueued = false; spyNav(); }); } }, { passive: true });

// Cards rise into view as you scroll; the cursor lights the card under it.
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in"); io.unobserve(e.target);
  if (e.target._pending) { const f = e.target._pending; e.target._pending = null; f(); }
}), { threshold: 0.12 });
document.querySelectorAll("main > .card:not(.controls)").forEach((c, i) => { c.classList.add("reveal"); c.style.transitionDelay = `${Math.min(i, 2) * 90}ms`; io.observe(c); });
document.addEventListener("pointermove", (e) => {
  const c = e.target.closest && e.target.closest(".card");
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
});

async function init() {
  let cvd = new URLSearchParams(location.search).get("cvd") === "1";
  try { cvd = cvd || localStorage.getItem("overlap-cvd") === "1"; } catch (e) { /* storage blocked */ }
  setPalette(cvd);
  const q = new URLSearchParams(location.search);
  applyStatic();
  state.aois = await (await fetch(DATA("aois.json"))).json();
  if (state.aois.some((a) => a.key === q.get("area"))) state.aoi = q.get("area");
  applyStatic();
  await load();
  if (!state.data) return;
  try { await initMap(); } catch (e) { showError(e); return; }
  spyNav();
  if (q.get("view") === "raw") setMode("raw");
  const m = q.get("m");
  if (m && /^\d{4}-\d{2}$/.test(m) && state.data.months.some((r) => r.month === m)) {
    const i = map.reg.months.indexOf(m);
    if (i >= 0) { map.i = i; $("map-slider").value = i; paintMap(); }
    showMonth(m);
  }
}

$("aoi").addEventListener("change", (e) => selectAoi(e.target.value, false));
$("play").addEventListener("click", togglePlay);
document.querySelectorAll("[data-go]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); $(a.dataset.go).scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }); }));
$("cvd").addEventListener("click", () => { setPalette(!state.cvd); if (state.data) { render(false); updateURL(); } });
$("share").addEventListener("click", copyLink);
$("map-slider").addEventListener("input", (e) => { map.i = +e.target.value; paintMap(); });
document.querySelectorAll("[data-mm]").forEach((b) => b.addEventListener("click", () => { map.mode = b.dataset.mm; paintMap(); }));
$("rows").addEventListener("change", (e) => { state.rows = e.target.value; renderCalendar(true); });
$("mode-h").addEventListener("click", () => setMode("harmonized"));
$("mode-r").addEventListener("click", () => setMode("raw"));
$("csv").addEventListener("click", downloadCSV);
document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (state.data && Math.abs($("calendar").clientWidth - state.lastWidth) > 30) { renderCalendar(false); renderSeason(); renderClock(); renderJump(); renderK(); if (map.geo) { const z = map.zoom, c = map.com_sel; if (map.vert !== ($("map").clientWidth < 620)) buildMap(); if (z) { zoomTo(z, true).then(() => { if (c) zoomToCommune(z, c, true); }); } else flyTo(mapHome(), mapHomeHeight(), true); } } }, 150); });
init();
