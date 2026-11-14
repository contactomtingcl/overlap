# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Harmonization v1: quantile mapping MODIS (Aqua or Terra) -> VIIRS Suomi NPP in Biobío, with a hidden-years test.

Question: if we only had the MODIS sensor, how well could we reconstruct the Suomi NPP monthly hotspot count?
The source sensor is the 3rd argument (Aqua or Terra); "X" below is that sensor.

Design (fixed before looking at the test years):
- unit: daily regional totals of each sensor, mapped day by day, then summed to months
  (a month of X -> a month in "Suomi NPP-equivalent hotspots", the unit of the calendar)
- fit on 2012-01-20 to 2019-12-31, test on 2020-01-01 to 2026-07-30 (never seen when fitting)
- compared against: (0) no harmonization (raw X) and (1) simple ratio k = sum(SNPP) / sum(X)
- candidates: QM on daily totals; QM separately for day and night overpasses; QM on monthly totals;
  QM by season (Nov-Apr / May-Oct), with and without the day/night split.
- model selection uses the training years only: the candidate with the lowest leave-one-year-out MAE
  inside 2012-2019 is the selected model. The hidden years are then scored once for every candidate,
  so the test result of the selected model is not tuned on the test.

Quantile mapping with ties: most days have 0 or few hotspots, so the empirical CDF of X has
big jumps. Each distinct X value v occupies the probability band (F(v-), F(v)] and is mapped to the
mean of the Suomi NPP quantile function over that same band. This keeps the fitted total equal to the
Suomi NPP total in the training years and lets a zero-X day carry the small fires X cannot see.
Above the 99th percentile of the training values the map continues as a straight line with the ratio
observed in the top 1 % of days (rank matching there rests on a handful of extreme days).

Uncertainty: leave-one-year-out inside the training years gives out-of-sample monthly errors on the
log scale; the 10th-90th percentiles of those errors give an 80 % band, whose coverage is then
checked on the hidden years.

Terra: its orbit drifts to an earlier morning crossing since February 2020 (10:15 in October 2022, about
9:00 by December 2025), so the hidden years are also scored for 2020-2022 (near-nominal orbit) and 2023-2026
(drifted orbit). Terra is used for Nov 2000 - Jun 2002, when its orbit was nominal, so the 2020-2022 score
is the relevant one for that use.

Usage: python3 pipeline/06_quantile_mapping_to_snpp.py results/model_input/daily_cell_counts_chile.csv.gz results/harmonization Aqua
       python3 pipeline/06_quantile_mapping_to_snpp.py results/model_input/daily_cell_counts_chile.csv.gz results/harmonization Terra
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

src, out = Path(sys.argv[1]), Path(sys.argv[2])
SRC = sys.argv[3] if len(sys.argv) > 3 else "Aqua"
assert SRC in ("Aqua", "Terra"), SRC
PFX = f"{SRC.lower()}_snpp"
FIG = {"Aqua": "fig02", "Terra": "fig03"}[SRC]
out.mkdir(parents=True, exist_ok=True)

BIOBIO = dict(lat_min=-38.50, lat_max=-36.45, lon_min=-73.95, lon_max=-70.95)  # same box as 02
START, TRAIN_END, TEST_START, END = "2012-01-20", "2019-12-31", "2020-01-01", "2026-07-30"
RNG = np.random.default_rng(2026)

# ---------- data: daily regional totals, zeros filled ----------
c = pd.read_csv(src)
c = c[c.cell_lat.between(BIOBIO["lat_min"], BIOBIO["lat_max"])
      & c.cell_lon.between(BIOBIO["lon_min"], BIOBIO["lon_max"])
      & c.satellite.isin([SRC, "SNPP"])]
c = c.assign(satellite=c.satellite.replace({SRC: "X"}))
days = pd.date_range(START, END, freq="D").strftime("%Y-%m-%d")
daily = (c.pivot_table(index="date", columns=["satellite", "daynight"], values="n_hotspots",
                       aggfunc="sum", fill_value=0)
         .reindex(days, fill_value=0))
daily.columns = [f"{s}_{dn}" for s, dn in daily.columns]
for col in ["X_D", "X_N", "SNPP_D", "SNPP_N"]:
    if col not in daily:
        daily[col] = 0
