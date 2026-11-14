# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Clean the near real-time (NRT) FIRMS files for the most recent months (provisional data).

NRT files have no `type` column, so volcanoes and static sources cannot be dropped directly.
Instead we mask ~1 km cells (0.01 degree) where the standard archive flagged a volcano or a static
land source (type 1 or 2) in at least 2 different years. Low confidence is dropped as in 02.
Usage: python3 pipeline/02b_clean_nrt.py data/raw <out_dir>
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

raw_dir, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
SAT = {"N20": "NOAA20", "N21": "NOAA21"}


def cell(lat, lon):
    return (np.floor(lat / 0.01).astype(int).astype(str) + "_" + np.floor(lon / 0.01).astype(int).astype(str))


std = pd.concat([pd.read_csv(f, usecols=["latitude", "longitude", "acq_date", "type"])
                 for f in sorted(raw_dir.glob("*/fire_archive_*.csv"))])
static = std[std["type"].isin([1, 2])].copy()
static["cell"] = cell(static.latitude, static.longitude)
static["year"] = static.acq_date.str[:4]
years = static.groupby("cell")["year"].nunique()
mask = set(years[years >= 2].index)
print(f"Static/volcano mask: {len(mask):,} cells of ~1 km")

nrt = pd.concat([pd.read_csv(f, dtype={"acq_time": str, "confidence": str, "version": str})
                 for f in sorted(raw_dir.glob("*/fire_nrt_*.csv"))], ignore_index=True)
nrt["satellite"] = nrt["satellite"].replace(SAT)
steps = {"raw": len(nrt)}
nrt = nrt[~cell(nrt.latitude, nrt.longitude).isin(mask)]
steps["after static mask"] = len(nrt)
is_modis = nrt["instrument"].eq("MODIS")
conf = pd.to_numeric(nrt["confidence"].where(is_modis), errors="coerce")
low = (is_modis & (conf < 30)) | (~is_modis & nrt["confidence"].eq("l"))
nrt = nrt[~low]
steps["after low-confidence filter"] = len(nrt)
nrt["datetime_utc"] = pd.to_datetime(nrt["acq_date"] + " " + nrt["acq_time"].str.zfill(4),
                                     format="%Y-%m-%d %H%M", utc=True)
nrt["date"] = nrt["acq_date"]
cols = ["latitude", "longitude", "datetime_utc", "date", "satellite", "instrument",
        "confidence", "frp", "daynight", "scan", "track", "brightness", "bright_t31"]
nrt[cols].to_csv(out / "detections_nrt_clean_chile.csv.gz", index=False)
pd.Series(steps).to_csv(out / "cleaning_steps_nrt.csv", header=["rows"])
print("NRT cleaning steps:", steps)
print(nrt.groupby("satellite").date.agg(["min", "max", "size"]))
