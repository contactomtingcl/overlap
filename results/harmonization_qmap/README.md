# Equivalence v1 by zone (R package qmap)

Produced by `pipeline/07_qmap_monthly_region.R` (one run per region and sensor, one folder each) and `pipeline/08_qmap_regions_summary_loro.R` (combined tables and the leave-one-region-out test).

**Data.** `results/model_input/monthly_comuna_counts_chile.csv.gz`: monthly hotspots per region (official boundary via comunas), day and night together. Regions: Biobío (8), Ñuble (16), Maule (7), Araucanía (9). Each sensor is calibrated directly against Suomi NPP on its own overlap, never in a chain.

**Test design.** Fit on the earlier years, test on later years never used to fit. Aqua and Terra: fit 2012-02 to 2019-12, test 2020-01 to 2026-07 (79 months). NOAA-20: fit 2018-04 to 2022-12, test 2023-01 to 2026-07. NOAA-21: fit 2023-03 to 2024-12, test 2025-01 to 2026-07 (only two fitting years: a weak test). Quantile mapping with `fitQmapQUANT` / `doQmapQUANT` on log(1 + hotspots), `qstep = 0.05`, `wet.day = FALSE`. The 80 % interval is a bootstrap by fitting years with out-of-bag errors.

## Test results: MAE of log(1 + hotspots), lower is better

| Sensor | Region | No harmonization | Simple ratio | Quantile mapping | QM by season | QM total bias | QM 80 % coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aqua | Biobío (8) | 1.75 | 0.43 | 0.38 | 0.37 | -11 % | 73 % |
| Aqua | Ñuble (16) | 1.73 | 0.66 | 0.42 | 0.43 | -14 % | 82 % |
| Aqua | Maule (7) | 1.94 | 0.49 | 0.35 | 0.35 | -17 % | 77 % |
| Aqua | Araucanía (9) | 1.52 | 0.43 | 0.39 | 0.39 | -10 % | 80 % |
| Terra | Biobío (8) | 2.51 | 0.81 | 0.58 | 0.54 | +1 % | 73 % |
| Terra | Ñuble (16) | 2.66 | 1.12 | 0.88 | 0.83 | +12 % | 75 % |
| Terra | Maule (7) | 2.70 | 0.88 | 0.39 | 0.36 | +2 % | 90 % |
| Terra | Araucanía (9) | 2.56 | 1.35 | 0.92 | 0.79 | +72 % | 68 % |
| NOAA20 | Biobío (8) | 0.21 | 0.21 | 0.20 | 0.23 | -7 % | 81 % |
| NOAA20 | Ñuble (16) | 0.26 | 0.26 | 0.26 | 0.31 | +3 % | 70 % |
| NOAA20 | Maule (7) | 0.22 | 0.22 | 0.19 | 0.20 | +3 % | 79 % |
| NOAA20 | Araucanía (9) | 0.20 | 0.20 | 0.20 | 0.21 | +4 % | 88 % |
| NOAA21 | Biobío (8) | 0.20 | 0.21 | 0.22 | 0.22 | -12 % | 79 % |
| NOAA21 | Ñuble (16) | 0.22 | 0.21 | 0.25 | 0.26 | +3 % | 84 % |
| NOAA21 | Maule (7) | 0.13 | 0.13 | 0.13 | 0.18 | -1 % | 95 % |
| NOAA21 | Araucanía (9) | 0.11 | 0.11 | 0.17 | 0.26 | +0 % | 95 % |

Reading: an MAE of 0.40 on log(1 + hotspots) means a typical monthly error of about a factor of 1.5.

- **Aqua:** quantile mapping beats the simple ratio in all four regions; its total bias is −10 to −17 %. Splitting by season adds nothing for Aqua, so the all-year map is the default.
- **Terra:** quantile mapping is the best option, but outside Maule its errors are 1.5 to 2.4 times Aqua's and the bias reaches +72 % in Araucanía. Terra passes in the morning and its orbit has drifted since 2020, so it is flagged as less comparable.
- **NOAA-20 and NOAA-21:** the simple ratio is close to 1.0 (0.98–1.08) and no method beats no harmonization by much. The three VIIRS sensors are interchangeable within a monthly error of about 20–25 % (never summed).
- **High season** (calendar months holding ≥ 70 % of Suomi NPP hotspots in the fitting years) is not always summer: in Maule it is January, April and May, and in Ñuble January and March–May, because autumn agricultural burning produces many hotspots. See each folder's `run_info.txt`.

## Leave one region out (Aqua and Terra; test years)

Fitted on the other three regions pooled (2012–2019) and applied to the held-out region in 2020–2026: out of sample in space and time at once.

| Sensor | Held-out region | Ratio, own region | QM, own region | Ratio, other regions | QM, other regions |
| --- | --- | --- | --- | --- | --- |
| Aqua | Biobío (8) | 0.43 | 0.38 | 0.50 | 0.38 |
| Aqua | Ñuble (16) | 0.66 | 0.42 | 0.59 | 0.42 |
| Aqua | Maule (7) | 0.49 | 0.35 | 0.64 | 0.45 |
| Aqua | Araucanía (9) | 0.43 | 0.39 | 0.39 | 0.40 |
| Terra | Biobío (8) | 0.81 | 0.58 | 0.84 | 0.63 |
| Terra | Ñuble (16) | 1.12 | 0.88 | 1.14 | 0.81 |
| Terra | Maule (7) | 0.88 | 0.39 | 0.81 | 0.53 |
| Terra | Araucanía (9) | 1.35 | 0.92 | 1.31 | 0.83 |

For Aqua, the map fitted on the other regions is as good as the region's own map in Biobío, Ñuble and Araucanía, and better than the region's own ratio in three of four regions; Maule is the exception (0.45 vs 0.35). The method transfers to regions where it was not fitted, with some loss.

## Files

| File | Content |
| --- | --- |
| `metrics_all.csv` | All regions, sensors and methods on the test years |
| `quantiles_all.csv` | Quantile tables: zone, season_group, sensor, fit_period, quantile, sensor_value, snpp_value (fit period used for the test, and the whole overlap for the app) |
| `leave_one_region_out.csv`, `leave_one_region_out.png` | Spatial test |
| `region_XX_sensor/` | Per run: metrics, quantiles, monthly test predictions with 80 % intervals, figure, run info |
