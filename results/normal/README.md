# What is normal, by region

Produced by `pipeline/09_normal_by_region.R`. Regions: Biobío (8), Ñuble (16), Maule (7), Araucanía (9).

**Harmonized monthly series** (`harmonized_monthly_with_anomaly.csv`), in Suomi NPP-equivalent hotspots, 2000-11 to 2026-07: Suomi NPP observed from 2012-02; MODIS Aqua mapped to Suomi NPP from 2002-07 to 2012-01; MODIS Terra mapped to Suomi NPP from 2000-11 to 2002-06 (less comparable). Maps: `qmap` on log(1 + monthly hotspots), fitted on the whole overlap 2012-02 to 2026-07, the same settings validated in `results/harmonization_qmap`. The `source` column says which sensor each month comes from.

**Normal** (`normal_by_region.csv`): for each region and month of the fire season (July = 1 … June = 12), over the seasons 2000-01 to 2025-26 (25–26 values per month): median, MAD (scaled by 1.4826), 10th and 90th percentiles, and the median from Suomi NPP observations only (2012-13 to 2025-26) as a check.

**Anomaly**: robust z on the log scale, `(log1p(x) − median of log1p) / MAD of log1p`; |z| ≥ 2 is flagged as unusually high or low. On the log scale, doubling a quiet month and doubling a busy month are anomalies of the same size.

## Check: harmonized normal vs Suomi NPP-only normal

Sum of the 12 monthly medians (a typical season):

| Region | Harmonized, 2000-01 to 2025-26 | Suomi NPP only, 2012-13 to 2025-26 | Ratio |
| --- | --- | --- | --- |
| Maule (7) | 2,270 | 2,216 | 1.02 |
| Biobío (8) | 2,299 | 2,306 | 1.00 |
| Araucanía (9) | 3,861 | 4,501 | 0.86 |
| Ñuble (16) | 1,768 | 1,938 | 0.91 |

The harmonized series does not create a jump at 2012. Its January and February medians are lower than the Suomi NPP-only ones in Biobío and Araucanía; this may be real (fewer summer hotspots before 2012) or a mapping effect, and cannot be separated with these data alone. The CONAF validation (2002–2020) can test it.

## Caveats

- The low end of the map is the least certain: a month with zero or one or two MODIS hotspots becomes a few Suomi NPP-equivalent hotspots. In Biobío, 13 of the 20 "unusually low" months fall in the Aqua era (2002–2011), against 6 in the Suomi NPP era, so low anomalies before 2012 should be read with care.
- Terra months (2000-11 to 2002-06) carry the largest uncertainty (see `results/harmonization_qmap`).

| File | Content |
| --- | --- |
| `normal_by_region.csv` | Median, MAD, percentiles by region and month of season |
| `harmonized_monthly_with_anomaly.csv` | Monthly harmonized series with source, normal median, robust z and anomaly class |
| `check_harmonized_vs_snpp_only.csv` | The check above |
| `normal_by_region.png` | Normal by month of season and the 2025-26 season |
