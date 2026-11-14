# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Audit the raw FIRMS archive downloads (Chile) before any processing.

Reads every CSV under raw_zip/, reports coverage, columns, quality flags
and duplicates, and writes a per-sensor-per-year count table.
Usage: python3 pipeline/01_audit_raw.py data/raw results
"""
import sys
from pathlib import Path

import pandas as pd

raw_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)

frames = []
for csv in sorted(raw_dir.glob("*/*.csv")):
    df = pd.read_csv(csv, dtype={"acq_time": str, "confidence": str, "version": str})
    df["source_file"] = csv.name
    df["product"] = "nrt" if csv.name.startswith("fire_nrt") else "standard"
    frames.append(df)
    print(f"{csv.name}: {len(df):,} rows, {df.acq_date.min()} -> {df.acq_date.max()}, "
          f"satellites={sorted(df.satellite.unique())}, has_type={'type' in df.columns}")

d = pd.concat(frames, ignore_index=True)
d["acq_date"] = pd.to_datetime(d["acq_date"])
d["year"] = d.acq_date.dt.year

print("\nTotal rows:", f"{len(d):,}")
print("\nRows by satellite and product:")
print(d.groupby(["satellite", "product"]).size().unstack(fill_value=0))

print("\nCoverage by satellite (first and last date):")
print(d.groupby(["satellite", "product"]).acq_date.agg(["min", "max"]))

print("\n'type' values in standard files (0 veg fire, 1 volcano, 2 static land, 3 offshore):")
print(d[d["product"] == "standard"].groupby(["satellite", "type"]).size().unstack(fill_value=0))

print("\nConfidence values by instrument:")
for inst, g in d.groupby("instrument"):
    vals = g.confidence.value_counts()
    print(inst, vals.head(5).to_dict() if inst != "MODIS" else
          pd.cut(pd.to_numeric(g.confidence), [-1, 29, 79, 100],
                 labels=["low<30", "nominal30-79", "high>=80"]).value_counts().to_dict())

key = ["latitude", "longitude", "acq_date", "acq_time", "satellite"]
dups = d.duplicated(subset=key).sum()
print(f"\nExact duplicates on {key}: {dups:,}")

# Overlap between standard and NRT for the same satellite and day
std_days = d[d["product"] == "standard"].groupby("satellite").acq_date.max()
nrt_days = d[d["product"] == "nrt"].groupby("satellite").acq_date.min()
print("\nStandard ends vs NRT starts:")
print(pd.DataFrame({"standard_end": std_days, "nrt_start": nrt_days}))

counts = (d[d["product"] == "standard"]
          .groupby(["satellite", "year"]).size().unstack(fill_value=0).T)
counts.to_csv(out_dir / "counts_by_satellite_year.csv")
print("\nStandard detections by satellite and year:")
print(counts.to_string())