daily["X"] = daily.X_D + daily.X_N
daily["SNPP"] = daily.SNPP_D + daily.SNPP_N
daily.index.name = "date"
daily["month"] = daily.index.str[:7]
daily["year"] = daily.index.str[:4].astype(int)
daily["fire_season"] = daily.index.str[5:7].astype(int).isin([11, 12, 1, 2, 3, 4])  # Nov-Apr
train_days = daily[daily.index <= TRAIN_END]
test_days = daily[daily.index >= TEST_START]


# ---------- tie-aware empirical quantile mapping ----------
def fit_qm(x, y, tail=0.01):
    """Return a lookup table (value -> mapped value) and a tail ratio, from paired-period samples x, y."""
    x, y = np.sort(np.asarray(x, float)), np.sort(np.asarray(y, float))
    n_x, n_y = len(x), len(y)
    vals, counts = np.unique(x, return_counts=True)
    cum_hi = np.cumsum(counts) / n_x
    cum_lo = cum_hi - counts / n_x
    # integral of the empirical quantile function of y between probabilities a and b
    cy = np.concatenate([[0.0], np.cumsum(y)]) / n_y

    def q_int(p):
        k = p * n_y
        i = np.floor(k).astype(int).clip(0, n_y - 1)
        return cy[i] + (k - i) * y[i] / n_y

    mapped = (q_int(cum_hi) - q_int(cum_lo)) / (cum_hi - cum_lo)
    # the top 1 % of days are too few to match rank by rank (a single extreme night drives the map),
    # so above the 99th percentile of x the map continues as a straight line with the top-days ratio
    x_t = np.quantile(x, 1 - tail)
    top_x = x >= x_t
    top_y = y >= np.quantile(y, 1 - tail)
    ratio = y[top_y].mean() / max(x[top_x].mean(), 1e-9)
    table = pd.Series(mapped, index=vals)
    table = table[table.index <= x_t]
    return table, ratio


def apply_qm(model, x):
    table, ratio = model
    x = np.asarray(x, float)
    xs, ys = table.index.values, table.values
    out_ = np.interp(x, xs, ys)  # values between training values: linear interpolation
    above = x > xs[-1]
    out_[above] = ys[-1] + (x[above] - xs[-1]) * ratio
    return out_


def predict(train, target, method):
    """Daily Suomi NPP-equivalent values for the rows of `target`, fitted only on `train`."""
    if method == "raw":
        return target.X.values.astype(float)
    if method == "ratio":
        return target.X.values * train.SNPP.sum() / train.X.sum()
    if method == "qm_daily":
        return apply_qm(fit_qm(train.X, train.SNPP), target.X)
    if method == "qm_daynight":
        return (apply_qm(fit_qm(train.X_D, train.SNPP_D), target.X_D)
                + apply_qm(fit_qm(train.X_N, train.SNPP_N), target.X_N))
    if method in ("qm_season", "qm_season_daynight"):
        out_ = np.zeros(len(target))
        cols = [("X", "SNPP")] if method == "qm_season" else [("X_D", "SNPP_D"), ("X_N", "SNPP_N")]
        for season in (True, False):
            f, t = train[train.fire_season == season], target.fire_season.values == season
            for a, v in cols:
                if t.any():
                    out_[t] += apply_qm(fit_qm(f[a], f[v]), target[a].values[t])
        return out_
    raise ValueError(method)


def monthly(train, target, method):
    if method == "qm_monthly":
        tm = train.groupby("month")[["X", "SNPP"]].sum()
        gm = target.groupby("month")[["X", "SNPP"]].sum()
        return pd.Series(apply_qm(fit_qm(tm.X, tm.SNPP, tail=0.05), gm.X), index=gm.index)
    p = pd.Series(predict(train, target, method), index=target.index)
    return p.groupby(target.month).sum()


METHODS = {"raw": f"No harmonization (raw {SRC})", "ratio": "Simple ratio",
           "qm_daily": "Quantile mapping, daily",
           "qm_daynight": "Quantile mapping, daily, day and night separately",
           "qm_monthly": "Quantile mapping, monthly totals",
           "qm_season": "Quantile mapping, daily, by season (Nov-Apr / May-Oct)",
           "qm_season_daynight": "Quantile mapping, daily, by season and day/night"}

