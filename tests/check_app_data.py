# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Consistency checks on the data the app reads. Exits with an error if any check fails.
Usage: python3 tests/check_app_data.py app/data results
"""
import csv
import json
import sys
from pathlib import Path

data, results = Path(sys.argv[1]), Path(sys.argv[2])
REG = [15, 1, 2, 3, 4, 5, 13, 6, 7, 16, 8, 9, 14, 10, 11, 12]
DESERT = {15, 1, 2, 3}
fails, notes = [], []


def check(ok, msg):
    if not ok:
        fails.append(msg)


def load(k):
    return json.loads((data / f"{k}.json").read_text())


R = {r: load(f"r{r}") for r in REG}
chile = load("chile")
STATUS = {"observed", "estimated", "provisional", "partial", "no_data"}

# 1. every area: valid statuses, band contains the value, no negatives, months continuous
for key in ["chile", "biobio_hist"] + [f"r{r}" for r in REG]:
    d = load(key)
    ms = d["months"]
    check(ms[0]["month"] == "2000-11" and ms[-1]["month"] == "2026-11" and len(ms) == 313, f"{key}: months range")
    out_band = 0
    for m in ms:
        check(m["status"] in STATUS, f"{key} {m['month']}: status {m['status']}")
        if m["value"] is None:
            check(m["status"] == "no_data", f"{key} {m['month']}: null value with status {m['status']}")
            continue
        check(m["value"] >= 0 and m["low"] >= 0, f"{key} {m['month']}: negative")
        if not (m["low"] - 0.11 <= m["value"] <= m["high"] + 0.11):
            out_band += 1
        if m["status"] in ("observed", "provisional"):
            check(m["low"] == m["value"] == m["high"], f"{key} {m['month']}: observed month with a band")
        if m["status"] == "observed":
            check(m["month"] >= "2012-02" and m["month"] <= "2026-07", f"{key} {m['month']}: observed outside Suomi NPP standard period")
        if m["status"] == "estimated":
            check(m["month"] < "2012-02" and m["source"] in ("Aqua", "Terra"), f"{key} {m['month']}: estimated month source")
    if out_band:
        notes.append(f"{key}: {out_band} estimated months with the value outside its 80% band")
    L = d["latest"]
    check(L["status"] in ("observed", "provisional"), f"{key}: latest status {L['status']}")

# 2. Chile is the sum of its regions, month by month (desert regions withheld in recent months)
for i, m in enumerate(chile["months"]):
    parts = [R[r]["months"][i]["value"] for r in REG]
    tot = sum(p for p in parts if p is not None)
    if m["value"] is not None:
        check(abs(tot - m["value"]) <= 0.1 * len(REG), f"chile {m['month']}: {m['value']} vs sum of regions {tot:.1f}")
    if m["month"] >= "2026-08":
        check(all(R[r]["months"][i]["value"] is None for r in DESERT), f"{m['month']}: desert regions not withheld")

# 3. the calibrated regions reproduce the statistician's harmonized series (results/normal)
f = results / "normal" / "harmonized_monthly_with_anomaly.csv"
if f.exists():
    rows = list(csv.DictReader(f.open()))
    cols = rows[0].keys()
    vcol = next(c for c in cols if "harmon" in c.lower() or c.lower() in ("value", "snpp_equivalent"))
    rcol = next(c for c in cols if "region" in c.lower() or c.lower() == "zone")
    worst, zworst, labels = 0, 0, 0
    for row in rows:
        digits = "".join(ch for ch in row[rcol] if ch.isdigit())
        if not digits or int(digits) not in (7, 8, 9, 16) or row[vcol] in ("", "NA"):
            continue
        rec = next((m for m in R[int(digits)]["months"] if m["month"] == row["month"]), None)
        if rec and rec["value"] is not None and rec["status"] in ("observed", "estimated"):
            worst = max(worst, abs(rec["value"] - float(row[vcol])))
            if rec.get("z") is not None and row["robust_z"] not in ("", "NA"):
                zworst = max(zworst, abs(rec["z"] - float(row["robust_z"])))
                labels += rec["anomaly"] != row["anomaly"]
    check(worst <= 0.06, f"calibrated regions differ from results/normal by up to {worst:.2f}")
    check(zworst <= 0.03 and labels == 0, f"anomalies differ from results/normal: z by {zworst:.2f}, {labels} labels")
    notes.append(f"anomalies vs results/normal: largest z difference {zworst:.3f}, {labels} different labels")
    notes.append(f"calibrated regions vs results/normal: largest difference {worst:.3f} hotspots")
else:
    notes.append("results/normal not found: skipped")

# 4. season-to-date block matches the monthly series
for key in ["r8", "r7", "chile"]:
    d = load(key)
    S = d["season_to_date"]
    regs = [r for r in d["regions"] if r not in DESERT] or d["regions"]
    acc = 0
    for j, mo in enumerate(["2026-07", "2026-08", "2026-09", "2026-10", "2026-11"][:len(S["current"])]):
        i = next(i for i, m in enumerate(d["months"]) if m["month"] == mo)
        acc += sum(R[r]["months"][i]["value"] for r in regs)
        check(abs(acc - S["current"][j]) < 0.6, f"{key} season to date {mo}: {S['current'][j]} vs {acc:.1f}")
    check(all(a <= b <= c for a, b, c in zip(S["p10"], S["p50"], S["p90"])), f"{key}: season percentiles out of order")

# 5. regional file for the map equals the regional series
RM = json.loads((data / "regions_monthly.json").read_text())
for r in REG:
    v = RM["regions"][str(r)]["v"]
    for i, m in enumerate(R[r]["months"]):
        a, b = v[i], m["value"]
        check((a is None) == (b is None) and (a is None or abs(a - b) < 0.11), f"map r{r} {m['month']}: {a} vs {b}")

# 6. commune counts add up to no more than the region's raw count of the same sensor
for r in REG:
    C = json.loads((data / "comunas_monthly" / f"r{r}.json").read_text())
    for i, mo in enumerate(C["months"]):
        tot = sum(o.get(str(i), 0) for o in C["v"].values())
        raw = R[r]["months"][i]["raw"].get(C["sensor"][i]) if R[r]["months"][i]["raw"] else None
        if raw is not None:
            check(tot <= raw + 0.5, f"communes r{r} {mo}: {tot} > region raw {raw}")

# 7. hotspot points (pipeline/19) of the month's sensor add up to the commune layer, region by region
import csv as _csv
for r in REG:
    C = json.loads((data / "comunas_monthly" / f"r{r}.json").read_text())
    pts = {}
    for f in (data / "points" / f"r{r}").glob("*.csv"):
        for row in _csv.DictReader(open(f)):
            k = (row["date"][:7], row["satellite"])
            if row["cod_comuna"] != "0":
                pts[k] = pts.get(k, 0) + 1
    for i, mo in enumerate(C["months"]):
        if i in C["withheld"]:
            continue
        tot = sum(o.get(str(i), 0) for o in C["v"].values())
        n = pts.get((mo, C["sensor"][i]), 0)
        check(abs(n - tot) < 0.5, f"points r{r} {mo}: {n} points vs {tot} in the commune layer")

# 8. each region's series in the app = the series validated against CONAF (pipeline/15): the quantile-map series,
#    or the region's own ratio where the app uses a ratio (Los Ríos, Los Lagos, Aysén)
import pandas as _pd
val = _pd.read_csv(results / "validation_conaf" / "all_regions" / "region_month_all_regions.csv")
for r, g in val.groupby("codregion"):
    M = {m["month"]: m for m in json.loads((data / f"r{r}.json").read_text())["months"]}
    for _, row in g.iterrows():
        m = M.get(row.month)
        if not m or m["value"] is None:
            continue
        ref = row.hot_ratio_own if "ratio" in (m.get("methods") or [m.get("method")]) else row.hot_harmonized
        check(abs(m["value"] - ref) < 0.5, f"r{r} {row.month}: app {m['value']:.1f} vs CONAF-validated series {ref:.1f}")

print("\n".join("note: " + n for n in notes))
if fails:
    print(f"FAILED {len(fails)} checks")
    print("\n".join(fails[:40]))
    sys.exit(1)
print("all checks passed")
