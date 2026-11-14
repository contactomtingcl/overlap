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
    title: "Overlap · two satellites, <em>one honest</em> burning calendar",
    tag: "25 years of NASA FIRMS fire hotspots from MODIS (coarse pixels, since 2000) and VIIRS (fine pixels, since 2012), harmonized into one comparable series for Chile. Every estimate shows how much to trust it.",
    controls: "Controls", area: "Area", rows: "Rows", opt_season: "Fire season (Jul–Jun)", opt_year: "Calendar year (Jan–Dec)",
    mode_h: "Harmonized", mode_r: "Raw (no harmonization)", csv: "Download CSV",
    cal_h: "Burning activity calendar",
    map_h: "Chile, region by region", mm_z: "Anomaly", mm_v: "Hotspots",
    map_sub: "Each region against its own normal for that month (robust z on the harmonized series). Press ▶ to watch 26 years of fire seasons; click a region to open it.",
    north: "◂ North (Arica)", south: "South (Magallanes) ▸",
    mlgZ: ["much lower than normal", "normal", "much higher than normal"], mlgV: (m) => `0 – ${m} hotspots / month (log)`, mlgNo: "no data or withheld",
    mTip: (v, z) => `${v} hotspots${z == null ? "" : ` · robust z = ${z}`}`,
    season_h: "This season so far vs every past season",
    seasonSub: (area) => `${area}, fire season 2026–27 (July to June): hotspots added up month by month, in Suomi NPP-equivalent units, on a log scale. The band holds 8 of every 10 past seasons (2001–02 to 2025–26).`,
    seasonExcl: (l) => ` Atacama desert regions (${l}) are left out of both sides, because their recent near real-time data are withheld.`,
    sThrough: (mo) => `Through ${mo}`, sThroughSub: "hotspots so far this season",
    sVs: "Compared with the median past season", sVsSub: (b, n) => `higher than ${b} of ${n} past seasons at this point`,
    sCur: "Season 2026–27 (open dots: provisional; dashed: November in progress)", sMed: "median of past seasons", sBand: "10th–90th percentile of past seasons",
    sTop: (s) => `${s} (most active)`, sPt: (mo, v, st) => `${mo}: ${v} hotspots so far${st}`, sProv: " (provisional)", sPart: " (partial, through Nov 7)",
    jump_h: "The 2012 jump, before and after",
    jump_sub: "When VIIRS arrives in 2012 it sees many more small fires than MODIS. Joined as they are, the record seems to explode overnight. Harmonized, every year speaks the same unit.",
    trust_h: "How much to trust these numbers",
    trust_sub: "Joining two sensors is never exact. We measured the error on years the model never saw (2020–2026) and against 76,002 CONAF fire records (2002–2020).",
    read_h: "How to read this",
    read_nodetect: "<b>No detection is not the same as no fire.</b> Each polar satellite sees a place only about twice a day, and clouds, smoke and satellite gaps hide fires. Hatched cells mean the record could not be built for that month, not zero fire.",
    read_notfire: "<b>Hotspots are not fires.</b> One large fire produces many hotspots; small agricultural or short-lived burns may produce none.",
    read_wip: "Work in progress (NASA Space Apps Challenge 2026). Harmonization v1: quantile mapping validated against CONAF in Maule, Ñuble, Biobío and La Araucanía; a pooled quantile map, tested on hidden years, in nine other regions; a simple ratio in Los Ríos, Los Lagos and Aysén.",
    footer: "Data: NASA FIRMS (MODIS Collection 6.1, VIIRS Collection 2); CONAF fire records (CC BY 4.0); BCN commune boundaries. We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (<a href=\"https://earthdata.nasa.gov/firms\">earthdata.nasa.gov/firms</a>), part of NASA's Earth Science Data and Information System (ESDIS). Code: <a href=\"https://github.com/contactomtingcl/overlap\">github.com/contactomtingcl/overlap</a>.",
    aoi: { chile: "Chile (whole country)", biobio_hist: "Biobío + Ñuble (historical Biobío region, CONAF validation area)" },
    aoiShort: { chile: "Chile", biobio_hist: "Biobío + Ñuble" },
    level: { "unusually high": "unusually high", "unusually low": "unusually low", "within normal": "within normal" },
    headline: (mo, y, area, lvl) => `${mo} ${y} in ${area}: ${lvl} burning activity`,
    kicker: (prov) => `Latest complete month${prov ? " · provisional, near real-time data" : ""}`,
    statusSub: (prov, mo) => (prov ? "It may change slightly when science-quality data arrives; November 2026 is still in progress. " : "") + `Unusual = more than 2 robust deviations from the ${mo} median on a log scale.`,
    kThis: "This month", kThisSub: "hotspots, Suomi NPP-equivalent",
    kNormal: (mo) => `Normal for ${mo}`, kNormalSub: "median, seasons 2000–01 to 2025–26",
    kAgainst: (n, mo) => `Against ${n} previous ${mo}s`, kAgainstSub: (b, n, z) => `higher than ${b} of ${n} · robust z = ${z}`,
    kTop: "Most active season", kTopSub: (v) => `${v} hotspots (Jul–Jun)`,
    calSub: (area) => `${area}. Colour = hotspots per month in Suomi NPP-equivalent units (brighter = more). Hover a month for its range; click it to see its days.`,
    calSubRaw: "<b>Raw view:</b> each sensor's own count, joined as they are. Notice how activity seems to jump when VIIRS starts in 2012: that jump is the sensor, not the fire.",
    lgRamp: (max) => `${max} hotspots / month (log)`, lgNoData: "no data (not zero)", lgProv: "provisional (near real-time)",
    lgModis: "estimated from MODIS (coarse pixels)", lgViirs: "observed by VIIRS (fine pixels)", lgEra: "VIIRS era begins (2012)",
    srcModis: (s) => `MODIS ${s}`, srcViirs: "VIIRS", srcNoaa: "NOAA-20",
    tipWithheld: "Withheld: near real-time data over the Atacama desert holds many daytime false detections. Shown when science-quality data arrives.",
    tipNoData: "No satellite record for this month (not zero fire).",
    tipValue: (v) => `${v} hotspots, harmonized (Suomi NPP-equivalent)`,
    tipRaw: (sen, v) => `Raw ${sen}: ${v}`, tipRange: (a, b) => `80% range: ${a}–${b}`,
    tipMethod: "Method", methodName: { qmap: "quantile mapping, validated against CONAF", qmap_pooled: "pooled quantile map, tested on hidden years", ratio: "simple ratio, tested on hidden years", mixed: "mixed (summed regions)" },
    tipProv: "Provisional: near real-time Suomi NPP data, final values arrive later",
    tipPartial: (d) => `Partial month: data through ${d}, from NOAA-20 (Suomi NPP stopped on Nov 2, 2026)`,
    tipObs: "Observed by VIIRS Suomi NPP", tipMedian: (mo, v) => `Median for ${mo}: ${v}`,
    tipAnom: { "unusually high": "Unusually high", "unusually low": "Unusually low", "within normal": "Within normal" },
    robustZ: "robust z",
    noteDesert: "Atacama desert regions withheld for this month",
    figRaw: (area) => `False jump at 2012, ${area}, vs CONAF fire records`, figRawSub: "raw, joined as they are",
    figH: "After harmonization", figHSub: (lo, hi) => `95% CI ${lo}–${hi} (1 = no jump)`,
    figAll: "Maule to La Araucanía", figNone: "This area has not been checked against CONAF fire records; the harmonization here was tested on hidden years 2020–2026 (see the trust table).",
    chVIIRS: "VIIRS starts · overlap 2012–2026", chVIIRSshort: "VIIRS starts",
    chTitle: (s, h, r) => `${s}: harmonized ${h}, raw ${r}`,
    chLgH: "harmonized (one unit for all years)", chLgR: "raw: MODIS before 2012, VIIRS after", chLgNote: "Hotspots per fire season (Jul–Jun), complete seasons only.",
    thRegion: "Region", thJump: "False jump at 2012 vs CONAF<br>(1 = no jump)", thAqua: "MODIS Aqua years<br>2002–2012", thTerra: "MODIS Terra years<br>2000–2002", thMethod: "Method",
    raw: "raw", ci: "95% CI",
    errLine: (f, b, c) => `typical monthly error ×${f}<br><small>total bias ${b}${c == null ? "" : ` · 80% band held ${c}% of months`}</small>`,
    testedH: "Other regions: tested on hidden years 2020–2026, not checked against CONAF",
    testedNote: "The pooled map was fitted on Maule, Ñuble, Biobío and La Araucanía together and tested in regions it never saw; where it lost to the region's own simple ratio, the ratio is used. Errors are larger than in the calibrated regions, so treat the years before 2012 as indicative.",
    trustNote: (f, cov) => `A typical error of ×${f} means the harmonized value is usually within a factor of ${f} of what Suomi NPP would have recorded. The 80% band on estimated months should contain 8 of 10 months; for MODIS Aqua on the hidden years it held ${cov}%, slightly fewer than promised.`,
    method: {
      unit: "All values are expressed as hotspots that VIIRS Suomi NPP would record (one satellite, never a sum of satellites). Before Suomi NPP (2012), MODIS counts are mapped to that unit. ",
      qmap: (r) => `<b>${r}:</b> quantile mapping fitted where both sensors observed (2012–2026), tested on hidden years 2020–2026 and checked against CONAF fire records 2002–2020. Maule, Ñuble, Biobío and La Araucanía together: unharmonized, the series jumps ×4.7 at 2012 relative to real fire activity; harmonized, ×0.89 (95% interval includes 1, no jump). `,
      pooled: (r) => `<b>${r}:</b> one quantile map fitted on Maule, Ñuble, Biobío and La Araucanía together, applied region by region (never to a national total) and tested on hidden years in each region. `,
      ratio: (r, f) => `<b>${r}:</b> simple ratio between sensors (${f}), because the pooled map did worse there on hidden years. `,
      data: "Only science-quality FIRMS data, presumed vegetation fires (volcanoes, mining and industry removed), low-confidence detections removed. Regions use the BCN commune boundaries (referential, not official limits).",
    },
    dayTitle: (mo, y) => `${mo} ${y}, day by day`,
    dayNone: "No satellite record for this month.",
    dayStatus: { estimated: (s) => `estimated from ${s}`, provisional: "provisional, near real-time data", partial: "partial month", no_data: "no record", observed: "observed by VIIRS Suomi NPP" },
    daySub: (v, st, fd, n, top) => `${v} hotspots this month (${st}). Hotspots on ${fd} of ${n} days${top ? `; busiest day: ${top}` : ""}.`,
    dayTop: (mo, d, v) => `${mo} ${d} with ${v}`,
    dayRaw: (s) => ` Daily values are raw ${s} detections; only the monthly total is harmonized.`,
    dlg: ["hotspots detected (brighter = more)", "observed, no hotspots", "no satellite record", "A day without hotspots can still hide fire under clouds or smoke."],
    dayTipNone: "no satellite record", dayTipHot: (v) => `${v} hotspots`,
    sources: { SNPP: "VIIRS Suomi NPP (observed)", NOAA20: "VIIRS NOAA-20 (scaled)", Aqua: "MODIS Aqua (scaled)", Terra: "MODIS Terra, morning orbit (scaled)" },
  },
  es: {
    locale: "es-CL",
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    monthsLong: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    dows: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
    logo_alt: "Logo de Overlap: una franja de píxeles gruesos y otra de puntos finos que se cruzan en un cuadrado luminoso",
    title: "Overlap · dos satélites, <em>un solo calendario</em> honesto de quemas",
    tag: "25 años de focos de calor de NASA FIRMS, de MODIS (píxeles gruesos, desde 2000) y VIIRS (píxeles finos, desde 2012), armonizados en una sola serie comparable para Chile. Cada estimación muestra cuánto confiar en ella.",
    controls: "Controles", area: "Área", rows: "Filas", opt_season: "Temporada de incendios (jul–jun)", opt_year: "Año calendario (ene–dic)",
    mode_h: "Armonizado", mode_r: "Crudo (sin armonizar)", csv: "Descargar CSV",
    cal_h: "Calendario de actividad de quemas",
    map_h: "Chile, región por región", mm_z: "Anomalía", mm_v: "Focos de calor",
    map_sub: "Cada región frente a su propio normal para ese mes (z robusto sobre la serie armonizada). Presiona ▶ para ver 26 años de temporadas de incendios; haz clic en una región para abrirla.",
    north: "◂ Norte (Arica)", south: "Sur (Magallanes) ▸",
    mlgZ: ["mucho menor que lo normal", "normal", "mucho mayor que lo normal"], mlgV: (m) => `0 – ${m} focos / mes (log)`, mlgNo: "sin datos o retenido",
    mTip: (v, z) => `${v} focos de calor${z == null ? "" : ` · z robusto = ${z}`}`,
    season_h: "Esta temporada hasta ahora frente a todas las anteriores",
    seasonSub: (area) => `${area}, temporada de incendios 2026–27 (julio a junio): focos de calor acumulados mes a mes, en unidades equivalentes a Suomi NPP, en escala logarítmica. La franja contiene 8 de cada 10 temporadas anteriores (2001–02 a 2025–26).`,
    seasonExcl: (l) => ` Las regiones del desierto de Atacama (${l}) quedan fuera de ambos lados, porque sus datos recientes casi en tiempo real están retenidos.`,
    sThrough: (mo) => `Hasta ${mo}`, sThroughSub: "focos de calor acumulados en la temporada",
    sVs: "Frente a la temporada mediana", sVsSub: (b, n) => `mayor que ${b} de ${n} temporadas anteriores a esta altura`,
    sCur: "Temporada 2026–27 (puntos huecos: provisorio; punteado: noviembre en curso)", sMed: "mediana de las temporadas anteriores", sBand: "percentil 10–90 de las temporadas anteriores",
    sTop: (s) => `${s} (la más activa)`, sPt: (mo, v, st) => `${mo}: ${v} focos acumulados${st}`, sProv: " (provisorio)", sPart: " (parcial, hasta el 7 de noviembre)",
    jump_h: "El salto de 2012, antes y después",
    jump_sub: "Cuando VIIRS llega en 2012 ve muchos más fuegos pequeños que MODIS. Unidas tal cual, las series parecen dispararse de un día para otro. Armonizadas, todos los años quedan en la misma unidad.",
    trust_h: "Cuánto confiar en estas cifras",
    trust_sub: "Unir dos sensores nunca es exacto. Medimos el error en años que el modelo nunca vio (2020–2026) y contra 76.002 registros de incendios de CONAF (2002–2020).",
    read_h: "Cómo leer esto",
    read_nodetect: "<b>Sin detección no es lo mismo que sin fuego.</b> Cada satélite polar ve un lugar solo unas dos veces al día, y las nubes, el humo y los vacíos de cobertura ocultan fuegos. Las celdas achuradas indican que no se pudo construir el registro de ese mes, no que no hubo fuego.",
    read_notfire: "<b>Un foco de calor no es un incendio.</b> Un incendio grande produce muchos focos; quemas agrícolas pequeñas o breves pueden no producir ninguno.",
    read_wip: "Trabajo en curso (NASA Space Apps Challenge 2026). Armonización v1: mapeo de cuantiles validado contra CONAF en Maule, Ñuble, Biobío y La Araucanía; un mapa de cuantiles agrupado, probado en años reservados, en otras nueve regiones; una razón simple en Los Ríos, Los Lagos y Aysén.",
    footer: "Datos: NASA FIRMS (MODIS Colección 6.1, VIIRS Colección 2); registros de incendios de CONAF (CC BY 4.0); límites comunales de la BCN. Agradecemos el uso de datos o imágenes del Fire Information for Resource Management System (FIRMS) de la NASA (<a href=\"https://earthdata.nasa.gov/firms\">earthdata.nasa.gov/firms</a>), parte del Earth Science Data and Information System (ESDIS) de la NASA. Código: <a href=\"https://github.com/contactomtingcl/overlap\">github.com/contactomtingcl/overlap</a>.",
    aoi: { chile: "Chile (todo el país)", biobio_hist: "Biobío + Ñuble (antigua Región del Biobío, área validada con CONAF)" },
    aoiShort: { chile: "Chile", biobio_hist: "Biobío + Ñuble" },
    level: { "unusually high": "inusualmente alta", "unusually low": "inusualmente baja", "within normal": "dentro de lo normal" },
    headline: (mo, y, area, lvl) => `${mo[0].toUpperCase() + mo.slice(1)} de ${y} en ${area}: actividad de quemas ${lvl}`,
    kicker: (prov) => `Último mes completo${prov ? " · provisorio, datos casi en tiempo real" : ""}`,
    statusSub: (prov, mo) => (prov ? "Puede cambiar levemente cuando lleguen los datos definitivos; noviembre de 2026 sigue en curso. " : "") + `Inusual = más de 2 desviaciones robustas respecto de la mediana de ${mo}, en escala logarítmica.`,
    kThis: "Este mes", kThisSub: "focos de calor, equivalentes a Suomi NPP",
    kNormal: (mo) => `Lo normal para ${mo}`, kNormalSub: "mediana, temporadas 2000–01 a 2025–26",
    kAgainst: (n, mo) => `Frente a los ${n} meses de ${mo} anteriores`, kAgainstSub: (b, n, z) => `mayor que ${b} de ${n} · z robusto = ${z}`,
    kTop: "Temporada más activa", kTopSub: (v) => `${v} focos de calor (jul–jun)`,
    calSub: (area) => `${area}. Color = focos de calor por mes en unidades equivalentes a Suomi NPP (más brillante = más focos). Pasa el cursor sobre un mes para ver su rango; haz clic para ver sus días.`,
    calSubRaw: "<b>Vista cruda:</b> el conteo propio de cada sensor, unido tal cual. Fíjate cómo la actividad parece saltar cuando empieza VIIRS en 2012: ese salto es del sensor, no del fuego.",
    lgRamp: (max) => `${max} focos / mes (log)`, lgNoData: "sin datos (no es cero)", lgProv: "provisorio (casi en tiempo real)",
    lgModis: "estimado desde MODIS (píxeles gruesos)", lgViirs: "observado por VIIRS (píxeles finos)", lgEra: "comienza la era VIIRS (2012)",
    srcModis: (s) => `MODIS ${s}`, srcViirs: "VIIRS", srcNoaa: "NOAA-20",
    tipWithheld: "Retenido: los datos casi en tiempo real sobre el desierto de Atacama tienen muchas detecciones falsas diurnas. Se mostrará cuando lleguen los datos definitivos.",
    tipNoData: "Sin registro satelital para este mes (no significa cero fuego).",
    tipValue: (v) => `${v} focos de calor, armonizado (equivalente a Suomi NPP)`,
    tipRaw: (sen, v) => `${sen} crudo: ${v}`, tipRange: (a, b) => `Rango 80 %: ${a}–${b}`,
    tipMethod: "Método", methodName: { qmap: "mapeo de cuantiles, validado contra CONAF", qmap_pooled: "mapa de cuantiles agrupado, probado en años reservados", ratio: "razón simple, probada en años reservados", mixed: "mixto (suma de regiones)" },
    tipProv: "Provisorio: datos Suomi NPP casi en tiempo real; los valores definitivos llegan después",
    tipPartial: (d) => `Mes parcial: datos hasta el ${d}, de NOAA-20 (Suomi NPP dejó de entregar datos el 2 de noviembre de 2026)`,
    tipObs: "Observado por VIIRS Suomi NPP", tipMedian: (mo, v) => `Mediana de ${mo}: ${v}`,
    tipAnom: { "unusually high": "Inusualmente alto", "unusually low": "Inusualmente bajo", "within normal": "Dentro de lo normal" },
    robustZ: "z robusto",
    noteDesert: "Regiones del desierto de Atacama retenidas este mes",
    figRaw: (area) => `Salto falso en 2012, ${area}, frente a los registros de CONAF`, figRawSub: "crudo, unido tal cual",
    figH: "Después de armonizar", figHSub: (lo, hi) => `IC 95 % ${lo}–${hi} (1 = sin salto)`,
    figAll: "Maule a La Araucanía", figNone: "Esta área no se ha contrastado con los registros de CONAF; la armonización aquí se probó en los años reservados 2020–2026 (ver la tabla de confianza).",
    chVIIRS: "Empieza VIIRS · traslape 2012–2026", chVIIRSshort: "Empieza VIIRS",
    chTitle: (s, h, r) => `${s}: armonizado ${h}, crudo ${r}`,
    chLgH: "armonizado (una sola unidad para todos los años)", chLgR: "crudo: MODIS antes de 2012, VIIRS después", chLgNote: "Focos de calor por temporada de incendios (jul–jun), solo temporadas completas.",
    thRegion: "Región", thJump: "Salto falso en 2012 frente a CONAF<br>(1 = sin salto)", thAqua: "Años de MODIS Aqua<br>2002–2012", thTerra: "Años de MODIS Terra<br>2000–2002", thMethod: "Método",
    raw: "crudo", ci: "IC 95 %",
    errLine: (f, b, c) => `error mensual típico ×${f}<br><small>sesgo total ${b}${c == null ? "" : ` · la banda 80 % contuvo el ${c} % de los meses`}</small>`,
    testedH: "Otras regiones: probadas en los años reservados 2020–2026, sin contraste con CONAF",
    testedNote: "El mapa agrupado se ajustó con Maule, Ñuble, Biobío y La Araucanía juntas y se probó en regiones que nunca vio; donde perdió frente a la razón simple propia de la región, se usa la razón. Los errores son mayores que en las regiones calibradas, así que los años anteriores a 2012 son referenciales.",
    trustNote: (f, cov) => `Un error típico de ×${f} significa que el valor armonizado suele estar dentro de un factor ${f} de lo que habría registrado Suomi NPP. La banda 80 % de los meses estimados debería contener 8 de cada 10 meses; para MODIS Aqua en los años reservados contuvo el ${cov} %, algo menos de lo prometido.`,
    method: {
      unit: "Todos los valores se expresan como los focos de calor que registraría VIIRS Suomi NPP (un solo satélite, nunca una suma de satélites). Antes de Suomi NPP (2012), los conteos de MODIS se llevan a esa unidad. ",
      qmap: (r) => `<b>${r}:</b> mapeo de cuantiles ajustado donde ambos sensores observaron (2012–2026), probado en los años reservados 2020–2026 y contrastado con los registros de incendios de CONAF 2002–2020. Maule, Ñuble, Biobío y La Araucanía juntas: sin armonizar, la serie salta ×4,7 en 2012 respecto de la actividad real de fuego; armonizada, ×0,89 (el intervalo de 95 % incluye 1: sin salto). `,
      pooled: (r) => `<b>${r}:</b> un solo mapa de cuantiles ajustado con Maule, Ñuble, Biobío y La Araucanía juntas, aplicado región por región (nunca a un total nacional) y probado en los años reservados de cada región. `,
      ratio: (r, f) => `<b>${r}:</b> razón simple entre sensores (${f}), porque allí el mapa agrupado tuvo peor desempeño en los años reservados. `,
      data: "Solo datos FIRMS de calidad científica, fuegos presuntos de vegetación (se excluyen volcanes, minería e industria) y sin detecciones de baja confianza. Las regiones usan los límites comunales de la BCN (referenciales, no oficiales).",
    },
    dayTitle: (mo, y) => `${mo[0].toUpperCase() + mo.slice(1)} de ${y}, día a día`,
    dayNone: "Sin registro satelital para este mes.",
    dayStatus: { estimated: (s) => `estimado desde ${s}`, provisional: "provisorio, datos casi en tiempo real", partial: "mes parcial", no_data: "sin registro", observed: "observado por VIIRS Suomi NPP" },
    daySub: (v, st, fd, n, top) => `${v} focos de calor este mes (${st}). Hubo focos en ${fd} de ${n} días${top ? `; día con más focos: ${top}` : ""}.`,
    dayTop: (mo, d, v) => `${d} de ${mo}, con ${v}`,
    dayRaw: (s) => ` Los valores diarios son detecciones crudas de ${s}; solo el total mensual está armonizado.`,
    dlg: ["focos detectados (más brillante = más)", "observado, sin focos", "sin registro satelital", "Un día sin focos igual puede ocultar fuego bajo nubes o humo."],
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
const RAMP = ["#152a42", "#173f6c", "#0b5fae", "#0197f8", "#25c1d8", "#7fe08a", "#d6f53a", "#f7ffbf"];
const NO_DATA = "#0f1d38";
const LEVEL_COLOUR = { "unusually high": "var(--high)", "unusually low": "var(--low)", "within normal": "var(--normal)" };
// Four-region CONAF check (pipeline/10, results/validation_conaf/jump_at_2012_vs_conaf.csv)
const CONAF_ALL = { unh: 4.7, h: 0.89, lo: 0.77, hi: 1.07 };

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
  const res = await fetch(DATA(`${state.aoi}.json`));
  state.data = await res.json();
  state.max = Math.max(...state.data.months.map((r) => r.value).filter((v) => v != null));
  render(true);
}

