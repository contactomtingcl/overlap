# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Assign every clean detection to its commune and region (point in polygon).

Boundaries: Biblioteca del Congreso Nacional de Chile (BCN), "División comunal", reprojected to WGS84
and simplified (3 %) with mapshaper; referential limits, not official (DFL-83, 1979).
Detections outside every commune (sea, border) get code 0.
Usage: python3 pipeline/02c_assign_admin.py app/data/geo/comunas.json <detections.csv.gz> [<more.csv.gz> ...]
Writes <name>_admin.csv.gz next to each input.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from matplotlib.path import Path as MplPath

geo = json.load(open(sys.argv[1]))
shapes = []
for f in geo["features"]:
    g, p = f["geometry"], f["properties"]
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    for poly in polys:
        verts, codes = [], []
        for ring in poly:  # outer ring and holes in one compound path (even-odd rule)
            verts += ring
            codes += [MplPath.MOVETO] + [MplPath.LINETO] * (len(ring) - 2) + [MplPath.CLOSEPOLY]
        path = MplPath(np.array(verts), codes)
        xs, ys = np.array(verts)[:, 0], np.array(verts)[:, 1]
        shapes.append((p["cod_comuna"], p["codregion"], path, xs.min(), xs.max(), ys.min(), ys.max()))

for src in sys.argv[2:]:
    d = pd.read_csv(src)
    pts = d[["longitude", "latitude"]].to_numpy()
    com = np.zeros(len(d), dtype=int)
    reg = np.zeros(len(d), dtype=int)
    for code, region, path, x0, x1, y0, y1 in shapes:
        box = (pts[:, 0] >= x0) & (pts[:, 0] <= x1) & (pts[:, 1] >= y0) & (pts[:, 1] <= y1) & (com == 0)
        if not box.any():
            continue
        idx = np.where(box)[0]
        inside = path.contains_points(pts[idx])
        com[idx[inside]] = code
        reg[idx[inside]] = region
    d["cod_comuna"], d["codregion"] = com, reg
    out = Path(src).with_name(Path(src).name.replace(".csv.gz", "_admin.csv.gz"))
    d.to_csv(out, index=False)
    print(f"{Path(src).name}: {len(d):,} detections, {np.mean(com > 0):.1%} inside a commune")
    print(d.groupby("codregion").size().to_string())
# Commune-month counts for the CONAF validation (results/model_input/monthly_comuna_counts_chile.csv.gz)
# are built from the *_admin output: month, cod_comuna, codregion, satellite, daynight, n_hotspots.
