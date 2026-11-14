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
- Areas are the 16 regions from the BCN commune boundaries ("División comunal", Biblioteca del Congreso Nacional de Chile; free use citing BCN; referential limits, not official, DFL-83 of 1979), converted to WGS84 and simplified 3 % with mapshaper. The "historical Biobío" area (Biobío + Ñuble) matches the CONAF validation file.
- Near real-time months over the Atacama desert (regions 15, 1, 2, 3) are withheld: they hold many daytime, low-FRP detections that are absent from the science-quality record.

## CONAF fire records (validation)

Corporación Nacional Forestal (2024). *Registro histórico de incendios forestales*, V1. Datos para Resiliencia. https://doi.org/10.71578/UXAUN5

File used: historical Biobío region (including the former Ñuble province), seasons 2002–03 to 2019–20, 45,757 fire records with coordinates (WGS84), start date and time, burned area by vegetation type and cause. Two records with coordinates outside the region were dropped. Licence: CC BY 4.0. The file is in `data/conaf/` with its citation; derived results are in `results/validation/`.
