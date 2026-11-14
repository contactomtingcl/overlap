# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
"""Export the harmonized regional series for GIS (QGIS, ArcGIS): a GeoPackage and a GeoJSON.

GeoPackage (OGC 1.3, written with sqlite3 only):
- layer "regions": 16 region polygons (WGS84, EPSG:4326), dissolved from the BCN communes (referential
  boundaries, simplified), with the harmonization method, CONAF check and latest month.
- table "regions_monthly": one row per region and month (2000-11 to 2026-11), with month as a DATE so QGIS can
  join it to "regions" on codregion and animate it with the Temporal Controller.
GeoJSON: the same polygons and latest-month attributes.
Usage: python3 pipeline/13_export_gis.py app/data/geo/comunas.json app/data app/data/gis
"""
import json
import sqlite3
import struct
import sys
from collections import defaultdict
from pathlib import Path

comunas, data, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
QM = {7, 8, 9, 16}


# ---- dissolve communes into regions: shared edges cancel out ----
def dp(pts, eps):
    """Douglas-Peucker on an open polyline."""
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    norm = (dx * dx + dy * dy) ** .5
    best, idx = -1.0, 0
    for k in range(1, len(pts) - 1):
        px, py = pts[k]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / norm if norm else ((px - ax) ** 2 + (py - ay) ** 2) ** .5
        if d > best:
            best, idx = d, k
    if best > eps:
        return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def area(r):
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(r, r[1:])) / 2


def inside(pt, ring):
    x, y = pt
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


g = json.loads(comunas.read_text())
edges = defaultdict(lambda: defaultdict(int))  # undirected edge -> times seen; boundary edges are seen once
for f in g["features"]:
    reg = f["properties"]["codregion"]
    if reg == 0:
        continue  # "Zona sin demarcar"
    geom = f["geometry"]
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        for ring in poly:
            pts = [(round(x, 6), round(y, 6)) for x, y in ring]
            for a, b in zip(pts, pts[1:]):
                if a != b:
                    edges[reg][tuple(sorted((a, b)))] += 1

geoms = {}
for reg, es in edges.items():
    adj = defaultdict(list)
    for (a, b), n in es.items():
        if n % 2:
            adj[a].append(b)
            adj[b].append(a)
    rings = []
    while adj:
        start = next(iter(adj))
        ring, cur = [start], start
        while adj.get(cur):
            n = adj[cur].pop()
            adj[n].remove(cur)
            for k in (cur, n):
                if not adj[k]:
                    del adj[k]
            ring.append(n)
            cur = n
            if cur == start:
                break
        if len(ring) > 3 and ring[0] == ring[-1]:
            s = dp(ring, 0.002)
            if len(s) >= 4 and abs(area(s)) > 0:
                rings.append(s)
    # outer rings and holes by nesting depth (orientation of the source is not reliable)
    rings.sort(key=lambda r: -abs(area(r)))
    outers = []
    for i, r in enumerate(rings):
        cont = [j for j in range(i) if inside(r[0], rings[j])]
        if len(cont) % 2 == 0:
            outers.append([r if area(r) > 0 else r[::-1]])  # outer counter-clockwise (RFC 7946)
        else:
            home = next(p for p in reversed(outers) if inside(r[0], p[0]))
            home.append(r if area(r) < 0 else r[::-1])  # hole clockwise
    geoms[reg] = outers


# ---- attributes ----
def load(name):
    return json.loads((data / name).read_text())


monthly = load("regions_monthly.json")
attrs, rows = {}, []
for reg in sorted(geoms):
    d = load(f"r{reg}.json")
    t = d["trust"][0]
    method = "qmap" if reg in QM else (d["method"].get("pooled_regions") and "qmap_pooled") or "ratio"
    L = d["latest"]
    attrs[reg] = {"codregion": reg, "region": d["regions"] and monthly["regions"][str(reg)]["name"], "method": method,
                  "conaf_verdict": "removed" if t.get("validated") else t["conaf"]["verdict"],
                  "jump2012_raw": t.get("jump_unharmonized") or t["conaf"]["unh"],
                  "jump2012_harm": (t.get("jump_harmonized") or t["conaf"]["h"])[0],
                  "aqua_typical_error": t["Aqua"]["typical_factor"], "latest_month": L["month"] + "-01",
                  "latest_value": L["value"], "latest_status": L["status"], "latest_median": L["median"],
                  "latest_z": L["z"], "latest_anomaly": L["anomaly"]}
    for m in d["months"]:
        rows.append((reg, attrs[reg]["region"], m["month"] + "-01", m["value"], m["low"], m["high"], m["status"],
                     m.get("source"), "+".join(m.get("methods", [])), m.get("z"), m.get("anomaly")))


