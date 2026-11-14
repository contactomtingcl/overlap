# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Commune layer for the map zoom: outlines per region (same projection as the region map) and monthly hotspot
counts per commune, from the single sensor the app uses for that month (Terra, Aqua, Suomi NPP; NOAA-20 in Nov 2026).
Commune counts are raw detections, not harmonized: they show where in a region the hotspots fall, not totals to
compare across sensors (validation showed commune-month is too fine for that).
Usage: python3 pipeline/14_comunas_for_map.py app/data/geo/comunas.json app/data/geo/regions_svg.json \
       <detections_clean_chile_admin.csv.gz> <detections_nrt_clean_chile_admin.csv.gz> app/data
"""
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd

comunas, regsvg, std_src, nrt_src, out = (Path(a) for a in sys.argv[1:6])
P = json.loads(regsvg.read_text())["proj"]
k = math.cos(math.radians(P["lat0"]))
DESERT = {15, 1, 2, 3}
MONTHS = list(pd.period_range("2000-11", "2026-11", freq="M").astype(str))


def sensor(mo):
    return "Terra" if mo < "2002-07" else "Aqua" if mo < "2012-02" else "NOAA20" if mo == "2026-11" else "SNPP"


def dp(pts, eps):
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    n = math.hypot(dx, dy)
    best, idx = -1, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / n if n else math.hypot(px - ax, py - ay)
        if d > best:
            best, idx = d, i
    return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps) if best > eps else [pts[0], pts[-1]]


def proj(x, y):
    return ((x * k - P["minx"]) * P["scale"], (-y - P["miny"]) * P["scale"])


g = json.loads(comunas.read_text())
geo = defaultdict(lambda: {"paths": {}, "names": {}})
for f in g["features"]:
    pr = f["properties"]
    reg = pr["codregion"]
    if reg == 0:
        continue
    polys = [f["geometry"]["coordinates"]] if f["geometry"]["type"] == "Polygon" else f["geometry"]["coordinates"]
    d = ""
    for poly in polys:
        for ring in poly:
            s = dp([tuple(p) for p in ring], 0.003)
            if len(s) >= 4:
                d += "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in (proj(*p) for p in s)) + "Z"
    if d:
        geo[reg]["paths"][str(pr["cod_comuna"])] = d
        geo[reg]["names"][str(pr["cod_comuna"])] = pr["Comuna"]

std = pd.read_csv(std_src, usecols=["date", "satellite", "cod_comuna", "codregion"])
std["month"] = std["date"].str[:7]
std = std[std.month <= "2026-07"]
nrt = pd.read_csv(nrt_src, usecols=["date", "satellite", "cod_comuna", "codregion"])
nrt["month"] = nrt["date"].str[:7]
nrt = nrt[~nrt.codregion.isin(DESERT) & (nrt.date <= "2026-11-07")]
allm = pd.concat([std, nrt])
allm = allm[allm.satellite == allm.month.map(sensor)].dropna(subset=["cod_comuna"])
cnt = allm.groupby(["codregion", "cod_comuna", "month"]).size()

idx = {m: i for i, m in enumerate(MONTHS)}
(out / "geo" / "comunas").mkdir(parents=True, exist_ok=True)
(out / "comunas_monthly").mkdir(parents=True, exist_ok=True)
for reg, gg in geo.items():
    (out / "geo" / "comunas" / f"r{reg}.json").write_text(json.dumps(gg, ensure_ascii=False, separators=(",", ":")))
    v = defaultdict(dict)
    if reg in cnt.index.get_level_values(0):
        for (com, mo), n in cnt.loc[reg].items():
            if mo in idx:
                v[str(int(com))][idx[mo]] = int(n)
    withheld = [idx[m] for m in ["2026-08", "2026-09", "2026-10", "2026-11"]] if reg in DESERT else []
    (out / "comunas_monthly" / f"r{reg}.json").write_text(json.dumps(
        {"months": MONTHS, "sensor": [sensor(m) for m in MONTHS], "withheld": withheld, "v": v},
        separators=(",", ":")))
print({r: len(gg["paths"]) for r, gg in geo.items()})
