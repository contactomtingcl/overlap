# Validation against CONAF fire records

Produced by `pipeline/10_conaf_validation.R`. CONAF comunas are matched to comuna codes by name, ignoring accents and case (Ránquil is spelled without the accent in `comunas_lookup.csv`); every fire of the four regions is matched. CONAF records: seasons 2002–03 to 2019–20, regions Maule (7), Biobío (8), Araucanía (9) and Ñuble (16), 76,002 fires (`data/conaf/conaf_incendios_chile_2002_2020.csv.gz`). Hotspots: the harmonized monthly series from `results/normal` and raw monthly counts per comuna.

## 1. Harmonization removes the false jump at the 2012 sensor change

Region-month regression of log(1 + hotspots) on CONAF burned area and number of fires (log scale), region and calendar month, plus an indicator for the Suomi NPP era (from 2012-02). Its exponential is the jump in hotspots per unit of real fire activity at the sensor change; 1 means no jump. 95 % CI from a bootstrap over fire seasons.

| Zone | Unharmonized (Aqua, then Suomi NPP) | Harmonized (Suomi NPP-equivalent) |
| --- | --- | --- |
| All four regions | ×4.71 (4.09–5.64) | ×0.89 (0.77–1.07) |
| Maule | ×5.53 (4.47–6.95) | ×0.90 (0.73–1.12) |
| Biobío | ×5.49 (4.62–6.60) | ×1.01 (0.84–1.22) |
| Araucanía | ×4.11 (3.19–5.50) | ×0.92 (0.69–1.30) |
| Ñuble | ×4.85 (3.94–6.04) | ×0.93 (0.76–1.13) |

Against independent ground records, joining the sensors without treatment creates a false increase of about ×4.7 in 2012; after harmonization the 95 % interval includes 1 in every region.

## 2. Rank correlation with CONAF (Spearman)

| Scale | Period | vs number of fires | vs burned area |
| --- | --- | --- | --- |
| Region-month | Aqua era 2002–2012 | 0.27 | 0.35 |
| Region-month | Suomi NPP era 2012–2020 | 0.48 | 0.55 |
| Region-month | 2002–2020, unharmonized | 0.33 | 0.39 |
| Region-month | 2002–2020, harmonized | 0.36 | 0.44 |
| Comuna-month | Aqua era (Aqua counts) | 0.10 | 0.13 |
| Comuna-month | Suomi NPP era (Suomi NPP counts) | 0.23 | 0.28 |

All four regions pooled; by region in `spearman_vs_conaf.csv` (Araucanía highest, 0.58–0.74 at region-month; Maule and Ñuble lowest). The correlations are moderate because the two records count different things: hotspots include agricultural and other burns that CONAF does not record as forest fires (in Maule and Ñuble the hotspot peak is in April–May, the autumn burning season), and CONAF records many small fires no satellite sees. Suomi NPP tracks CONAF better than Aqua. At comuna-month scale, correlations are weak, so region-month is the scale for monthly comparisons and the comuna is useful only for locating individual fires.

## 3. Hit rate (coarse): a hotspot in the same comuna and month as the fire start

| Fire size | Aqua, fires 2002–2012 | Aqua, fires 2012–2020 | Suomi NPP, fires 2012–2020 |
| --- | --- | --- | --- |
| < 1 ha | 40 % | 42 % | 75 % |
| 1–10 ha | 52 % | 59 % | 87 % |
| 10–200 ha | 70 % | 77 % | 94 % |
| ≥ 200 ha (CONAF "incendio de magnitud") | 93 % | 96 % | 99.7 % |

This rate is lenient (a hotspot anywhere in the comuna that month counts, including from another burn), so the low size classes are inflated. The strict, point-based rate (hotspot within 3 km, from 1 day before to 2 days after the start) for Biobío is in `results/validation/conaf_detection_rate.csv`: ≥ 200 ha detected 88 % by Aqua and 97 % by Suomi NPP. Both agree: large fires are almost always seen, including in the MODIS-only years.

| File | Content |
| --- | --- |
| `jump_at_2012_vs_conaf.csv` | Section 1 |
| `spearman_vs_conaf.csv` | Section 2, all regions and scales |
| `hit_rate_comuna_month.csv`, `hit_rate_200ha_by_region.csv` | Section 3 |
| `region_month_conaf_vs_hotspots.csv` | The region-month table used |
| `conaf_validation.png` | Figure |
