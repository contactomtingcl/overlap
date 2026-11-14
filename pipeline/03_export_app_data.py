# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Export monthly calendar data for the web app (harmonization v0: simple ratios).

v0 is a placeholder to get real data on screen. Every month is expressed in
"Suomi NPP-equivalent hotspots" (one VIIRS satellite, never a sum of satellites):
- observed: Suomi NPP standard data exists for that month
- estimated: another sensor scaled by k = sum(SNPP) / sum(sensor) over their shared months,
  in this priority: NOAA-20, Aqua MODIS, Terra MODIS (Terra = morning orbit, flagged)
- the 80 % band uses the 10th-90th percentile of the yearly ratios
- months with no standard data are "no_data", never zero
Recent months (Aug-Oct 2026) come from near real-time data and are flagged "provisional";
November 2026 is "partial" (data to Nov 7) and is not compared with history.
Usage: python3 pipeline/03_export_app_data.py <detections_clean_chile.csv.gz> <detections_nrt_clean_chile.csv.gz> app/data
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

src, nrt_src, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

AOIS = {
    "biobio": {"name": "Biobío, Chile (approximate box)",
               "bbox": [-73.95, -38.50, -70.95, -36.45]},
    "chile": {"name": "Chile (whole country)", "bbox": None},
}
PRIORITY = ["NOAA20", "Aqua", "Terra"]  # after Suomi NPP (the reference)
END = "2026-07"  # last month with standard data for every satellite

d = pd.read_csv(src, usecols=["latitude", "longitude", "date", "satellite"])
d["month"] = d["date"].str[:7]
d = d[d["month"] <= END]
nrt = pd.read_csv(nrt_src, usecols=["latitude", "longitude", "date", "satellite"])
nrt["month"] = nrt["date"].str[:7]
RECENT = ["2026-08", "2026-09", "2026-10"]
PARTIAL = "2026-11"


def export(key, meta):
    sub = d
    if meta["bbox"]:
        w, s, e, n = meta["bbox"]
        sub = d[d.longitude.between(w, e) & d.latitude.between(s, n)]
    m = sub.groupby(["month", "satellite"]).size().unstack(fill_value=0)
    months = pd.period_range("2000-11", END, freq="M").astype(str)
    m = m.reindex(months)
    # a satellite has "no data" before its first standard month, zero only after it
    first = {"Terra": "2000-11", "Aqua": "2002-07", "SNPP": "2012-02",  # Jan 2012 is partial (starts Jan 20)
             "NOAA20": "2018-04", "NOAA21": "2023-03"}
    for sat, start in first.items():
        if sat not in m:
            m[sat] = np.nan
        m.loc[m.index < start, sat] = np.nan
        m.loc[m.index >= start, sat] = m.loc[m.index >= start, sat].fillna(0)

    factors = {}
    for sat in PRIORITY:
        both = m[m["SNPP"].notna() & m[sat].notna()]
        yearly = both.groupby(both.index.str[:4])[["SNPP", sat]].sum()
        yearly = yearly[yearly[sat] > 0]
        k = both["SNPP"].sum() / both[sat].sum()
        r = yearly["SNPP"] / yearly[sat]
        factors[sat] = {"k": round(float(k), 3), "low": round(float(r.quantile(.1)), 3),
                        "high": round(float(r.quantile(.9)), 3),
                        "years": f"{yearly.index.min()}-{yearly.index.max()}"}

    rows = []
    for month, row in m.iterrows():
        rec = {"month": month,
               "raw": {s: (None if pd.isna(row[s]) else int(row[s]))
                       for s in ["Terra", "Aqua", "SNPP", "NOAA20", "NOAA21"]}}
        if not pd.isna(row["SNPP"]):
            v = float(row["SNPP"])
            rec.update(value=v, low=v, high=v, status="observed", source="SNPP")
        else:
            for sat in PRIORITY:
                if not pd.isna(row[sat]):
                    f = factors[sat]
                    rec.update(value=row[sat] * f["k"], low=row[sat] * f["low"],
                               high=row[sat] * f["high"], status="estimated", source=sat)
                    break
            else:
                rec.update(value=None, low=None, high=None, status="no_data", source=None)
        for k in ("value", "low", "high"):
            if rec[k] is not None:
                rec[k] = round(rec[k], 1)
        rows.append(rec)

    nsub = nrt
    if meta["bbox"]:
        nsub = nrt[nrt.longitude.between(w, e) & nrt.latitude.between(s, n)]
    nm = nsub.groupby(["month", "satellite"]).size().unstack(fill_value=0)
    for month in RECENT + [PARTIAL]:
        r = nm.loc[month] if month in nm.index else pd.Series(dtype=float)
        raw = {s_: int(r.get(s_, 0)) for s_ in ["Terra", "Aqua", "SNPP", "NOAA20", "NOAA21"]}
        if month in RECENT:  # Suomi NPP NRT covers Aug 1 - Nov 1, 2026
            v = float(raw["SNPP"])
            rows.append({"month": month, "raw": raw, "value": v, "low": v, "high": v,
                         "status": "provisional", "source": "SNPP"})
        else:  # Nov 1-7 only, Suomi NPP ended Nov 2: NOAA-20 scaled
            f = factors["NOAA20"]
            rows.append({"month": month, "raw": raw, "value": round(raw["NOAA20"] * f["k"], 1),
                         "low": round(raw["NOAA20"] * f["low"], 1), "high": round(raw["NOAA20"] * f["high"], 1),
                         "status": "partial", "source": "NOAA20", "through": "2026-11-07"})

    cal = pd.DataFrame(rows)
    cal["m"] = cal["month"].str[5:].astype(int)
    med = cal[cal.status.isin(["observed", "estimated"])].groupby("m")["value"].median()
    climatology = {int(k): round(float(v), 1) for k, v in med.items()}
    latest = cal[cal.status.isin(["observed", "estimated", "provisional"])].iloc[-1]
    payload = {
        "aoi": key, "name": meta["name"], "bbox": meta["bbox"],
        "unit": "Suomi NPP-equivalent hotspots per month",
        "method": "v0 simple ratio (to be replaced by the validated model)",
        "factors": factors, "climatology_median": climatology,
        "latest": {"month": latest["month"], "value": latest["value"], "status": latest["status"],
                   "median": climatology[int(latest["m"])]},
        "months": rows,
    }
    (out / f"{key}.json").write_text(json.dumps(payload, ensure_ascii=False))
    print(key, "factors", factors, "latest", payload["latest"])


for key, meta in AOIS.items():
    export(key, meta)
