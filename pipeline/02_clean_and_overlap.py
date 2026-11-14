# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Build the clean detection table and a first Aqua vs Suomi NPP overlap look.

Rules (documented in the README):
- standard (science-quality) files only; NRT kept apart as provisional
- type == 0 (presumed vegetation fire); volcanoes, static sources, offshore dropped
- low confidence dropped: MODIS < 30, VIIRS 'l'
- dates in UTC (acq_date + acq_time)
Usage: python3 pipeline/02_clean_and_overlap.py data/raw results
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

raw_dir, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

# Approximate bounding box for Biobío region (to be replaced by the official polygon)
BIOBIO = dict(lat_min=-38.50, lat_max=-36.45, lon_min=-73.95, lon_max=-70.95)
OVERLAP = ("2012-01-20", "2026-07-30")  # Aqua and Suomi NPP standard data both available

frames = []
for csv in sorted(raw_dir.glob("*/fire_archive_*.csv")):
    frames.append(pd.read_csv(csv, dtype={"acq_time": str, "confidence": str, "version": str}))
d = pd.concat(frames, ignore_index=True)
n_raw = len(d)

d["satellite"] = d["satellite"].replace({"SNPP": "SNPP", "N20": "NOAA20", "N21": "NOAA21"})
is_modis = d["instrument"].eq("MODIS")
conf_num = pd.to_numeric(d["confidence"].where(is_modis), errors="coerce")
low_conf = (is_modis & (conf_num < 30)) | (~is_modis & d["confidence"].eq("l"))

steps = {"raw": n_raw}
d = d[d["type"] == 0]; steps["after type==0"] = len(d)
d = d[~low_conf.loc[d.index]]; steps["after low-confidence filter"] = len(d)
d["datetime_utc"] = pd.to_datetime(d["acq_date"] + " " + d["acq_time"].str.zfill(4),
                                   format="%Y-%m-%d %H%M", utc=True)
d["date"] = d["datetime_utc"].dt.date.astype(str)

cols = ["latitude", "longitude", "datetime_utc", "date", "satellite", "instrument",
        "confidence", "frp", "daynight", "scan", "track", "brightness", "bright_t31"]
d[cols].to_csv(out / "detections_clean_chile.csv.gz", index=False)
pd.Series(steps).to_csv(out / "cleaning_steps.csv", header=["rows"])
print("Cleaning steps:", steps)

# Biobío subset, Aqua vs Suomi NPP on their overlap
b = d[d.latitude.between(BIOBIO["lat_min"], BIOBIO["lat_max"])
      & d.longitude.between(BIOBIO["lon_min"], BIOBIO["lon_max"])]
b = b[b["satellite"].isin(["Aqua", "SNPP"]) & b["date"].between(*OVERLAP)]
b["month"] = pd.to_datetime(b["date"]).dt.to_period("M").dt.to_timestamp()

monthly = b.groupby(["month", "satellite"]).size().unstack(fill_value=0)
full = pd.date_range(monthly.index.min(), monthly.index.max(), freq="MS")
monthly = monthly.reindex(full, fill_value=0).rename_axis("month")
monthly.to_csv(out / "biobio_monthly_aqua_snpp.csv")

both = monthly[(monthly["Aqua"] > 0) & (monthly["SNPP"] > 0)]
ratio = both["SNPP"] / both["Aqua"]
total_ratio = monthly["SNPP"].sum() / monthly["Aqua"].sum()
busy = both[both["Aqua"] >= 20]
print(f"Biobío months: {len(monthly)}; with detections in both: {len(both)}")
print(f"Total SNPP/Aqua ratio: {total_ratio:.2f}")
print(f"Monthly ratio median {ratio.median():.2f}, IQR {ratio.quantile(.25):.2f}-{ratio.quantile(.75):.2f}")
print(f"Months with Aqua>=20: {len(busy)}, ratio median {(busy.SNPP / busy.Aqua).median():.2f}, "
      f"IQR {(busy.SNPP / busy.Aqua).quantile(.25):.2f}-{(busy.SNPP / busy.Aqua).quantile(.75):.2f}")
print("Zero-Aqua months with SNPP>0:", int(((monthly.Aqua == 0) & (monthly.SNPP > 0)).sum()))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4.6), gridspec_kw={"width_ratios": [2.2, 1]})
ax1.plot(monthly.index, monthly["SNPP"], color="#d9480f", lw=1.2, label="VIIRS Suomi NPP (375 m)")
ax1.plot(monthly.index, monthly["Aqua"], color="#1c7ed6", lw=1.2, label="MODIS Aqua (1 km)")
ax1.set_yscale("symlog", linthresh=10)
ax1.set_title("Biobío: same fires, different counts (monthly hotspots, 2012-2026)")
ax1.set_ylabel("Hotspots per month (symlog)")
ax1.legend(frameon=False)
ax1.grid(alpha=.3)

lim = max(both["Aqua"].max(), 1)
ax2.scatter(both["Aqua"], both["SNPP"], s=12, alpha=.6, color="#495057")
xs = pd.Series([1, lim])
ax2.plot(xs, xs * total_ratio, color="#d9480f", lw=1, label=f"SNPP = {total_ratio:.1f} x Aqua")
ax2.plot(xs, xs, color="#adb5bd", lw=1, ls="--", label="1:1")
ax2.set_xscale("log"); ax2.set_yscale("log")
ax2.set_xlabel("MODIS Aqua hotspots per month")
ax2.set_ylabel("VIIRS Suomi NPP hotspots per month")
ax2.set_title("Month by month")
ax2.legend(frameon=False, loc="upper left")
ax2.grid(alpha=.3, which="both")
fig.text(0.01, 0.01, "Standard FIRMS data, type 0, low confidence removed. Biobío = approximate "
         "bounding box. Data: NASA FIRMS.", fontsize=8, color="#666")
fig.tight_layout(rect=(0, 0.04, 1, 1))
fig.savefig(out / "fig01_biobio_aqua_vs_snpp.png", dpi=150)
print("Saved figure")
