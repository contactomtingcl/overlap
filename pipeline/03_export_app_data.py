# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Export the data the web app reads (harmonization v1).

Unit: "Suomi NPP-equivalent hotspots" (one VIIRS satellite, never a sum of satellites).
Each region is harmonized on its own and areas are sums of regions:
- observed:    Suomi NPP standard data (2012-02 to 2026-07)
- estimated:   MODIS Aqua (2002-07 to 2012-01) or Terra (2000-11 to 2002-06) mapped to Suomi NPP
  * Maule, Ñuble, Biobío, Araucanía: quantile mapping on log(1 + monthly hotspots) with Karla's tables
    (results/harmonization_qmap/quantiles_all.csv, fitted on 2012-02 to 2026-07; validated on hidden years
    and against CONAF). 80 % band: 10th-90th percentile of log errors on the hidden years 2020-2026.
  * other regions: simple ratio k = sum(SNPP) / sum(sensor) on the overlap (national ratio if the region has
    too few hotspots); band: 10th-90th percentile of yearly ratios. Flagged as not validated.
- provisional: Aug-Oct 2026, Suomi NPP near real-time data; partial: Nov 2026 (to Nov 7), NOAA-20 x ratio.
  Recent months over the Atacama desert (regions 15, 1, 2, 3) are withheld (daytime false detections).
- no_data: no satellite record (never zero).
Normal: median by calendar month over the seasons 2000-01 to 2025-26. Anomaly (as in results/normal):
robust z = (log1p(x) - median log1p) / MAD log1p, |z| >= 2 is unusual.
Usage: python3 pipeline/03_export_app_data.py <detections_clean_chile_admin.csv.gz>
       <detections_nrt_clean_chile_admin.csv.gz> <results/harmonization_qmap> app/data
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

src, nrt_src, qdir, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
out.mkdir(parents=True, exist_ok=True)

REGIONS = {15: "Arica y Parinacota", 1: "Tarapacá", 2: "Antofagasta", 3: "Atacama", 4: "Coquimbo",
           5: "Valparaíso", 13: "Metropolitana de Santiago", 6: "O'Higgins", 7: "Maule", 16: "Ñuble",
           8: "Biobío", 9: "La Araucanía", 14: "Los Ríos", 10: "Los Lagos", 11: "Aysén", 12: "Magallanes"}
QM_REGIONS = {7, 8, 9, 16}
DESERT = {15, 1, 2, 3}
AOIS = {"chile": {"name": "Chile (whole country)", "regions": list(REGIONS)},
        "biobio_hist": {"name": "Biobío + Ñuble (historical Biobío region, CONAF validation area)",
                        "regions": [8, 16]}}
AOIS.update({f"r{c}": {"name": f"{n} region, Chile", "regions": [c]} for c, n in REGIONS.items()})
SATS = ["Terra", "Aqua", "SNPP", "NOAA20", "NOAA21"]
START = {"Terra": "2000-11", "Aqua": "2002-07", "SNPP": "2012-02", "NOAA20": "2018-04", "NOAA21": "2023-03"}
END, RECENT, PARTIAL = "2026-07", ["2026-08", "2026-09", "2026-10"], "2026-11"
MONTHS = list(pd.period_range("2000-11", END, freq="M").astype(str))
MIN_OVERLAP = {"Aqua": 300, "Terra": 150, "NOAA20": 300}

d = pd.read_csv(src, usecols=["date", "satellite", "codregion"])
d["month"] = d["date"].str[:7]
d = d[d["month"] <= END]
nrt = pd.read_csv(nrt_src, usecols=["date", "satellite", "codregion"])
nrt["month"] = nrt["date"].str[:7]
nrt = nrt[~nrt.codregion.isin(DESERT)]

std_m = d.groupby(["codregion", "month", "satellite"]).size()
nrt_m = nrt.groupby(["codregion", "month", "satellite"]).size()
std_d = d.groupby(["codregion", "date", "satellite"]).size()
nrt_d = nrt.groupby(["codregion", "date", "satellite"]).size()

qtab = pd.read_csv(qdir / "quantiles_all.csv")


def monthly_table(regions):
    """Months x satellites for a set of regions; NaN before a satellite starts, 0 after."""
    sub = std_m[std_m.index.get_level_values(0).isin(regions)].groupby(level=[1, 2]).sum()
    m = sub.unstack(fill_value=0).reindex(MONTHS) if len(sub) else pd.DataFrame(index=MONTHS)
    for sat in SATS:
        if sat not in m:
            m[sat] = np.nan
        m.loc[m.index < START[sat], sat] = np.nan
        m.loc[m.index >= START[sat], sat] = m.loc[m.index >= START[sat], sat].fillna(0)
    return m[SATS]


