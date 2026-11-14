# Validation against CONAF in all 16 regions

Produced by `pipeline/15_conaf_validation_all_regions.R`. CONAF records 2002-07 to 2020-06, all regions (109,947 fires; six comunas spelled differently in CONAF are mapped to their official names, e.g. Coihaique → Coyhaique, Llay-Llay → Llaillay). Harmonized series: Maule, Biobío, Araucanía and Ñuble with their own quantile maps; the other 12 regions with the map pooled from those four (`results/harmonization_qmap/pooled`). For the other 12, each region's own simple ratio is shown as an alternative. Same jump test as in `../README.md` (1,000 bootstrap replicates by season).

## Jump at the 2012 sensor change (1 = no jump)

| Group | Unharmonized | Own simple ratio | Quantile map |
| --- | --- | --- | --- |
| Calibrated 4 regions (76,002 fires) | ×4.71 (4.05–5.68) | — | ×0.89 (0.77–1.06) |
| Other regions with ≥ 200 CONAF fires: Coquimbo, Valparaíso, O'Higgins, Los Lagos, Aysén, Metropolitana, Los Ríos (33,580 fires) | ×3.37 (2.95–3.90) | ×1.00 (0.85–1.18) | ×0.90 (0.78–1.06) |
| All 16 regions | ×4.41 (4.07–4.84) | ×1.38 (1.21–1.58) | ×1.29 (1.14–1.44) |

By region (quantile map; 95 % CI):

| Region | CONAF fires | Unharmonized | Quantile map | Reading |
| --- | --- | --- | --- | --- |
| Maule * | 10,111 | ×5.53 | ×0.90 (0.73–1.10) | jump removed |
| Biobío * | 38,052 | ×5.49 | ×1.01 (0.85–1.20) | jump removed |
| Araucanía * | 19,689 | ×4.11 | ×0.92 (0.69–1.32) | jump removed |
| Ñuble * | 8,150 | ×4.85 | ×0.93 (0.76–1.13) | jump removed |
| Coquimbo | 1,151 | ×4.66 | ×1.10 (0.82–1.48) | jump removed |
| O'Higgins | 4,366 | ×4.28 | ×0.79 (0.60–1.01) | jump removed |
| Los Ríos | 1,816 | ×2.50 | ×0.77 (0.57–1.09) | jump removed |
| Aysén | 281 | ×1.29 | ×0.64 (0.41–1.02) | little jump to begin with; slightly overcorrected |
| Valparaíso | 14,861 | ×4.05 | ×0.74 (0.61–0.88) | overcorrected: before 2012 about 25 % too high |
| Los Lagos | 2,908 | ×2.09 | ×0.64 (0.45–0.92) | overcorrected: before 2012 about 35 % too high |
| Metropolitana | 8,197 | ×6.74 | ×1.76 (1.33–2.39) | undercorrected: a jump of about ×1.8 remains |
| Tarapacá, Antofagasta, Atacama, Magallanes, Arica y Parinacota | 10–196 each | ×2.9–×10.0 | ×1.6–×4.3 | too few CONAF fires to judge; jump remains |

\* calibrated region (own map).

## As used in the app

The app keeps the pooled quantile map only where it beat the region's own ratio on hidden years (`pipeline/11`); Los Ríos, Los Lagos and Aysén use their own simple ratio. Against CONAF, for the series the app shows: Los Ríos ×0.97 (0.73–1.33), Los Lagos ×0.74 (0.51–1.08), Aysén ×0.67 (0.43–1.03), so the jump is removed in 9 of the 11 regions with enough fires; Valparaíso (×0.74, years before 2012 about 35 % too high, since 1/0.74 = 1.35) and Metropolitana (×1.76, about 43 % too low, since 1/1.76 = 0.57) are not. The app and the GeoPackage show this verdict per region (`pipeline/03`, `pipeline/13`).

## Reading

- **In the 11 regions with enough CONAF records (99.7 % of the fires), harmonization removes almost all of the false jump**: from ×2.1–×6.7 unharmonized to ×0.64–×1.76. In 8 of the 11 the 95 % interval includes 1.
- **Where it does not:** Valparaíso and Los Lagos are overcorrected (the MODIS years come out 25–35 % too high), and Metropolitana keeps a jump of about ×1.8. In Metropolitana VIIRS may be picking up small urban-interface and agricultural burns that CONAF does not record; this needs checking before trusting its pre-2012 values.
- **In the north and in Magallanes** CONAF has only 10–196 fires, so the test cannot judge the harmonization, and a large jump remains. In Antofagasta and Atacama part of the Suomi NPP hotspots are desert false detections. The app should mark these regions as not validated.
- **For the other regions, the pooled quantile map and the simple ratio perform about the same against CONAF** (×0.90 vs ×1.00); the pooled map had the lower monthly error in the hidden-years test (`results/harmonization_qmap/pooled`).
- **Large fires (≥ 200 ha):** in the regions that have them, MODIS Aqua had a hotspot in the same comuna and month for 75–100 % of the fires of 2002–2012, and Suomi NPP for 97–100 % of those of 2012–2020 (`spearman_hit_rate_all_regions.csv`; coarse rate).

| File | Content |
| --- | --- |
| `jump_at_2012_all_regions.csv` | Jump by region and group, three series, with Spearman over 2002–2020 |
| `spearman_hit_rate_all_regions.csv` | Spearman by era and hit rate of fires ≥ 200 ha, by region |
| `region_month_all_regions.csv` | Region-month table used |
| `jump_at_2012_all_regions.png` | Figure |