// ---------- static text ----------
function applyStatic() {
  document.documentElement.lang = state.lang;
  document.title = state.lang === "es" ? "Overlap · Calendario armonizado de actividad de quemas" : "Overlap · Harmonized burning activity calendar";
  document.querySelectorAll("[data-i18n]").forEach((el) => { const v = L()[el.dataset.i18n]; if (typeof v === "string") el.innerHTML = v; });
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => { el.alt = L()[el.dataset.i18nAlt]; });
  document.querySelectorAll("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", L()[el.dataset.i18nLabel]); });
  document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
  if (state.aois.length) $("aoi").innerHTML = state.aois.map((a) => `<option value="${a.key}"${a.key === state.aoi ? " selected" : ""}>${aoiName(a.key, a.name)}</option>`).join("");
}

function setLang(lang) {
  state.lang = lang;
  try { localStorage.setItem("overlap-lang", lang); } catch (e) { /* storage blocked */ }
  const u = new URL(location.href); u.searchParams.set("lang", lang); history.replaceState(null, "", u);
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
  return colour(shown(r), state.max) || "url(#hatch)";
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
  $("legend").innerHTML = `<span class="ramp">0 <i style="background:linear-gradient(90deg,${stops})"></i> ${T.lgRamp(fmt(state.max))}</span>`
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
    html += `${T.tipValue(fmt(r.value))}<br>`;
    if (r.status === "estimated") html += `${T.tipRaw(r.source === "Terra" ? "MODIS Terra" : "MODIS Aqua", fmt(rawValue(r)))}<br>${T.tipRange(fmt(r.low), fmt(r.high))}<br>${T.tipMethod}: ${methodLabel(r.methods)}<br>`;
    else if (r.status === "provisional") html += `${T.tipProv}<br>`;
    else if (r.status === "partial") html += `${T.tipPartial(r.through)}<br>`;
    else html += `${T.tipObs}<br>`;
    html += T.tipMedian(T.monthsLong[+m - 1], fmt(state.data.climatology_median[+m]));
    if (r.anomaly) html += `<br>${T.tipAnom[r.anomaly]} (${T.robustZ} = ${dec(r.z)})`;
    if (r.note) html += `<br>${T.noteDesert}`;
  }
  const t = $("tip");
  t.innerHTML = html; t.style.display = "block";
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
  const same = d.months.filter((r) => r.month.endsWith(`-${m}`) && r.month !== Lt.month && r.value != null && (r.status === "observed" || r.status === "estimated")).map((r) => r.value);
  const below = same.filter((v) => v < Lt.value).length;
  const an = Lt.anomaly || "within normal";
  const prov = Lt.status === "provisional";
  $("status-kicker").innerHTML = `<span class="live"></span>${T.kicker(prov)}`;
  $("headline").innerHTML = T.headline(mo, y, shortName(), `<span class="lvl" style="color:${LEVEL_COLOUR[an]}">${T.level[an]}</span>`);
  $("status-sub").textContent = T.statusSub(prov, mo);
  const top = seasonTotals().sort((a, b) => b.h - a.h)[0];
  const pos = Math.max(0, Math.min(100, 50 + (Lt.z / 4) * 50));
  $("status").innerHTML = `
    <div class="kpi"><small>${T.kThis}</small>${num(Lt.value)}<small>${T.kThisSub}</small></div>
    <div class="kpi"><small>${T.kNormal(mo)}</small>${num(Lt.median)}<small>${T.kNormalSub}</small></div>
    <div class="kpi"><small>${T.kAgainst(same.length, mo)}</small><div class="gauge"><i style="left:${state.animNext ? 50 : pos}%" data-pos="${pos}"></i></div><small>${T.kAgainstSub(below, same.length, dec(Lt.z))}</small></div>
    ${top ? `<div class="kpi"><small>${T.kTop}</small><b>${top.s}–${String(top.s + 1).slice(2)}</b><small>${T.kTopSub(fmt(top.h))}</small></div>` : ""}`;
  if (state.animNext) {
    countUp($("status"));
    requestAnimationFrame(() => requestAnimationFrame(() => { const g = $("status").querySelector(".gauge i"); if (g) g.style.left = g.dataset.pos + "%"; }));
  }
}

