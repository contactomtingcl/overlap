# Data sources

## NASA FIRMS active fire archive (Chile)

Downloaded on 2026-11-14 from the FIRMS Archive Download tool (https://firms.modaps.eosdis.nasa.gov/download/), country = Chile, buffer 0 km, CSV.

| Request ID | Source | Period | Standard rows | Near real-time rows |
| --- | --- | --- | --- | --- |
| 848499 | MODIS C6.1 (Terra + Aqua) | 2000-11-01 to 2020-10-31 | 144,123 | — |
| 848473 | MODIS C6.1 (Terra + Aqua) | 2020-11-01 to 2026-11-07 | 50,930 | 378 |
| 848501 | VIIRS Suomi NPP C2 | 2012-01-20 to 2020-10-31 | 257,203 | — |
| 848476 | VIIRS Suomi NPP C2 | 2020-11-01 to 2026-11-01 | 180,671 | 3,203 |
| 848500 | VIIRS NOAA-20 C2 | 2018-04-01 to 2020-10-31 | 61,379 | — |
| 848474 | VIIRS NOAA-20 C2 | 2020-11-01 to 2026-11-07 | 174,268 | 3,240 |
| 848475 | VIIRS NOAA-21 C2 | 2023-03-01 to 2026-11-07 | 81,262 | 2,796 |

Total: 959,453 detections (949,836 standard, 9,617 near real-time). No exact duplicates. Standard data ends between 2026-07-30 and 2026-08-31 depending on the satellite; near real-time data covers the rest.

After cleaning (standard only, `type = 0`, low confidence removed): 694,852 detections. See `results/cleaning_steps.csv`.

## Raw files

Raw files are not committed (76 MB). To reproduce, download the requests above and unzip each into `data/raw/<zip name>/`, then run the pipeline.

## Notes

- Suomi NPP new observations ceased on November 2, 2026 (historical data remains available).
- The `type` column exists only in standard files, for both MODIS and VIIRS.
- Biobío is currently an approximate bounding box (lat −38.50 to −36.45, lon −73.95 to −70.95); it will be replaced by the official regional boundary.
