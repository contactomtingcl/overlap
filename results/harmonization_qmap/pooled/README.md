# Pooled quantile map for the other regions

Produced by `pipeline/11_qmap_pooled.R`. One quantile map per sensor fitted on the region-months of Maule (7), Biobío (8), Araucanía (9) and Ñuble (16) together, to replace the simple ratio in the regions that have no map of their own. Same settings as `07` (log(1 + monthly hotspots), `qstep = 0.05`, `wet.day = FALSE`, all months together) and the same table format: `quantiles_pooled.csv`, zone `pooled_regions_07_08_09_16`, season_group `all_year`, for the fitting period of the test and for the whole overlap (use the latter in the app).

**Apply it region by region and add the harmonized results; never apply it to a national total** (a national month is far outside the range of region-months it was fitted on).

## Test in the 12 regions where it was not fitted

Fitted on the four regions in 2012-02 to 2019-12, applied to each other region in 2020-01 to 2026-07 (out of sample in space and time). MAE of log(1 + hotspots), lower is better:

| Region | Simple ratio of the region | Pooled quantile map | Pooled map, total bias |
| --- | --- | --- | --- |
| Tarapacá (1) | 1.29 | 0.63 | +1 % |
| Antofagasta (2) | 1.50 | 1.12 | -73 % |
| Atacama (3) | 1.05 | 0.82 | -25 % |
| Coquimbo (4) | 1.18 | 0.80 | -7 % |
| Valparaíso (5) | 1.05 | 0.59 | -21 % |
| O'Higgins (6) | 0.85 | 0.58 | -20 % |
| Los Lagos (10) | 0.71 | 0.76 | +44 % |
| Aysén (11) | 0.41 | 1.12 | +168 % |
| Magallanes (12) | 1.21 | 0.75 | -22 % |
| Metropolitana (13) | 1.13 | 0.65 | -32 % |
| Los Ríos (14) | 0.79 | 0.94 | +12 % |
| Arica y Parinacota (15) | 1.35 | 0.73 | +33 % |

MODIS Aqua shown; Terra, NOAA-20 and NOAA-21 in `test_other_regions.csv`.

- **Aqua:** the pooled map beats the region's own ratio in 9 of 12 regions; median MAE 0.76 against 1.09 for the own ratio and 1.78 unharmonized. It loses in the three southern regions with few or different fires: Los Lagos (slightly), Los Ríos, and above all Aysén, where it overestimates by about +168 %: a zero or near-zero Aqua month maps to a few Suomi NPP-equivalent hotspots, which is a lot for a region that has very few.
- **Terra:** the same pattern, also 9 of 12 (median MAE 1.01 against 1.46), with larger errors.
- **NOAA-20 and NOAA-21:** no method beats leaving them as they are; use them without harmonization.
- **Errors outside the four calibrated regions are larger** (median MAE 0.76, a factor of about 2.1, against 0.35–0.42 in the calibrated regions), so the app should show wider uncertainty there. In Antofagasta and Atacama part of the Suomi NPP counts are desert false detections, which no MODIS map can reproduce.