def ratio_factors(m, national=None):
    f = {}
    for sat in ["NOAA20", "Aqua", "Terra"]:
        both = m[m["SNPP"].notna() & m[sat].notna()]
        if national and both[sat].sum() < MIN_OVERLAP[sat]:
            f[sat] = dict(national[sat], scope="national")
            continue
        yearly = both.groupby(both.index.str[:4])[["SNPP", sat]].sum()
        yearly = yearly[yearly[sat] > 0]
        r = yearly["SNPP"] / yearly[sat]
        f[sat] = {"k": round(float(both["SNPP"].sum() / both[sat].sum()), 3),
                  "low": round(float(r.quantile(.1)), 3), "high": round(float(r.quantile(.9)), 3),
                  "scope": "local"}
    return f


def qm_model(region, sensor):
    t = qtab[(qtab.zone == f"region_{region:02d}") & (qtab.sensor == sensor)
             & (qtab.season_group == "all_year") & (qtab.fit_period == "2012-02_2026-07")]
    g = t.groupby("sensor_value").snpp_value.apply(lambda s: np.log1p(s).mean())  # R approx(): ties = mean
    pred = pd.read_csv(qdir / f"region_{region:02d}_{sensor.lower()}" / "test_predictions.csv")
    le = np.log((pred.snpp_observed + 1) / (pred.qmap + 1))
    return {"x": np.log1p(g.index.values.astype(float)), "y": g.values,
            "q10": float(le.quantile(.1)), "q90": float(le.quantile(.9))}


def qm_apply(model, v):
    p = max(float(np.expm1(np.interp(np.log1p(v), model["x"], model["y"]))), 0.0)
    return p, max((p + 1) * np.exp(model["q10"]) - 1, 0.0), (p + 1) * np.exp(model["q90"]) - 1


NATIONAL = ratio_factors(monthly_table(list(REGIONS)))


def region_rows(r):
    """Harmonized monthly rows for one region (dict month -> row)."""
    m = monthly_table([r])
    f = ratio_factors(m, NATIONAL)
    qm = {s: qm_model(r, s) for s in ["Aqua", "Terra"]} if r in QM_REGIONS else {}
    rows = {}
    for month, row in m.iterrows():
        raw = {s: (None if pd.isna(row[s]) else int(row[s])) for s in SATS}
        if raw["SNPP"] is not None:
            v = float(raw["SNPP"])
            rows[month] = dict(raw=raw, value=v, low=v, high=v, status="observed", source="SNPP", method="observed")
            continue
        sat = "Aqua" if raw["Aqua"] is not None else ("Terra" if raw["Terra"] is not None else None)
        if sat is None:
            rows[month] = dict(raw=raw, value=None, low=None, high=None, status="no_data", source=None, method=None)
        elif sat in qm:
            v, lo, hi = qm_apply(qm[sat], raw[sat])
            rows[month] = dict(raw=raw, value=v, low=lo, high=hi, status="estimated", source=sat, method="qmap")
        else:
            k = f[sat]
            rows[month] = dict(raw=raw, value=raw[sat] * k["k"], low=raw[sat] * k["low"], high=raw[sat] * k["high"],
                               status="estimated", source=sat, method="ratio")
    for month in RECENT + [PARTIAL]:
        if r in DESERT:
            rows[month] = dict(raw={}, value=None, low=None, high=None, status="no_data", source=None,
                               method=None, withheld=True)
            continue
        raw = {s: int(nrt_m.get((r, month, s), 0)) for s in SATS}
        if month in RECENT:
            v = float(raw["SNPP"])
            rows[month] = dict(raw=raw, value=v, low=v, high=v, status="provisional", source="SNPP", method="observed")
        else:
            k = f["NOAA20"]
            rows[month] = dict(raw=raw, value=raw["NOAA20"] * k["k"], low=raw["NOAA20"] * k["low"],
                               high=raw["NOAA20"] * k["high"], status="partial", source="NOAA20", method="ratio",
                               through="2026-11-07")
    return rows, f, sorted(qm)


REGION_ROWS, REGION_FACTORS, REGION_QM = {}, {}, {}
for r in REGIONS:
    REGION_ROWS[r], REGION_FACTORS[r], REGION_QM[r] = region_rows(r)

ORDER = {"no_data": 0, "observed": 1, "provisional": 2, "partial": 3, "estimated": 4}


