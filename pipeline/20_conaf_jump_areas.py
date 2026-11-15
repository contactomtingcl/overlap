# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""2012 jump against CONAF for the multi-region areas of the app, with the series the app shows.
Same model and bootstrap as pipeline/15 (region-month regression, exp(era coefficient), 1,000 resamples of fire seasons).
Usage: python3 pipeline/20_conaf_jump_areas.py  ->  results/validation_conaf/all_regions/jump_at_2012_app_areas.csv"""
import json, numpy as np, pandas as pd
v = pd.read_csv("results/validation_conaf/all_regions/region_month_all_regions.csv")
app = {}
for r in v.codregion.unique():
    for m in json.load(open(f"app/data/r{r}.json"))["months"]: app[(r, m["month"])] = m["value"]
v["app"] = [app.get((r, m)) for r, m in zip(v.codregion, v.month)]
def design(df):
    X = pd.DataFrame({"ha": np.log1p(df.conaf_ha.values), "n": np.log1p(df.conaf_fires.values), "era": (df.month.values >= "2012-02").astype(float)})
    parts = [X]
    if df.codregion.nunique() > 1: parts.append(pd.get_dummies(df.codregion.astype(str).values, prefix="r", drop_first=True, dtype=float))
    parts.append(pd.get_dummies(df.month.str[5:].values, prefix="m", drop_first=True, dtype=float))
    X = pd.concat(parts, axis=1); X.insert(0, "c", 1.0); return X
def jump(df, col):
    X = design(df); y = np.log1p(df[col].values.astype(float)); b, *_ = np.linalg.lstsq(X.values, y, rcond=None); return float(np.exp(b[list(X.columns).index("era")]))
rows = []
rng = np.random.default_rng(2026); seasons = v.season.unique(); groups = {s: g for s, g in v.groupby("season")}
for name, regs in [("Maule to La Araucanía", [7, 16, 8, 9]), ("Biobío + Ñuble", [8, 16]), ("Chile (16 regions)", sorted(v.codregion.unique()))]:
    d = v[v.codregion.isin(regs)]; gs = {s: g for s, g in d.groupby("season")}
    for col in ["hot_raw", "app"]:
        est = jump(d, col); bs = [jump(pd.concat([gs[s] for s in rng.choice(seasons, len(seasons))]), col) for _ in range(1000)]
        lo, hi = np.quantile(bs, [.025, .975]); rows.append(dict(area=name, series="unharmonized" if col == "hot_raw" else "app (harmonized)", jump_factor_at_2012=round(est, 3), ci95_low=round(lo, 3), ci95_high=round(hi, 3)))
out = pd.DataFrame(rows); out.to_csv("results/validation_conaf/all_regions/jump_at_2012_app_areas.csv", index=False); print(out.to_string(index=False))
