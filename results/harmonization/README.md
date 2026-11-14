# Harmonization v1: quantile mapping to Suomi NPP (Biobío)

Produced by `pipeline/06_quantile_mapping_to_snpp.py` or its R twin `pipeline/06_quantile_mapping_to_snpp.R` (same results; only the bootstrap intervals differ slightly because of the random generator). One run per source sensor: `Aqua`, `Terra`.

**Question.** If we only had a MODIS sensor, how well could we reconstruct the monthly Suomi NPP hotspot count?

**Test design.** Fitted on 2012-01-20 to 2019-12-31; scored on 2020-01 to 2026-07 (79 months never seen when fitting). Baselines: raw MODIS counts and a simple ratio k = sum(SNPP) / sum(MODIS) over the training years. The model is selected using the training years only (lowest leave-one-year-out MAE inside 2012–2019); the hidden years are scored once for every candidate.

**Method.** Empirical quantile mapping of daily regional totals, then summed to months. Ties (many days with 0 or few hotspots) are handled by mapping each MODIS value to the mean of the Suomi NPP quantile function over the same probability band. Above the 99th percentile, the map continues as a straight line with the ratio of the top 1 % of days. The 80 % band comes from leave-one-year-out errors inside the training years.

## Results on the hidden years 2020–2026 (79 months)

| Source | Method | MAE (hotspots/month) | Total bias | Typical factor error | Months within ×1.5 | 80 % band coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Aqua | raw | 890 | −81 % | ×5.48 | 0 % | — |
| Aqua | simple ratio (k = 4.40) | 326 | −16 % | ×1.43 | 59 % | 76 % |
| Aqua | **QM day/night (selected)** | **176** | **−9 %** | **×1.15** | **82 %** | 76 % |
| Terra | raw | 994 | −90 % | ×11.29 | 0 % | — |
| Terra | simple ratio (k = 13.33) | 649 | +28 % | ×1.60 | 35 % | 78 % |
| Terra | **QM season × day/night (selected)** | **407** | **+9 %** | **×1.55** | **46 %** | 70 % |

Block bootstrap by year (2,000 resamples), selected model minus simple ratio, MAE: Aqua −150 (95 % CI −273 to −68), Terra −242 (95 % CI −578 to −44). On the log scale the improvement is smaller and its 95 % interval includes zero for both sensors (`*_bootstrap_qm_vs_ratio.csv`).

**Terra and its orbit drift.** Terra has drifted to an earlier morning overpass since February 2020 (10:15 in October 2022, about 9:00 by December 2025). Terra is only needed for November 2000 – June 2002, when its orbit was nominal. On 2020–2022 (near-nominal orbit) the selected model has MAE 276 vs 350 for the ratio, bias +13 %, and an 80 % band that covers 81 % of months. On 2023–2026 (drifted orbit) coverage falls to 60 %. See `terra_snpp_test_metrics_by_period.csv`.

## Limitations

1. **Quiet months are overestimated.** A day with zero MODIS hotspots maps to 1–3 Suomi NPP hotspots in every season, so months with fewer than 100 hotspots get a higher error than with the simple ratio (Aqua: 71 vs 15).
2. **Terra is much less certain than Aqua.** Its typical error is a factor of 1.55 against 1.15, and its band is about twice as wide. The first 20 months of the calendar (Terra only) should be shown with that wider band.
3. **Biobío is an approximate box built from 0.1° cells**, about 1.5 % larger than the point-based box in `biobio_monthly_aqua_snpp.csv`. All methods use the same data, so the comparison is fair, but the absolute numbers will change with the official boundary.

## Files

| File | Content |
| --- | --- |
| `{aqua,terra}_snpp_test_metrics.csv` | All candidates on the hidden years |
| `{aqua,terra}_snpp_test_metrics_by_period.csv` | Same, split 2020–2022 / 2023–2026 |
| `{aqua,terra}_snpp_test_monthly_predictions.csv` | Month-by-month predictions and 80 % bands |
| `{aqua,terra}_snpp_loyo_2012_2019_metrics.csv` | Leave-one-year-out scores used for model selection |
| `{aqua,terra}_snpp_band_loyo.csv` | Log-error percentiles that define the 80 % band |
| `{aqua,terra}_snpp_bootstrap_qm_vs_ratio.csv` | Bootstrap comparison against the simple ratio |
| `{aqua,terra}_snpp_qm_tables_final.csv` | Maps refitted on 2012–2026 for the app (by season and overpass; `selected_model` says which to use) |
| `fig02_biobio_qm_aqua_hidden_years.png`, `fig03_biobio_qm_terra_hidden_years.png` | Figures |
