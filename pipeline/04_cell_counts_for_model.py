# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Daily hotspot counts per 0.1-degree cell, satellite and day/night, for the harmonization model (R).

Input: the clean detection table from 02 (standard data, type 0, low confidence removed).
Output columns: date (UTC), cell_lat, cell_lon (cell centre), satellite, daynight, n_hotspots.
Only cells and days with at least one detection are listed; a satellite with no row on a day
it was operating means zero detections, not missing data (see docs/DATA.md for start dates).
Usage: python3 pipeline/04_cell_counts_for_model.py <detections_clean_chile.csv.gz> results/model_input
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
d = pd.read_csv(src, usecols=["latitude", "longitude", "date", "satellite", "daynight"])
d["cell_lat"] = (np.floor(d.latitude / 0.1) * 0.1 + 0.05).round(2)
d["cell_lon"] = (np.floor(d.longitude / 0.1) * 0.1 + 0.05).round(2)
c = (d.groupby(["date", "cell_lat", "cell_lon", "satellite", "daynight"]).size()
     .rename("n_hotspots").reset_index())
c.to_csv(out / "daily_cell_counts_chile.csv.gz", index=False)
print(len(c), "rows")
print(c.groupby("satellite").n_hotspots.sum())
