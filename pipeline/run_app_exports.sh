#!/usr/bin/env bash
# Rebuild everything the web app reads, in order, then run the consistency checks.
# Usage: pipeline/run_app_exports.sh <detections_clean_chile_admin.csv.gz> <detections_nrt_clean_chile_admin.csv.gz>
set -euo pipefail
cd "$(dirname "$0")/.."
python3 pipeline/03_export_app_data.py "$1" "$2" results/harmonization_qmap app/data
python3 pipeline/17_season_clock.py app/data
python3 pipeline/12_regions_svg.py app/data/geo/comunas.json app/data/geo/regions_svg.json
python3 pipeline/14_comunas_for_map.py app/data/geo/comunas.json app/data/geo/regions_svg.json "$1" "$2" app/data
python3 pipeline/19_export_points.py "$1" "$2" app/data/points
python3 pipeline/13_export_gis.py app/data/geo/comunas.json app/data app/data/gis
python3 pipeline/18_export_region_series.py app/data results/harmonized_monthly_by_region.csv
python3 pipeline/16_early_season_check.py app/data results/prediction_check
python3 tests/check_app_data.py app/data results
