# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# Usage: python3 pipeline/12_regions_svg.py app/data/geo/comunas.json app/data/geo/regions_svg.json
"""Dissolve BCN comunas into regions by cancelling shared edges, simplify, project to SVG paths."""
import json, math, sys
from collections import defaultdict
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
def rings(g):
    if g["type"] == "Polygon": return [g["coordinates"]]
    return g["coordinates"]
R = 6  # coordinate rounding
edges = defaultdict(lambda: defaultdict(int))
for f in d["features"]:
    reg = f["properties"]["codregion"]
    for poly in rings(f["geometry"]):
        for ring in poly:
            pts = [(round(x, R), round(y, R)) for x, y in ring]
            for a, b in zip(pts, pts[1:]):
                if a == b: continue
                edges[reg][(a, b)] += 1
def chain(es):
    # keep edges whose reverse is absent (outer boundary of the dissolved region)
    keep = {}
    for (a, b), n in es.items():
        if es.get((b, a), 0) == 0:
            keep.setdefault(a, []).append(b)
    out_rings = []
    while keep:
        start = next(iter(keep)); ring = [start]; cur = start
        while True:
            nxts = keep.get(cur)
            if not nxts: break
            nxt = nxts.pop()
            if not nxts: del keep[cur]
            ring.append(nxt); cur = nxt
            if cur == start: break
        if len(ring) > 3: out_rings.append(ring)
    return out_rings
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy) or 1e-12
    i, dm = 0, -1
    for k in range(1, len(pts)-1):
        p = pts[k]; dist = abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0]) / L if (dx or dy) else math.hypot(p[0]-a[0], p[1]-a[1])
        if dist > dm: i, dm = k, dist
    if dm > eps: return dp(pts[:i+1], eps)[:-1] + dp(pts[i:], eps)
    return [a, b]
lat0 = math.radians(-36)
proj = lambda x, y: (x * math.cos(lat0), -y)
res = {}
minx = miny = 1e9; maxx = maxy = -1e9
for reg, es in edges.items():
    if reg == 0: continue  # "Zona sin demarcar"
    paths = []
    for ring in chain(es):
        if max(x for x, _ in ring) < -78: continue  # oceanic islands (Rapa Nui, Juan Fernández)
        s = dp(ring, 0.015)
        if len(s) < 4: continue
        P = [proj(x, y) for x, y in s]
        for x, y in P: minx, maxx, miny, maxy = min(minx, x), max(maxx, x), min(miny, y), max(maxy, y)
        paths.append(P)
    res[reg] = paths
W = 1000.0 / (maxy - miny)  # scale so height = 1000
geo = {"width": round((maxx - minx) * W, 1), "height": 1000, "regions": {},
       "proj": {"lat0": -36, "minx": minx, "miny": miny, "scale": W}}
for reg, paths in res.items():
    geo["regions"][str(reg)] = "".join("M" + "L".join(f"{(x-minx)*W:.1f},{(y-miny)*W:.1f}" for x, y in P) + "Z" for P in paths)
json.dump(geo, open(out, "w"), separators=(",", ":"))
print({k: len(v) for k, v in res.items()}, geo["width"], sum(len(v) for v in geo["regions"].values()))
