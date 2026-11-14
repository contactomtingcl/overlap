# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Harmonized monthly series of the 16 regions as one CSV (the same values the app shows).
Usage: python3 pipeline/18_export_region_series.py app/data results/harmonized_monthly_by_region.csv
"""
import csv
import json
import sys
from pathlib import Path

data, out = Path(sys.argv[1]), Path(sys.argv[2])
with out.open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["codregion", "region", "month", "value_snpp_equivalent", "low_80", "high_80", "status", "source",
                "method", "robust_z", "anomaly", "aqua_raw", "snpp_raw"])
    for r in [15, 1, 2, 3, 4, 5, 13, 6, 7, 16, 8, 9, 14, 10, 11, 12]:
        d = json.loads((data / f"r{r}.json").read_text())
        for m in d["months"]:
            raw = m["raw"] or {}
            w.writerow([r, d["name"].replace(" region, Chile", ""), m["month"], m["value"], m["low"], m["high"], m["status"],
                        m.get("source"), "+".join(m.get("methods", [])), m.get("z"), m.get("anomaly"), raw.get("Aqua"), raw.get("SNPP")])
