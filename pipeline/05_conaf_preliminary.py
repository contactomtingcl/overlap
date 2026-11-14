# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Preliminary check of FIRMS hotspots against CONAF fire records (historical Biobío region, incl. Ñuble).

CONAF data: Corporación Nacional Forestal (2024). Registro histórico de incendios forestales, V1.
Datos para Resiliencia. https://doi.org/10.71578/UXAUN5 (raw file not committed until its licence is confirmed).
Outputs: monthly Spearman correlations, detection rate of fires >= 10 and >= 100 ha
(any hotspot within 3 km, from 1 day before to 2 days after the CONAF start date), and monthly shares.
The formal validation is Karla's (R); this is a first look.
Usage: python3 pipeline/05_conaf_preliminary.py <conaf.csv> <detections_clean_chile.csv.gz> results/validation
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

conaf, dets, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
c = pd.read_csv(conaf, parse_dates=["Fecha"]).rename(
    columns={"Superficie quemada total [ha]": "ha", "Latitud": "lat", "Longitud": "lon"})
c = c[c.lat.between(-38.7, -35.7) & c.lon.between(-74.1, -70.9)]  # 2 records with impossible coordinates dropped
S, N, W, E = c.lat.min(), c.lat.max(), c.lon.min(), c.lon.max()
f = pd.read_csv(dets, usecols=["latitude", "longitude", "date", "satellite"])
f = f[f.latitude.between(S, N) & f.longitude.between(W, E)]
f["date"] = pd.to_datetime(f.date)

months = pd.period_range("2002-07", "2020-05", freq="M")
cm = c.groupby(c.Fecha.dt.to_period("M")).agg(n_fires=("ha", "size"), area_ha=("ha", "sum")).reindex(months, fill_value=0)
rows = []
for sat, start in [("Aqua", "2002-07"), ("SNPP", "2012-02")]:
    fm = f[f.satellite == sat].groupby(f.date.dt.to_period("M")).size().reindex(months, fill_value=0)
    ok = months >= pd.Period(start, "M")
    rows.append({"satellite": sat, "months": int(ok.sum()),
                 "spearman_vs_n_fires": round(fm[ok].corr(cm.n_fires[ok], method="spearman"), 3),
                 "spearman_vs_area": round(fm[ok].corr(cm.area_ha[ok], method="spearman"), 3)})
pd.DataFrame(rows).to_csv(out / "conaf_monthly_correlation.csv", index=False)


def detected(fires, det, km=3.0):
    hits = []
    for _, r in fires.iterrows():
        w = det[(det.date >= r.Fecha - pd.Timedelta(days=1)) & (det.date <= r.Fecha + pd.Timedelta(days=2))]
        dx = (w.longitude - r.lon) * 111.0 * np.cos(np.radians(r.lat))
        dy = (w.latitude - r.lat) * 111.0
        hits.append(bool(((dx ** 2 + dy ** 2) <= km ** 2).any()))
    return np.array(hits)


rows = []
for thr in [10, 100]:
    for sat, start in [("Aqua", "2002-07-04"), ("SNPP", "2012-02-01")]:
        b = c[(c.ha >= thr) & (c.Fecha >= start)]
        h = detected(b, f[f.satellite == sat])
        rows.append({"min_area_ha": thr, "satellite": sat, "fires": len(b), "detected": int(h.sum()),
                     "detection_rate": round(h.mean(), 3)})
pd.DataFrame(rows).to_csv(out / "conaf_detection_rate.csv", index=False)

cc, ff = c[c.Fecha >= "2012-07-01"], f[(f.satellite == "SNPP") & (f.date >= "2012-07-01") & (f.date <= "2020-05-31")]
share = pd.DataFrame({
    "conaf_fires_pct": cc.Fecha.dt.month.value_counts(normalize=True) * 100,
    "conaf_area_pct": cc.groupby(cc.Fecha.dt.month)["ha"].sum() / cc["ha"].sum() * 100,
    "firms_snpp_hotspots_pct": ff.date.dt.month.value_counts(normalize=True) * 100,
}).sort_index().fillna(0).round(1).rename_axis("month")
share.to_csv(out / "conaf_vs_firms_monthly_share.csv")
print(pd.read_csv(out / "conaf_monthly_correlation.csv").to_string(index=False))
print(pd.read_csv(out / "conaf_detection_rate.csv").to_string(index=False))
print(share.to_string())