// ---------- map of Chile ----------
// Diverging scale for the robust z: blue below normal, dark at normal, orange to gold above.
const ZSTOPS = [[-3, "#3d9bff"], [-1.5, "#1f4f8a"], [0, "#17284c"], [1.5, "#9a4f2c"], [3, "#ff8a3d"], [4.5, "#ffe08a"]].map(([z, c]) => [z, hex2rgb(c)]);
function zcol(z) {
  if (z == null) return "url(#mhatch)";
  z = Math.max(-3, Math.min(4.5, z));
  let i = 0; while (i < ZSTOPS.length - 2 && z > ZSTOPS[i + 1][0]) i++;
  const [z0, a] = ZSTOPS[i], [z1, b] = ZSTOPS[i + 1], f = (z - z0) / (z1 - z0);
  return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * f)).join(",")})`;
}
const map = { geo: null, reg: null, i: 0, mode: "z", timer: null, vmax: 1 };

async function initMap() {
  [map.geo, map.reg] = await Promise.all([fetch(DATA("geo/regions_svg.json")).then((r) => r.json()), fetch(DATA("regions_monthly.json")).then((r) => r.json())]);
  map.vmax = Math.max(...Object.values(map.reg.regions).flatMap((r) => r.v.filter((x) => x != null)));
  const M = map.reg.months;
  map.i = M.lastIndexOf("2026-10");
  $("map-slider").max = M.length - 1; $("map-slider").value = map.i;
  const w = map.geo.width;
  $("map").innerHTML = `<svg viewBox="0 0 1000 ${w}" role="img">
    <defs><pattern id="mhatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${NO_DATA}"/><line x1="0" y1="0" x2="0" y2="4" stroke="#2a3d63" stroke-width="1.5"/></pattern></defs>
    <g transform="translate(0,${w}) rotate(-90)">${Object.entries(map.geo.regions).map(([k, d]) => `<path class="reg" data-r="${k}" d="${d}"/>`).join("")}</g></svg>`;
  $("map").querySelectorAll(".reg").forEach((el) => {
    el.addEventListener("mousemove", (e) => mapTip(e, el.dataset.r));
    el.addEventListener("mouseleave", () => { $("tip").style.display = "none"; });
    el.addEventListener("click", () => { $("tip").style.display = "none"; selectAoi(`r${el.dataset.r}`); });
  });
  paintMap();
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
  const grad = (stops) => `linear-gradient(90deg,${stops.join(",")})`;
  $("map-legend").innerHTML = (map.mode === "z"
    ? `<span class="ramp">${T.mlgZ[0]} <i style="background:${grad(["#3d9bff", "#1f4f8a", "#17284c", "#9a4f2c", "#ff8a3d", "#ffe08a"])}"></i> ${T.mlgZ[2]}</span>`
    : `<span class="ramp"><i style="background:${grad(RAMP)}"></i> ${T.mlgV(fmt(map.vmax))}</span>`)
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>${T.mlgNo}</span>`;
  document.querySelectorAll("[data-mm]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mm === map.mode));
}

function mapTip(e, r) {
  const T = L(), R = map.reg.regions[r], mo = map.reg.months[map.i], [y, m] = mo.split("-");
  const v = R.v[map.i], z = R.z[map.i];
  $("tip").innerHTML = `<b>${R.name}</b><br>${T.monthsLong[+m - 1]} ${y}<br>${v == null ? T.mlgNo : T.mTip(fmt(v), z == null ? null : dec(z))}`;
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

function selectAoi(key) {
  state.aoi = key; $("aoi").value = key; $("day-panel").hidden = true; load();
  document.querySelector(".headline").closest(".card").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
}

// ---------- this season vs past seasons ----------
function renderSeason() {
  const T = L(), S = state.data.season_to_date, card = $("season").closest(".card");
  if (!S || !S.current.length) { card.hidden = true; return; }
  card.hidden = false;
  const seasonMonths = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
  $("season-sub").textContent = T.seasonSub(shortName()) + (S.excluded.length ? T.seasonExcl(S.excluded.join(", ")) : "");
  if (S.compare_index != null) {
    const k = S.compare_index, r = S.ratio_to_median, b = S.below, n = S.n_seasons;
    const col = b <= 2 ? "var(--low)" : b >= n - 2 ? "var(--high)" : "var(--ink)";
    $("season-figs").innerHTML = `<div>${T.sThrough(T.monthsLong[seasonMonths[k]])}${num(S.current[k])}${T.sThroughSub}</div>`
      + (r == null ? "" : `<div>${T.sVs}<b data-count="${Math.round(r * 100)}" data-dec="0" data-suf="${state.lang === "es" ? " %" : "%"}" style="color:${col}">${Math.round(r * 100)}${state.lang === "es" ? " %" : "%"}</b>${T.sVsSub(b, n)}</div>`);
  } else $("season-figs").innerHTML = "";
  const W = Math.max(340, Math.min(1100, $("season").clientWidth || 900)), H = W < 600 ? 240 : 300, l = W < 600 ? 46 : 58, r = 30, t = 14, b = 30;
  const all = [...S.p90, ...S.current, ...S.top.cum, ...S.last, ...S.p10].filter((v) => v > 0);
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
    <path d="${line(S.top.cum)}" fill="none" stroke="#ff8a3d" stroke-width="1.5" opacity=".7"/>
    <path d="${line(S.last)}" fill="none" stroke="#8fa6cc" stroke-width="1.5" opacity=".6"/>
    <path d="${line(S.p50)}" fill="none" stroke="#c9d6ea" stroke-width="2" stroke-dasharray="5 4"/>
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
    + `<span><i class="sw" style="background:#8fa6cc;border:0;height:3px;vertical-align:3px"></i>2025–26</span>`
    + `<span><i class="sw" style="background:#ff8a3d;border:0;height:3px;vertical-align:3px"></i>${T.sTop(topLabel)}</span>`;
  if (state.chartAnim) armWipe("season", "season-figs");
}

// ---------- 2012 jump ----------
function renderJump() {
  const T = L(), S = seasonTotals();
  const ok = state.data.trust.filter((t) => t.validated);
  const fig = (area, unh, h, lo, hi) => `<div>${T.figRaw(area)}${num(unh, 2, "×")}${T.figRawSub}</div>`
    + `<div class="good">${T.figH}${num(h, 2, "×")}${T.figHSub(dec(lo), dec(hi))}</div>`;
  if (ok.length === 1) { const t = ok[0]; $("jump-figs").innerHTML = fig(t.region, t.jump_unharmonized, ...t.jump_harmonized); }
  else if (ok.length > 1) $("jump-figs").innerHTML = fig(T.figAll, CONAF_ALL.unh, CONAF_ALL.h, CONAF_ALL.lo, CONAF_ALL.hi);
  else $("jump-figs").innerHTML = `<div>${T.figNone}</div>`;
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

function renderTrust() {
  const T = L(), TR = state.data.trust, ok = TR.filter((t) => t.validated), tested = TR.filter((t) => !t.validated);
  const err = (e) => T.errLine(dec(e.typical_factor), pct(e.bias_pct), e.coverage80_pct == null ? null : Math.round(e.coverage80_pct));
  let html = "";
  if (ok.length) {
    html += `<div class="tablewrap"><table class="trust"><thead><tr><th>${T.thRegion}</th><th>${T.thJump}</th><th>${T.thAqua}</th><th>${T.thTerra}</th></tr></thead><tbody>`
      + ok.map((t) => `<tr><td><b>${t.region}</b></td><td>${T.raw} ×${dec(t.jump_unharmonized)} → <span class="ok">×${dec(t.jump_harmonized[0])}</span><br><small>${T.ci} ${dec(t.jump_harmonized[1])}–${dec(t.jump_harmonized[2])}</small></td><td>${err(t.Aqua)}</td><td>${err(t.Terra)}</td></tr>`).join("")
      + `</tbody></table></div>`;
    const cov = ok.map((t) => Math.round(t.Aqua.coverage80_pct)), f = dec(ok[0].Aqua.typical_factor);
    html += `<p class="sub" style="margin-top:10px">${T.trustNote(f, `${Math.min(...cov)}${cov.length > 1 ? `–${Math.max(...cov)}` : ""}`)}</p>`;
  }
  if (tested.length) {
    html += `<h3 style="font-size:14.5px;margin:14px 0 6px">${T.testedH}</h3><div class="tablewrap"><table class="trust"><thead><tr><th>${T.thRegion}</th><th>${T.thMethod}</th><th>${T.thAqua}</th><th>${T.thTerra}</th></tr></thead><tbody>`
      + tested.map((t) => `<tr><td><b>${t.region}</b></td><td>${T.methodName[t.Aqua.method]}</td><td>${err(t.Aqua)}</td><td>${err(t.Terra)}</td></tr>`).join("")
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
  let fireDays = 0, top = [0, null];
  for (let d = 1; d <= n; d++) {
    const k = `${key}-${String(d).padStart(2, "0")}`, v = daily[k];
    let bg, label, dark = false;
    if (v === undefined) { bg = `repeating-linear-gradient(45deg,${NO_DATA} 0 4px,#2a3d63 4px 6px)`; label = T.dayTipNone; }
    else if (v === 0) { bg = "#0c1a35"; label = "0"; }
    else { bg = colour(v, max); label = fmt(v); fireDays++; if (v > top[0]) top = [v, d]; dark = lev(v, max) > 0.62; }
    html += `<div class="day" style="background:${bg};${dark ? "color:#0a1430" : ""}" title="${k}: ${v === undefined ? T.dayTipNone : T.dayTipHot(label)}"><b>${d}</b>${v === undefined ? "" : label}</div>`;
  }
  $("day-grid").innerHTML = html;
  $("day-title").textContent = T.dayTitle(T.monthsLong[m - 1], y);
  const st = r.status === "estimated" ? T.dayStatus.estimated(r.source === "Terra" ? "MODIS Terra" : "MODIS Aqua") : T.dayStatus[r.status] || "";
  $("day-sub").textContent = r.value == null ? T.dayNone :
    T.daySub(fmt(r.value), st, fireDays, n, top[1] ? T.dayTop(T.monthsLong[m - 1], top[1], fmt(top[0])) : null)
    + (r.status === "estimated" ? T.dayRaw(r.source === "Terra" ? "MODIS Terra" : "MODIS Aqua") : "");
  $("day-legend").innerHTML = `<span><i class="sw" style="background:${colour(10, max)}"></i>${T.dlg[0]}</span>`
    + `<span><i class="sw" style="background:#0c1a35"></i>${T.dlg[1]}</span>`
    + `<span><i class="sw" style="background:repeating-linear-gradient(45deg,${NO_DATA} 0 3px,#2a3d63 3px 5px)"></i>${T.dlg[2]}</span>`
    + `<span>${T.dlg[3]}</span>`;
  $("day-panel").hidden = false;
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
  renderStatus(); paintMap(); renderSeason(); renderCalendar(animate); renderJump(); renderMethod(); renderTrust();
  state.animNext = false; state.chartAnim = false;
}

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
  applyStatic();
  state.aois = await (await fetch(DATA("aois.json"))).json();
  applyStatic();
  load();
  initMap();
}

$("aoi").addEventListener("change", (e) => { state.aoi = e.target.value; $("day-panel").hidden = true; load(); });
$("play").addEventListener("click", togglePlay);
$("map-slider").addEventListener("input", (e) => { map.i = +e.target.value; paintMap(); });
document.querySelectorAll("[data-mm]").forEach((b) => b.addEventListener("click", () => { map.mode = b.dataset.mm; paintMap(); }));
$("rows").addEventListener("change", (e) => { state.rows = e.target.value; renderCalendar(true); });
$("mode-h").addEventListener("click", () => setMode("harmonized"));
$("mode-r").addEventListener("click", () => setMode("raw"));
$("csv").addEventListener("click", downloadCSV);
document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (state.data && Math.abs($("calendar").clientWidth - state.lastWidth) > 30) { renderCalendar(false); renderSeason(); renderJump(); } }, 150); });
init();