def combine(regions):
    rows = []
    for month in MONTHS + RECENT + [PARTIAL]:
        parts = [REGION_ROWS[r][month] for r in regions]
        usable = [p for p in parts if p["value"] is not None]
        if not usable:
            rec = dict(month=month, raw={}, value=None, low=None, high=None, status="no_data", source=None, methods=[])
            if all(p.get("withheld") for p in parts):
                rec["withheld"] = True
            rows.append(rec)
            continue
        status = max((p["status"] for p in usable), key=lambda s: ORDER[s])
        raw = {s: sum((p["raw"].get(s) or 0) for p in parts) if any(p["raw"].get(s) is not None for p in parts)
               else None for s in SATS}
        rec = dict(month=month, raw=raw, status=status,
                   value=round(sum(p["value"] for p in usable), 1),
                   low=round(sum(p["low"] for p in usable), 1), high=round(sum(p["high"] for p in usable), 1),
                   source=next((p["source"] for p in usable if p["status"] == status), None),
                   methods=sorted({p["method"] for p in usable if p["method"]}))
        if status == "partial":
            rec["through"] = "2026-11-07"
        if any(p.get("withheld") for p in parts):
            rec["note"] = "Atacama desert regions withheld for this month"
        rows.append(rec)
    return rows


def daily(regions):
    """Daily Suomi NPP-equivalent counts from 2012-02; before that, raw MODIS counts (flagged in the app)."""
    days = {}
    for day in pd.date_range("2000-11-01", "2026-11-07", freq="D").strftime("%Y-%m-%d"):
        mo = day[:7]
        if mo >= "2026-08":
            regs = [r for r in regions if r not in DESERT]
            if not regs:
                continue
            tab = nrt_d
        else:
            regs, tab = regions, std_d
        get = lambda sat: sum(int(tab.get((r, day, sat), 0)) for r in regs)
        if mo == PARTIAL:
            v = get("NOAA20") * NATIONAL["NOAA20"]["k"]
        elif mo >= "2012-02":
            v = get("SNPP")
        elif day >= "2002-07-04":
            v = get("Aqua")
        else:
            v = get("Terra")
        days[day] = round(v, 1)
    return days


def anomaly(value, history):
    lh = np.log1p(history)
    med = np.median(lh)
    mad = 1.4826 * np.median(np.abs(lh - med))
    z = (np.log1p(value) - med) / mad if mad > 0 else 0.0
    return round(float(z), 2), ("unusually high" if z >= 2 else "unusually low" if z <= -2 else "within normal")


for key, meta in AOIS.items():
    rows = combine(meta["regions"])
    cal = pd.DataFrame(rows)
    cal["m"] = cal["month"].str[5:].astype(int)
    hist = cal[cal.status.isin(["observed", "estimated"]) & (cal.month <= "2026-06")]
    climatology = {int(k): round(float(v), 1) for k, v in hist.groupby("m")["value"].median().items()}
    for rec in rows:
        if rec["value"] is not None and rec["status"] != "partial":
            h = hist[(hist.m == int(rec["month"][5:])) & (hist.month != rec["month"])]["value"].values
            rec["z"], rec["anomaly"] = anomaly(rec["value"], h)
    latest = next(r for r in reversed(rows) if r["status"] in ("observed", "estimated", "provisional"))
    qm_regs = [r for r in meta["regions"] if REGION_QM[r]]
    payload = {
        "aoi": key, "name": meta["name"], "regions": meta["regions"],
        "unit": "Suomi NPP-equivalent hotspots per month",
        "method": {"qmap_regions": [REGIONS[r] for r in qm_regs],
                   "ratio_regions": [REGIONS[r] for r in meta["regions"] if r not in qm_regs],
                   "factors": {REGIONS[r]: REGION_FACTORS[r] for r in meta["regions"] if r not in qm_regs}},
        "climatology_median": climatology,
        "latest": {"month": latest["month"], "value": latest["value"], "status": latest["status"],
                   "median": climatology[int(latest["month"][5:])], "z": latest.get("z"),
                   "anomaly": latest.get("anomaly")},
        "months": rows,
    }
    (out / f"{key}.json").write_text(json.dumps(payload, ensure_ascii=False))
    (out / f"{key}_daily.json").write_text(json.dumps(daily(meta["regions"]), separators=(",", ":")))
    print(key, "QM:", [REGIONS[r] for r in qm_regs] or "-", "latest", payload["latest"])

(out / "aois.json").write_text(json.dumps([{"key": k, "name": m["name"]} for k, m in AOIS.items()],
                                          ensure_ascii=False))
