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
Areas: Chile, each of the 16 regions, and the historical Biobío region (Biobío + Ñuble).
Usage: python3 pipeline/03_export_app_data.py <detections_clean_chile_admin.csv.gz> <detections_nrt_clean_chile_admin.csv.gz> app/data
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

src, nrt_src, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

REGIONS = {15: "Arica y Parinacota", 1: "Tarapacá", 2: "Antofagasta", 3: "Atacama", 4: "Coquimbo",
           5: "Valparaíso", 13: "Metropolitana de Santiago", 6: "O'Higgins", 7: "Maule", 16: "Ñuble",
           8: "Biobío", 9: "La Araucanía", 14: "Los Ríos", 10: "Los Lagos", 11: "Aysén", 12: "Magallanes"}
AOIS = {"chile": {"name": "Chile (whole country)", "regions": None},
        "biobio_hist": {"name": "Biobío + Ñuble (historical Biobío region, CONAF validation area)",
                        "regions": [8, 16]}}
AOIS.update({f"r{c}": {"name": f"{n} region, Chile", "regions": [c]} for c, n in REGIONS.items()})
MIN_OVERLAP = {"Aqua": 300, "Terra": 150, "NOAA20": 300}  # below this, national factors are used
PRIORITY = ["NOAA20", "Aqua", "Terra"]  # after Suomi NPP (the reference)
END = "2026-07"  # last month with standard data for every satellite

d = pd.read_csv(src, usecols=["latitude", "longitude", "date", "satellite", "codregion"])
d["month"] = d["date"].str[:7]
d = d[d["month"] <= END]
nrt = pd.read_csv(nrt_src, usecols=["latitude", "longitude", "date", "satellite", "codregion"])
nrt["month"] = nrt["date"].str[:7]
RECENT = ["2026-08", "2026-09", "2026-10"]
# Near real-time data over the Atacama desert (regions 15, 1, 2, 3) holds many daytime, low-FRP detections
# that are not in the science-quality record (e.g. Oct 2026: about 10x the historical median). Recent
# months there are withheld, and they are left out of the national total, until standard data arrives.
DESERT = [15, 1, 2, 3]
nrt = nrt[~nrt.codregion.isin(DESERT)]
PARTIAL = "2026-11"


def export(key, meta):
    sub = d if meta["regions"] is None else d[d.codregion.isin(meta["regions"])]
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
        if both[sat].sum() < MIN_OVERLAP[sat] and NATIONAL:
            factors[sat] = dict(NATIONAL[sat], scope="national (too few local hotspots)")
            continue
        k = both["SNPP"].sum() / both[sat].sum()
        r = yearly["SNPP"] / yearly[sat]
        factors[sat] = {"k": round(float(k), 3), "low": round(float(r.quantile(.1)), 3),
                        "high": round(float(r.quantile(.9)), 3),
                        "years": f"{yearly.index.min()}-{yearly.index.max()}", "scope": "local"}

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

    nsub = nrt if meta["regions"] is None else nrt[nrt.codregion.isin(meta["regions"])]
    nm = nsub.groupby(["month", "satellite"]).size().unstack(fill_value=0)
    withheld = meta["regions"] is not None and set(meta["regions"]) <= set(DESERT)
    for month in RECENT + [PARTIAL]:
        if withheld:
            rows.append({"month": month, "raw": {}, "value": None, "low": None, "high": None,
                         "status": "no_data", "source": None, "withheld": True})
            continue
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
    # daily series in the same unit: reference sensor of each period, scaled like the monthly values
    dsub = sub.groupby(["date", "satellite"]).size().unstack(fill_value=0)
    nd = nsub.groupby(["date", "satellite"]).size().unstack(fill_value=0)
    days = {}
    for day in pd.date_range("2000-11-01", "2026-11-07", freq="D").strftime("%Y-%m-%d"):
        mo = day[:7]
        if mo >= "2026-08" and withheld:
            continue
        src_tab = nd if mo >= "2026-08" else dsub
        row = src_tab.loc[day] if day in src_tab.index else None
        get = (lambda sat: 0 if row is None else int(row.get(sat, 0)))
        if mo == PARTIAL:  # Suomi NPP stopped on Nov 2, 2026
            v = get("NOAA20") * factors["NOAA20"]["k"]
        elif mo >= "2012-02":
            v = get("SNPP")
        elif day >= "2002-07-04":
            v = get("Aqua") * factors["Aqua"]["k"]
        else:
            v = get("Terra") * factors["Terra"]["k"]
        days[day] = round(v, 1)
    (out / f"{key}_daily.json").write_text(json.dumps(days, separators=(",", ":")))

    payload = {
        "aoi": key, "name": meta["name"], "regions": meta["regions"],
        "unit": "Suomi NPP-equivalent hotspots per month",
        "method": "v0 simple ratio (to be replaced by the validated model)",
        "factors": factors, "climatology_median": climatology,
        "latest": {"month": latest["month"], "value": latest["value"], "status": latest["status"],
                   "median": climatology[int(latest["m"])]},
        "months": rows,
    }
    (out / f"{key}.json").write_text(json.dumps(payload, ensure_ascii=False))
    print(key, {k: (v["k"], v["scope"][:5]) for k, v in factors.items()}, "latest", payload["latest"])
    return factors


NATIONAL = {}
NATIONAL = export("chile", AOIS["chile"])
for key, meta in AOIS.items():
    if key != "chile":
        export(key, meta)
(out / "aois.json").write_text(json.dumps(
    [{"key": k, "name": m["name"]} for k, m in AOIS.items()], ensure_ascii=False))