# ---- GeoPackage ----
def wkb_multipolygon(polys):
    b = [struct.pack("<BII", 1, 6, len(polys))]
    for poly in polys:
        b.append(struct.pack("<BII", 1, 3, len(poly)))
        for ring in poly:
            b.append(struct.pack("<I", len(ring)))
            b.append(b"".join(struct.pack("<dd", x, y) for x, y in ring))
    return b"".join(b)


def bbox(polys):
    xs = [x for p in polys for r in p for x, _ in r]
    ys = [y for p in polys for r in p for _, y in r]
    return min(xs), min(ys), max(xs), max(ys)


def gpkg_geom(polys):
    minx, miny, maxx, maxy = bbox(polys)
    head = b"GP" + struct.pack("<BBi", 0, 0b00000011, 4326) + struct.pack("<dddd", minx, maxx, miny, maxy)
    return head + wkb_multipolygon(polys)


path = out / "overlap_chile_regions.gpkg"
path.unlink(missing_ok=True)
con = sqlite3.connect(path)
c = con.cursor()
c.execute("PRAGMA application_id = 1196444487")
c.execute("PRAGMA user_version = 10300")
c.executescript("""
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER NOT NULL PRIMARY KEY, organization TEXT NOT NULL,
  organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE,
  description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER,
  CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id));
CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL,
  srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL,
  CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name),
  CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name),
  CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys (srs_id));
""")
WGS84 = ('GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],'
         'AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,'
         'AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4326"]]')
c.executemany("INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)", [
    ("WGS 84 geodetic", 4326, "EPSG", 4326, WGS84, "longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid"),
    ("Undefined cartesian SRS", -1, "NONE", -1, "undefined", "undefined cartesian coordinate reference system"),
    ("Undefined geographic SRS", 0, "NONE", 0, "undefined", "undefined geographic coordinate reference system")])
c.execute("""CREATE TABLE regions (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, geom MULTIPOLYGON, codregion INTEGER,
  region TEXT, method TEXT, conaf_verdict TEXT, jump2012_raw REAL, jump2012_harm REAL, aqua_typical_error REAL,
  latest_month DATE, latest_value REAL, latest_status TEXT, latest_median REAL, latest_z REAL, latest_anomaly TEXT)""")
cols = ["codregion", "region", "method", "conaf_verdict", "jump2012_raw", "jump2012_harm", "aqua_typical_error",
        "latest_month", "latest_value", "latest_status", "latest_median", "latest_z", "latest_anomaly"]
for reg in sorted(geoms):
    c.execute(f"INSERT INTO regions (geom, {', '.join(cols)}) VALUES (?{', ?' * len(cols)})",
              [gpkg_geom(geoms[reg])] + [attrs[reg][k] for k in cols])
allp = [p for reg in geoms for p in geoms[reg]]
minx, miny, maxx, maxy = bbox(allp)
c.execute("""CREATE TABLE regions_monthly (fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, codregion INTEGER, region TEXT,
  month DATE, value_snpp_equivalent REAL, low_80 REAL, high_80 REAL, status TEXT, source TEXT, method TEXT,
  robust_z REAL, anomaly TEXT)""")
c.executemany("""INSERT INTO regions_monthly (codregion, region, month, value_snpp_equivalent, low_80, high_80, status,
  source, method, robust_z, anomaly) VALUES (?,?,?,?,?,?,?,?,?,?,?)""", rows)
c.executemany("INSERT INTO gpkg_contents (table_name, data_type, identifier, description, min_x, min_y, max_x, max_y, srs_id) VALUES (?,?,?,?,?,?,?,?,?)", [
    ("regions", "features", "Overlap regions",
     "Chile regions dissolved from BCN commune boundaries (referential, simplified). Harmonized MODIS/VIIRS hotspots, Suomi NPP-equivalent units. Join regions_monthly on codregion.",
     minx, miny, maxx, maxy, 4326),
    ("regions_monthly", "attributes", "Overlap regions monthly",
     "Harmonized monthly hotspots per region, Suomi NPP-equivalent units, 80% band, status (observed / estimated / provisional / partial / no_data) and robust z anomaly.",
     None, None, None, None, None)])
c.execute("INSERT INTO gpkg_geometry_columns VALUES ('regions', 'geom', 'MULTIPOLYGON', 4326, 0, 0)")
con.commit()
con.close()

# ---- GeoJSON ----
fc = {"type": "FeatureCollection", "name": "overlap_chile_regions",
      "features": [{"type": "Feature", "properties": attrs[reg],
                    "geometry": {"type": "MultiPolygon", "coordinates": [[[[round(x, 5), round(y, 5)] for x, y in r] for r in p] for p in geoms[reg]]}}
                   for reg in sorted(geoms)]}
(out / "overlap_chile_regions.geojson").write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")))
print(path, path.stat().st_size, "rows", len(rows), {r: len(p) for r, p in geoms.items()})