# ---------- out-of-sample errors inside the training years (leave one year out) ----------
loyo = []
for yr in sorted(train_days.year.unique()):
    fit, hold = train_days[train_days.year != yr], train_days[train_days.year == yr]
    obs = hold.groupby("month").SNPP.sum()
    for m in METHODS:
        pred = monthly(fit, hold, m)
        loyo.append(pd.DataFrame({"method": m, "month": obs.index, "obs": obs.values, "pred": pred.values}))
loyo = pd.concat(loyo)
loyo["logerr"] = np.log((loyo.obs + 1) / (loyo.pred + 1))
loyo_summary = (loyo.assign(abserr=(loyo.pred - loyo.obs).abs(), abslog=loyo.logerr.abs())
                .groupby("method").agg(MAE=("abserr", "mean"), mean_abs_log_error=("abslog", "mean"),
                                       total_bias_pct=("pred", "sum")))
loyo_summary["total_bias_pct"] = 100 * (loyo_summary.total_bias_pct / loyo.groupby("method").obs.sum() - 1)
SEL = loyo_summary.drop(["raw", "ratio"]).MAE.idxmin()  # chosen on training years only
band = loyo.groupby("method").logerr.quantile([.1, .9]).unstack()
band.columns = ["q10", "q90"]

# ---------- hidden-years test ----------
obs_test = test_days.groupby("month").SNPP.sum()
src_test = test_days.groupby("month").X.sum()
pred = pd.DataFrame({"month": obs_test.index, "source": src_test.values, "snpp_observed": obs_test.values})
for m in METHODS:
    p = monthly(train_days, test_days, m).values
    pred[m] = p
    pred[m + "_low"] = np.maximum((p + 1) * np.exp(band.loc[m, "q10"]) - 1, 0)
    pred[m + "_high"] = (p + 1) * np.exp(band.loc[m, "q90"]) - 1


def metrics(o, p, lo, hi):
    o, p = np.asarray(o, float), np.asarray(p, float)
    le = np.log((p + 1) / (o + 1))
    return {"MAE": np.mean(np.abs(p - o)), "RMSE": np.sqrt(np.mean((p - o) ** 2)),
            "total_bias_pct": 100 * (p.sum() - o.sum()) / o.sum(),
            "mean_abs_log_error": np.mean(np.abs(le)),
            "typical_factor_error": np.exp(np.median(np.abs(le))),
            "months_within_factor_1.5_pct": 100 * np.mean(np.abs(le) <= np.log(1.5)),
            "spearman": pd.Series(o).corr(pd.Series(p), method="spearman"),
            "band80_coverage_pct": 100 * np.mean((o >= lo) & (o <= hi))}


rows = []
year = pred.month.str[:4]
for m, label in METHODS.items():
    r = {"method": m, "label": label, "selected": m == SEL, "months": len(pred)}
    r.update(metrics(pred.snpp_observed, pred[m], pred[m + "_low"], pred[m + "_high"]))
    ann_o = pred.groupby(year).snpp_observed.sum()
    ann_p = pred.groupby(year)[m].sum()
    r["annual_mean_abs_pct_error"] = 100 * np.mean(np.abs(ann_p - ann_o) / ann_o)
    quiet = pred.snpp_observed < 100
    r["MAE_quiet_months(<100)"] = np.mean(np.abs(pred[m] - pred.snpp_observed)[quiet])
    r["MAE_busy_months(>=100)"] = np.mean(np.abs(pred[m] - pred.snpp_observed)[~quiet])
    rows.append(r)
res = pd.DataFrame(rows)

# the same metrics by sub-period of the hidden years (Terra orbit drift: near-nominal vs drifted)
per_rows = []
for per, (a, b) in {"2020-2026": ("2020", "2026"), "2020-2022 (Terra near-nominal orbit)": ("2020", "2022"),
                    "2023-2026 (Terra drifted orbit)": ("2023", "2026")}.items():
    sub = pred[(year >= a) & (year <= b)]
    for m in METHODS:
        r = {"period": per, "method": m, "selected": m == SEL, "months": len(sub)}
        r.update(metrics(sub.snpp_observed, sub[m], sub[m + "_low"], sub[m + "_high"]))
        per_rows.append(r)
