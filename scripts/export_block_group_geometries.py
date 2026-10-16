#!/usr/bin/env python3
"""Write a simplified block-group boundary file for the dashboard map.

Reads data/raw/tcc_cbg.geojson and keeps only GEOID plus geometry.
The validation report found the same GEOID set and the same land and
water areas in the canopy, impervious, and heat block-group files, so
these boundaries can be joined to virginia_block_groups_clean.csv.

Coordinates stay in CRS84 (longitude, latitude). Rings are simplified
with Douglas-Peucker. This does not change the analytical table.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "raw" / "tcc_cbg.geojson"
TABLE = ROOT / "data" / "processed" / "virginia_block_groups_clean.csv"
DEST = ROOT / "web" / "public" / "data" / "virginia_block_group_boundaries.geojson"
TABLE_COPY = ROOT / "web" / "public" / "data" / "virginia_block_groups_clean.csv"
TOLERANCE_DEGREES = 0.00045


def perpendicular_distance(point, start, end):
    px, py = point
    x1, y1 = start
    x2, y2 = end
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return ((px - x1) ** 2 + (py - y1) ** 2) ** 0.5
    length = (dx * dx + dy * dy) ** 0.5
    return abs(dy * px - dx * py + x2 * y1 - y2 * x1) / length


def douglas_peucker(points, tolerance):
    if len(points) < 3:
        return points
    start = points[0]
    end = points[-1]
    index = 0
    farthest = 0.0
    for i in range(1, len(points) - 1):
        distance = perpendicular_distance(points[i], start, end)
        if distance > farthest:
            farthest = distance
            index = i
    if farthest > tolerance:
        left = douglas_peucker(points[: index + 1], tolerance)
        right = douglas_peucker(points[index:], tolerance)
        return left[:-1] + right
    return [start, end]


def round_ring(ring):
    simplified = douglas_peucker(ring, TOLERANCE_DEGREES)
    if len(simplified) < 4:
        simplified = ring
    rounded = [[round(x, 5), round(y, 5)] for x, y in simplified]
    if rounded[0] != rounded[-1]:
        rounded.append(rounded[0])
    if len(rounded) < 4:
        rounded = [[round(x, 5), round(y, 5)] for x, y in ring]
    return rounded


def main():
    with SOURCE.open() as handle:
        collection = json.load(handle)
    features = []
    for feature in collection["features"]:
        geoid = str(feature["properties"]["GEOID"])
        geometry = feature["geometry"]
        polygons = []
        for polygon in geometry["coordinates"]:
            rings = [round_ring(ring) for ring in polygon if len(ring) >= 4]
            if rings:
                polygons.append(rings)
        if not polygons:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {"GEOID": geoid},
                "geometry": {"type": "MultiPolygon", "coordinates": polygons},
            }
        )
    DEST.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "type": "FeatureCollection",
        "name": "virginia_block_group_boundaries",
        "crs": collection.get("crs"),
        "features": features,
    }
    with DEST.open("w") as handle:
        json.dump(payload, handle, separators=(",", ":"))
    shutil.copyfile(TABLE, TABLE_COPY)
    print(f"features {len(features)}")
    print(f"bytes {DEST.stat().st_size}")


if __name__ == "__main__":
    main()
