# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Does a quiet or busy start of the fire season anticipate the rest of it?
Spearman correlation, over the 25 complete seasons 2001-02 to 2025-26, between harmonized hotspots in Jul-Oct and in
Nov-Jun, per region and for Chile. Usage: python3 pipeline/16_early_season_check.py app/data results/prediction_check
"""
import csv
import json
import sys
from pathlib import Path

from scipy.stats import spearmanr

data, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
rows = []
for a in ["chile"] + [f"r{c}" for c in [15, 1, 2, 3, 4, 5, 13, 6, 7, 16, 8, 9, 14, 10, 11, 12]]:
    d = json.loads((data / f"{a}.json").read_text())
    by = {m["month"]: m["value"] for m in d["months"]}
    early, late = [], []
    for s in range(2001, 2026):
        v = [by.get(f"{s + (i >= 6)}-{(i + 6) % 12 + 1:02d}") for i in range(12)]
        if None not in v:
            early.append(sum(v[:4]))
            late.append(sum(v[4:]))
    r = spearmanr(early, late)
    rows.append([a, d["name"], len(early), round(float(r.correlation), 2), round(float(r.pvalue), 3)])
with open(out / "early_vs_rest_of_season.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["aoi", "name", "seasons", "spearman_jul_oct_vs_nov_jun", "p_value"])
    w.writerows(rows)
for r in rows:
    print(r)