res_period = pd.DataFrame(per_rows)

# block bootstrap by year: is the primary model better than the simple ratio?
years = year.unique()
d_mae, d_log = [], []
for _ in range(2000):
    pick = RNG.choice(years, len(years))
    s = pd.concat([pred[year == y] for y in pick])
    d_mae.append(np.mean(np.abs(s[SEL] - s.snpp_observed)) - np.mean(np.abs(s.ratio - s.snpp_observed)))
    d_log.append(np.mean(np.abs(np.log((s[SEL] + 1) / (s.snpp_observed + 1))))
                 - np.mean(np.abs(np.log((s.ratio + 1) / (s.snpp_observed + 1)))))
boot = pd.DataFrame({"comparison": [f"{SEL} minus ratio: MAE", f"{SEL} minus ratio: mean abs log error"],
                     "estimate": [np.mean(np.abs(pred[SEL] - pred.snpp_observed))
                                  - np.mean(np.abs(pred.ratio - pred.snpp_observed)),
                                  res.set_index("method").loc[SEL, "mean_abs_log_error"]
                                  - res.set_index("method").loc["ratio", "mean_abs_log_error"]],
                     "ci95_low": [np.quantile(d_mae, .025), np.quantile(d_log, .025)],
                     "ci95_high": [np.quantile(d_mae, .975), np.quantile(d_log, .975)],
                     "share_of_resamples_qm_better": [np.mean(np.array(d_mae) < 0), np.mean(np.array(d_log) < 0)]})

# ---------- final maps for the app: refitted on the whole overlap (2012-2026) ----------
# One table per overpass (D = day, N = night, all = daily total) and season (all year, Nov-Apr, May-Oct);
# the selected model tells which tables to use. Above the last value in a table:
# last snpp_equivalent + (x - last value) * tail_ratio.
finals = []
for season, mask in {"all_year": slice(None), "nov_apr": daily.fire_season, "may_oct": ~daily.fire_season}.items():
    dd = daily[mask]
    for part, (a, v) in {"D": ("X_D", "SNPP_D"), "N": ("X_N", "SNPP_N"), "all": ("X", "SNPP")}.items():
        tab, tail_ratio = fit_qm(dd[a], dd[v])
        f = tab.rename("snpp_equivalent").rename_axis("source_daily_hotspots").reset_index()
        f.insert(0, "overpass", part)
        f.insert(0, "season", season)
        f.insert(0, "source", SRC)
        f["tail_ratio"] = tail_ratio
        finals.append(f)
final = pd.concat(finals)
final["selected_model"] = SEL
final["fitted_on"] = f"{START} to {END}"

# ---------- save ----------
res.round(3).to_csv(out / f"{PFX}_test_metrics.csv", index=False)
res_period.round(3).to_csv(out / f"{PFX}_test_metrics_by_period.csv", index=False)
boot.round(3).to_csv(out / f"{PFX}_bootstrap_qm_vs_ratio.csv", index=False)
pred.round(1).to_csv(out / f"{PFX}_test_monthly_predictions.csv", index=False)
band.round(4).rename_axis("method").to_csv(out / f"{PFX}_band_loyo.csv")
loyo_summary.round(3).to_csv(out / f"{PFX}_loyo_2012_2019_metrics.csv")
final.round(3).to_csv(out / f"{PFX}_qm_tables_final.csv", index=False)

# ---------- figure ----------
fig = plt.figure(figsize=(14, 8.2))
gs = fig.add_gridspec(2, 3, height_ratios=[1.25, 1])
ax = fig.add_subplot(gs[0, :])
t = pd.to_datetime(pred.month)
ax.fill_between(t, pred[SEL + "_low"], pred[SEL + "_high"], color="#2f9e44", alpha=.18, lw=0,
                label="Quantile mapping, 80 % band")
