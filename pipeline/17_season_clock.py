# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Season clock: does the fire season (Jul-Jun) start earlier, peak earlier or last longer than it used to?
For each complete season 2001-02 to 2025-26 and each area, from daily hotspots put in Suomi NPP-equivalent units
(each day of an estimated month scaled by that month's harmonized total / raw total):
  onset = day of the season when 10 % of its hotspots have accumulated, end = 90 %, peak = centre of the busiest
  31-day window, length = end - onset (days counted from July 1).
Trend: Theil-Sen slope with 95 % interval, Mann-Kendall test (Kendall tau against the season), over all seasons and,
as a single-sensor check, over 2012-13 to 2025-26 only (Suomi NPP). Hotspot seasons include agricultural burning.
Adds "season_clock" to app/data/<area>.json. Run after pipeline/03.
Usage: python3 pipeline/17_season_clock.py app/data
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
from scipy.stats import kendalltau, theilslopes

data = Path(sys.argv[1])
aois = [a["key"] for a in json.loads((data / "aois.json").read_text())]


def trend(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    if len(x) < 6 or np.all(y == y[0]):
        return None
    slope, _, lo, hi = theilslopes(y, x)
    p = kendalltau(x, y).pvalue
    return {"per_decade": round(slope * 10, 1), "lo": round(lo * 10, 1), "hi": round(hi * 10, 1), "p": round(float(p), 3), "n": len(x)}


for key in aois:
    js = json.loads((data / f"{key}.json").read_text())
    daily = json.loads((data / f"{key}_daily.json").read_text())
    months = {m["month"]: m for m in js["months"]}
    raw_month = {}
    for d, v in daily.items():
        raw_month[d[:7]] = raw_month.get(d[:7], 0) + v
    rows = []
    for s in range(2001, 2026):
        start = date(s, 7, 1)
        n = (date(s + 1, 7, 1) - start).days
        vals, ok = [], True
        for i in range(n):
            d = start + timedelta(i)
            mo = d.strftime("%Y-%m")
            rec = months.get(mo)
            if not rec or rec["value"] is None or rec["status"] not in ("observed", "estimated"):
                ok = False
                break
            r = raw_month.get(mo, 0)
            dim = (date(d.year + d.month // 12, d.month % 12 + 1, 1) - date(d.year, d.month, 1)).days
            vals.append(daily.get(d.isoformat(), 0) * rec["value"] / r if r > 0 else rec["value"] / dim)
        if not ok or sum(vals) <= 0:
            continue
        v = np.array(vals)
        c = np.cumsum(v) / v.sum()
        onset, end = int(np.searchsorted(c, .10)), int(np.searchsorted(c, .90))
        win = np.convolve(v, np.ones(31), "valid")
        peak = int(np.argmax(win)) + 15
        rows.append({"season": s, "onset": onset, "peak": peak, "end": end, "length": end - onset, "total": round(float(v.sum()), 1)})
    out = {"seasons": rows, "trend": {}, "trend_viirs": {}}
    for k in ("onset", "peak", "end", "length"):
        out["trend"][k] = trend([r["season"] for r in rows], [r[k] for r in rows])
        sub = [r for r in rows if r["season"] >= 2012]
        out["trend_viirs"][k] = trend([r["season"] for r in sub], [r[k] for r in sub])
    js["season_clock"] = out
    (data / f"{key}.json").write_text(json.dumps(js, ensure_ascii=False))
    t = out["trend"]
    print(key, len(rows), {k: (t[k]["per_decade"], t[k]["p"]) if t[k] else None for k in t})
