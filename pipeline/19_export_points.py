# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Hotspot points for the app: every clean detection with its pixel-centre coordinates, one CSV per region and year.

FIRMS gives each detection as the centre of the satellite pixel that saw it (latitude, longitude), with the pixel
size at that position (scan x track, km): about 1 km for MODIS and 375 m for VIIRS at nadir, larger towards the edge
of the swath. The fire is somewhere inside that pixel, not necessarily at its centre.
Same cleaning and same months as the commune layer (pipeline/14): science-quality data up to 2026-07; near real-time
data from 2026-08 to 2026-11-07, without the Atacama desert regions (withheld in the app).
Usage: python3 pipeline/19_export_points.py <detections_clean_chile_admin.csv.gz> <detections_nrt_clean_chile_admin.csv.gz> app/data/points
"""
import sys
from pathlib import Path

import pandas as pd

std_src, nrt_src, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
DESERT = {15, 1, 2, 3}
cols = ["latitude", "longitude", "datetime_utc", "date", "satellite", "confidence", "frp", "daynight", "scan", "track", "cod_comuna", "codregion"]
std = pd.read_csv(std_src, usecols=cols, dtype={"confidence": str})
std = std[std.date.str[:7] <= "2026-07"]
nrt = pd.read_csv(nrt_src, usecols=cols, dtype={"confidence": str})
nrt = nrt[(nrt.date.str[:7] >= "2026-08") & (nrt.date <= "2026-11-07") & ~nrt.codregion.isin(DESERT)]
d = pd.concat([std, nrt], ignore_index=True)
d = d[d.codregion > 0].copy()
d["time_utc"] = d.datetime_utc.str[11:16]
d = d.rename(columns={"scan": "scan_km", "track": "track_km", "frp": "frp_mw"})
d = d.sort_values(["date", "time_utc", "satellite"])
keep = ["date", "time_utc", "satellite", "latitude", "longitude", "scan_km", "track_km", "frp_mw", "confidence", "daynight", "cod_comuna"]
n = 0
for (reg, year), g in d.groupby([d.codregion, d.date.str[:4]]):
    f = out / f"r{reg}" / f"{year}.csv"
    f.parent.mkdir(parents=True, exist_ok=True)
    g[keep].to_csv(f, index=False)
    n += len(g)
print(f"{n:,} detections in {sum(1 for _ in out.rglob('*.csv'))} files")