ax.plot(t, pred.snpp_observed, color="#d9480f", lw=1.8, label="Suomi NPP observed (hidden)")
ax.plot(t, pred[SEL], color="#2f9e44", lw=1.3, label=f"Quantile mapping from {SRC}")
ax.plot(t, pred.ratio, color="#7048e8", lw=1, ls="--", label=f"Simple ratio from {SRC}")
ax.plot(t, pred.raw, color="#1c7ed6", lw=1, alpha=.8, label=f"Raw {SRC} (no harmonization)")
ax.set_yscale("symlog", linthresh=10)
ax.set_ylabel("Hotspots per month (symlog)")
ax.set_title(f"Biobío, hidden years 2020-2026: reconstructing Suomi NPP from MODIS {SRC} (fitted on 2012-2019 only)")
ax.legend(frameon=False, ncol=3, fontsize=9, loc="upper right")
ax.grid(alpha=.3)

ax2 = fig.add_subplot(gs[1, 0])
for m, col, lab in [("ratio", "#7048e8", "Simple ratio"), (SEL, "#2f9e44", "Quantile mapping")]:
    ax2.scatter(pred.snpp_observed + 1, pred[m] + 1, s=14, alpha=.65, color=col, label=lab)
lim = [1, pred[["snpp_observed", "ratio", SEL]].max().max() * 1.5]
ax2.plot(lim, lim, color="#868e96", lw=1, ls="--")
ax2.set_xscale("log"); ax2.set_yscale("log")
ax2.set_xlabel("Observed Suomi NPP + 1"); ax2.set_ylabel("Predicted + 1")
ax2.set_title("Month by month, hidden years")
ax2.legend(frameon=False, fontsize=8); ax2.grid(alpha=.3, which="both")

ax3 = fig.add_subplot(gs[1, 1])
xs = np.arange(0, 121)
k = train_days.SNPP.sum() / train_days.X.sum()
ax3.plot(xs, apply_qm(fit_qm(train_days.X_D, train_days.SNPP_D), xs), color="#2f9e44", lw=1.6,
         label="Quantile map, day overpass")
ax3.plot(xs, apply_qm(fit_qm(train_days.X_N, train_days.SNPP_N), xs), color="#2f9e44", lw=1.6, ls=":",
         label="Quantile map, night overpass")
ax3.plot(xs, xs * k, color="#7048e8", lw=1, ls="--", label=f"Ratio k = {k:.2f}")
ax3.set_xlabel(f"{SRC} hotspots in one day"); ax3.set_ylabel("Suomi NPP-equivalent")
ax3.set_title("Day/night maps learned on 2012-2019 (all seasons)")
ax3.legend(frameon=False, fontsize=8); ax3.grid(alpha=.3)

ax4 = fig.add_subplot(gs[1, 2]); ax4.axis("off")
show = res.set_index("method").loc[["raw", "ratio", SEL]]
txt = "Hidden years 2020-2026 ({} months)\n\n".format(int(show.months.iloc[0]))
txt += f"{'':18}{'raw':>9}{'ratio':>9}{'QM':>9}\n"
for col, lab, fmt in [("MAE", "MAE (hotspots)", "{:.0f}"), ("total_bias_pct", "Total bias %", "{:+.0f}"),
                      ("typical_factor_error", "Typical factor", "x{:.2f}"),
                      ("months_within_factor_1.5_pct", "Within x1.5 (%)", "{:.0f}"),
                      ("band80_coverage_pct", "80% band cover.", "{:.0f}")]:
    txt += f"{lab:18}" + "".join(f"{fmt.format(show.loc[m, col]):>9}" for m in show.index) + "\n"
ax4.text(0, 1, txt, family="monospace", fontsize=9.5, va="top")
fig.text(0.01, 0.005, "Standard FIRMS data, type 0, low confidence removed. Biobío = approximate box "
         "(0.1-degree cells). Data: NASA FIRMS.", fontsize=8, color="#666")
fig.tight_layout(rect=(0, 0.02, 1, 1))
fig.savefig(out / f"{FIG}_biobio_qm_{SRC.lower()}_hidden_years.png", dpi=150)

pd.set_option("display.width", 250)
print(res.round(3).to_string(index=False))
print(boot.round(3).to_string(index=False))
print(res_period[res_period.method.isin(["raw", "ratio", SEL])].round(3).to_string(index=False))
print(band.round(3))
print("Leave-one-year-out inside 2012-2019:"); print(loyo_summary.round(3))
print(f"{SRC}: selected on training years: {SEL}; ratio k (train) = {k:.3f}")
