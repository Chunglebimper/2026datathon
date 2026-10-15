#!/usr/bin/env python3
"""Build block-group and census-block analysis tables.

Source GeoJSON and ACS files are read only. Missing values, Census
suppression codes, and the tree-canopy maximum of 254 are preserved.
"""

from __future__ import annotations

import csv
import json
import mmap
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_BG = ROOT / "virginia_block_groups_clean.csv"
OUT_BLOCK = ROOT / "virginia_census_blocks_clean.csv"
OUT_DICT = ROOT / "data_dictionary.csv"
OUT_REPORT = ROOT / "validation_report.md"

TARGET_254 = ("510839304001", "511670304021")


def iter_properties(path: Path):
    """Yield GeoJSON feature properties without reading geometries."""
    with path.open("rb") as handle:
        mapping = mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ)
        size = len(mapping)
        needle = b'"properties"'
        position = 0
        decoder_error = json.JSONDecodeError
        while True:
            found = mapping.find(needle, position)
            if found < 0:
                break
            cursor = found + len(needle)
            while cursor < size and mapping[cursor] in b" \t\r\n":
                cursor += 1
            if cursor >= size or mapping[cursor] != ord(":"):
                position = found + 1
                continue
            cursor += 1
            while cursor < size and mapping[cursor] in b" \t\r\n":
                cursor += 1
            if cursor >= size or mapping[cursor] != ord("{"):
                position = found + 1
                continue
            depth = 0
            end = cursor
            in_string = False
            escaped = False
            while end < size:
                char = mapping[end]
                if in_string:
                    if escaped:
                        escaped = False
                    elif char == ord("\\"):
                        escaped = True
                    elif char == ord('"'):
                        in_string = False
                else:
                    if char == ord('"'):
                        in_string = True
                    elif char == ord("{"):
                        depth += 1
                    elif char == ord("}"):
                        depth -= 1
                        if depth == 0:
                            end += 1
                            break
                end += 1
            raw = mapping[cursor:end]
            position = end
            try:
                obj = json.loads(raw)
            except decoder_error:
                continue
            if isinstance(obj, dict) and set(obj) == {"name"}:
                continue
            yield obj
        mapping.close()


def cell(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value.is_integer() and abs(value) < 1e15:
            return str(int(value))
        return format(value, ".12g")
    return str(value)


def yes_no(flag: bool) -> str:
    return "yes" if flag else "no"


def anomalous_max(value) -> str:
    if value is None:
        return ""
    return yes_no(value > 100)


def parse_income(estimate: str, margin: str):
    estimate = (estimate or "").strip()
    margin = (margin or "").strip()
    if estimate == "-":
        status = "insufficient_sample"
        dollars = None
    elif estimate == "250,000+":
        status = "top_coded"
        dollars = None
    else:
        status = "numeric"
        dollars = int(estimate.replace(",", ""))
    if margin in {"**", "***", "*****", "-", "N", "(X)"}:
        moe_dollars = None
    elif margin == "":
        moe_dollars = None
    else:
        moe_dollars = int(margin.replace(",", ""))
    return status, estimate, dollars, margin, moe_dollars


def stat_summary(values):
    present = [value for value in values if value is not None]
    if not present:
        return {"n": 0, "min": None, "p50": None, "max": None}
    present.sort()
    return {
        "n": len(present),
        "min": present[0],
        "p50": present[len(present) // 2],
        "max": present[-1],
    }


def load_cbg_stats(path: Path):
    rows = {}
    duplicate_ids = []
    for props in iter_properties(path):
        geoid = props["GEOID"]
        if geoid in rows:
            duplicate_ids.append(geoid)
        rows[geoid] = props
    return rows, duplicate_ids


def load_counties():
    rows = {}
    duplicate_ids = []
    for props in iter_properties(ROOT / "tcc_county.geojson"):
        fips = props["STCOFIPS"]
        if fips in rows:
            duplicate_ids.append(fips)
        rows[fips] = {
            "county_name": props["NAME"],
            "county_namelsad": props["NAMELSAD"],
            "jurisdiction_type": props["JURISTYPE"],
        }
    return rows, duplicate_ids


def load_income():
    path = ROOT / "median_income" / "ACSDT5Y2024.B19013-Data.csv"
    rows = {}
    duplicate_ids = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        next(reader)  # Census second header row with human-readable labels
        if header[0] != "GEO_ID":
            raise SystemExit(f"Unexpected income header: {header}")
        for record in reader:
            if not record or not record[0]:
                continue
            full_id = record[0]
            if "US" not in full_id:
                raise SystemExit(f"Unexpected GEO_ID: {full_id}")
            geoid = full_id.split("US", 1)[1]
            if geoid in rows:
                duplicate_ids.append(geoid)
            status, code, dollars, moe_code, moe_dollars = parse_income(record[2], record[3])
            rows[geoid] = {
                "acs_geographic_name": record[1],
                "median_household_income_status": status,
                "median_household_income_code": code,
                "median_household_income_dollars": dollars,
                "median_household_income_moe_code": moe_code,
                "median_household_income_moe_dollars": moe_dollars,
            }
    return rows, duplicate_ids


def load_heat_cbg():
    rows = {}
    duplicate_ids = []
    for props in iter_properties(ROOT / "heat_severity_cbg.json"):
        geoid = props["tl_2020_51_bg.GEOID"]
        if geoid in rows:
            duplicate_ids.append(geoid)
        rows[geoid] = {
            "aland": props["tl_2020_51_bg.ALAND"],
            "awater": props["tl_2020_51_bg.AWATER"],
            "mean": props["heat_severity_cbg.MEAN"],
            "median": props["heat_severity_cbg.MEDIAN"],
            "min": props["heat_severity_cbg.MIN"],
            "max": props["heat_severity_cbg.MAX"],
            "std": props["heat_severity_cbg.STD"],
            "majority": props["heat_severity_cbg.MAJORITY"],
            "majority_percent": props["heat_severity_cbg.MAJORITY_PERCENT"],
            "pixel_count": props["heat_severity_cbg.COUNT"],
        }
    return rows, duplicate_ids


def blank_heat():
    return {
        "mean": None,
        "median": None,
        "min": None,
        "max": None,
        "std": None,
        "majority": None,
        "majority_percent": None,
        "pixel_count": None,
        "pct90": None,
        "present": False,
    }


def main():
    report = []

    def add(line=""):
        report.append(line)

    tcc, tcc_dups = load_cbg_stats(ROOT / "tcc_cbg.geojson")
    impervious, imp_dups = load_cbg_stats(ROOT / "impervious_cbg.geojson")
    income, income_dups = load_income()
    heat, heat_dups = load_heat_cbg()
    counties, county_dups = load_counties()

    tcc_ids = set(tcc)
    imp_ids = set(impervious)
    same_stats = 0
    canopy_higher = 0
    impervious_higher = 0
    equal_means = 0
    for geoid in tcc_ids & imp_ids:
        left = tcc[geoid]
        right = impervious[geoid]
        left_stats = (left["_mean"], left["_median"], left["_min"], left["_max"], left["_stdev"])
        right_stats = (right["_mean"], right["_median"], right["_min"], right["_max"], right["_stdev"])
        if left_stats == right_stats:
            same_stats += 1
        if left["_mean"] > right["_mean"]:
            canopy_higher += 1
        elif left["_mean"] < right["_mean"]:
            impervious_higher += 1
        else:
            equal_means += 1

    water_identical = []
    for geoid in tcc_ids & imp_ids:
        left = tcc[geoid]
        right = impervious[geoid]
        left_stats = (left["_mean"], left["_median"], left["_min"], left["_max"], left["_stdev"])
        right_stats = (right["_mean"], right["_median"], right["_min"], right["_max"], right["_stdev"])
        if left_stats == right_stats:
            water_identical.append(
                (geoid, left["ALAND"], left["AWATER"], left_stats)
            )

    tcc_max_254 = sorted(geoid for geoid, props in tcc.items() if props["_max"] == 254)
    imp_max_over_100 = sorted(geoid for geoid, props in impervious.items() if props["_max"] is not None and props["_max"] > 100)
    tcc_max_over_100 = sorted(geoid for geoid, props in tcc.items() if props["_max"] is not None and props["_max"] > 100)

    add("# Validation report")
    add()
    add("Source files were not modified. Missing measurements were left blank. No composite score was calculated, and heat classes were not converted to temperature.")
    add()
    add("## Block-group layer comparison")
    add()
    add(f"- `tcc_cbg.geojson` rows: {len(tcc):,}. Duplicate GEOIDs: {len(tcc_dups)}.")
    add(f"- `impervious_cbg.geojson` rows: {len(impervious):,}. Duplicate GEOIDs: {len(imp_dups)}.")
    add(f"- GEOID sets equal: {tcc_ids == imp_ids}. Only in canopy: {len(tcc_ids - imp_ids)}. Only in impervious: {len(imp_ids - tcc_ids)}.")
    add(f"- Block groups whose five statistics are identical: {same_stats:,}.")
    add(f"- Canopy mean greater than impervious mean: {canopy_higher:,}. Impervious mean greater: {impervious_higher:,}. Means equal: {equal_means:,}.")
    add("- Identical groups:")
    for geoid, aland, awater, stats in water_identical:
        add(f"  - `{geoid}`: land area {aland}, water area {awater}, statistics {stats}.")
    add(f"- Tree-canopy maxima above 100: {tcc_max_over_100}.")
    add(f"- Impervious maxima above 100: {imp_max_over_100}.")
    add()
    add("The two layers are distinct. Eight shared all-zero results are water-only block groups (land area 0), which is a plausible result for both surfaces rather than evidence that the files are copies.")
    add()
    add("Units are not named inside either GeoJSON. Canopy and impervious values other than the two maxima of 254 fall between 0 and 100, which is consistent with a percent surface. The source raster name, year, and pixel size are not in the files, so the percent unit remains flagged rather than treated as confirmed metadata.")
    add()

    add("## Tree-canopy maximum of 254")
    add()
    add("Neither block-group file contains a raster metadata record, a data dictionary, or a pixel histogram. The only canopy attributes are zonal `_mean`, `_median`, `_stdev`, `_min`, and `_max`.")
    add()
    add("A maximum of 254 means at least one pixel valued 254 was included in the zonal calculation. The mean, standard deviation, and maximum therefore include that value. The median can show whether 254 is typical: a median inside 0–100 means at least half of the pixels are at or below that median, so 254 is not the typical pixel. The files do not record how many pixels equal 254, so the size of the effect on the mean cannot be calculated. The stored values were not changed.")
    add()
    for geoid in TARGET_254:
        props = tcc[geoid]
        county = counties.get(geoid[:5], {})
        add(f"### `{geoid}`")
        add()
        add(f"- County record: {county.get('county_namelsad', 'not found')} (`{geoid[:5]}`).")
        add(f"- Block-group name in the canopy file: {props['NAMELSAD']}.")
        add(f"- Land area: {props['ALAND']}. Water area: {props['AWATER']}.")
        add(f"- Canopy mean {props['_mean']}, median {props['_median']}, standard deviation {props['_stdev']}, minimum {props['_min']}, maximum {props['_max']}.")
        add(f"- Impervious mean for the same GEOID: {impervious[geoid]['_mean']}, maximum {impervious[geoid]['_max']}.")
        add()

    # Census blocks and heat, scanned once.
    blocks = {}
    block_dups = []
    blocks_in_target = {geoid: [] for geoid in TARGET_254}
    for props in iter_properties(ROOT / "tcc_census_block.geojson"):
        geoid = props["GEOID20"]
        if geoid in blocks:
            block_dups.append(geoid)
        record = {
            "geoid": geoid,
            "state_fips": props["STATEFP20"],
            "county_fips": props["STATEFP20"] + props["COUNTYFP20"],
            "tract_code": props["TRACTCE20"],
            "block_code": props["BLOCKCE20"],
            "block_name": props["NAME20"],
            "urban_rural": props["UR20"],
            "aland": props["ALAND20"],
            "awater": props["AWATER20"],
            "population": props["POP20"],
            "housing": props["HOUSING20"],
            "lat": props["INTPTLAT20"],
            "lon": props["INTPTLON20"],
            "canopy_mean": props["_mean"],
            "canopy_median": props["_median"],
            "canopy_stdev": props["_stdev"],
            "canopy_min": props["_min"],
            "canopy_max": props["_max"],
        }
        blocks[geoid] = record
        prefix = geoid[:12]
        if prefix in blocks_in_target:
            blocks_in_target[prefix].append(record)

    heat_blocks = {}
    heat_block_dups = []
    for props in iter_properties(ROOT / "heat_severity_census_block.geojson"):
        geoid = props["tl_2022_51_tabblock20.GEOID20"]
        if geoid in heat_blocks:
            heat_block_dups.append(geoid)
        mean = props["heat_severity_census_block.MEAN"]
        heat_blocks[geoid] = {
            "mean": mean,
            "median": props["heat_severity_census_block.MEDIAN"],
            "min": props["heat_severity_census_block.MIN"],
            "max": props["heat_severity_census_block.MAX"],
            "std": props["heat_severity_census_block.STD"],
            "pct90": props["heat_severity_census_block.PCT90"],
            "majority": props["heat_severity_census_block.MAJORITY"],
            "majority_percent": props["heat_severity_census_block.MAJORITY_PERCENT"],
            "pixel_count": props["heat_severity_census_block.COUNT"],
            "present": mean is not None,
        }

    impervious_blocks = {}
    impervious_block_dups = []
    for props in iter_properties(ROOT / "impervious_census_block.geojson"):
        geoid = props["GEOID20"]
        if geoid in impervious_blocks:
            impervious_block_dups.append(geoid)
        impervious_blocks[geoid] = {
            "mean": props["_mean"],
            "median": props["_median"],
            "stdev": props["_stdev"],
            "min": props["_min"],
            "max": props["_max"],
        }

    for geoid in TARGET_254:
        group_blocks = blocks_in_target[geoid]
        max_254_blocks = [row for row in group_blocks if row["canopy_max"] == 254]
        add(f"Blocks inside `{geoid}`: {len(group_blocks)}. Blocks whose canopy maximum is 254: {len(max_254_blocks)}.")
        for row in max_254_blocks:
            add(
                f"- Block `{row['geoid']}`: mean {row['canopy_mean']}, median {row['canopy_median']}, "
                f"minimum {row['canopy_min']}, maximum {row['canopy_max']}, land area {row['aland']}, population {row['population']}."
            )
        other_max = Counter(row["canopy_max"] for row in group_blocks if row["canopy_max"] != 254)
        add(f"- Other block maxima in this group: {dict(sorted(other_max.items(), key=lambda item: (item[0] is None, item[0])))}.")
        add()

    add("Conclusion for 254: it is outside the 0–100 range of the other canopy maxima. The file does not define it, so it is flagged as an anomalous raster value rather than labeled as confirmed NoData. Because the maximum is 254, that value entered the zonal mean. Both flagged block groups have medians in the 80s, so 254 is not the typical pixel. No replacement mean was calculated.")
    add()

    # Block-group table.
    bg_ids = sorted(tcc_ids | imp_ids | set(income) | set(heat))
    missing_county = []
    income_status_counts = Counter()
    heat_missing = 0
    aland_mismatch = 0
    bg_rows = []
    for geoid in bg_ids:
        canopy = tcc.get(geoid)
        imperv = impervious.get(geoid)
        inc = income.get(geoid)
        heat_row = heat.get(geoid)
        county = counties.get(geoid[:5])
        if county is None:
            missing_county.append(geoid)
            county = {"county_name": None, "county_namelsad": None, "jurisdiction_type": None}
        if canopy and heat_row and (canopy["ALAND"] != heat_row["aland"] or canopy["AWATER"] != heat_row["awater"]):
            aland_mismatch += 1
        if imperv and canopy and (canopy["ALAND"] != imperv["ALAND"] or canopy["AWATER"] != imperv["AWATER"]):
            aland_mismatch += 1
        if inc is None:
            income_status_counts["missing_join"] += 1
            inc = {
                "acs_geographic_name": None,
                "median_household_income_status": None,
                "median_household_income_code": None,
                "median_household_income_dollars": None,
                "median_household_income_moe_code": None,
                "median_household_income_moe_dollars": None,
            }
        else:
            income_status_counts[inc["median_household_income_status"]] += 1
        if heat_row is None or heat_row["mean"] is None:
            heat_missing += 1
        heat_values = heat_row or blank_heat()
        canopy_values = canopy or {}
        imperv_values = imperv or {}
        bg_rows.append({
            "block_group_geoid": geoid,
            "state_fips": geoid[:2],
            "county_fips": geoid[:5],
            "tract_code": geoid[5:11],
            "block_group_code": geoid[11:12],
            "acs_geographic_name": inc["acs_geographic_name"],
            "county_name": county["county_name"],
            "county_namelsad": county["county_namelsad"],
            "jurisdiction_type": county["jurisdiction_type"],
            "land_area_sq_m": None if canopy is None else canopy["ALAND"],
            "water_area_sq_m": None if canopy is None else canopy["AWATER"],
            "median_household_income_status": inc["median_household_income_status"],
            "median_household_income_code": inc["median_household_income_code"],
            "median_household_income_dollars": inc["median_household_income_dollars"],
            "median_household_income_moe_code": inc["median_household_income_moe_code"],
            "median_household_income_moe_dollars": inc["median_household_income_moe_dollars"],
            "tree_canopy_block_group_mean": canopy_values.get("_mean"),
            "tree_canopy_block_group_median": canopy_values.get("_median"),
            "tree_canopy_block_group_stdev": canopy_values.get("_stdev"),
            "tree_canopy_block_group_min": canopy_values.get("_min"),
            "tree_canopy_block_group_max": canopy_values.get("_max"),
            "tree_canopy_block_group_max_anomalous": anomalous_max(canopy_values.get("_max")),
            "impervious_block_group_mean": imperv_values.get("_mean"),
            "impervious_block_group_median": imperv_values.get("_median"),
            "impervious_block_group_stdev": imperv_values.get("_stdev"),
            "impervious_block_group_min": imperv_values.get("_min"),
            "impervious_block_group_max": imperv_values.get("_max"),
            "impervious_block_group_max_anomalous": anomalous_max(imperv_values.get("_max")),
            "heat_severity_block_group_mean": heat_values.get("mean"),
            "heat_severity_block_group_median": heat_values.get("median"),
            "heat_severity_block_group_min": heat_values.get("min"),
            "heat_severity_block_group_max": heat_values.get("max"),
            "heat_severity_block_group_std": heat_values.get("std"),
            "heat_severity_block_group_majority_class": heat_values.get("majority"),
            "heat_severity_block_group_majority_percent": heat_values.get("majority_percent"),
            "heat_severity_block_group_pixel_count": heat_values.get("pixel_count"),
        })

    bg_columns = list(bg_rows[0].keys())
    with OUT_BG.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=bg_columns)
        writer.writeheader()
        for row in bg_rows:
            writer.writerow({key: cell(value) for key, value in row.items()})

    # Census-block table.
    block_ids = sorted(blocks)
    unmatched_heat_ids = set(heat_blocks) - set(blocks)
    unmatched_imp_ids = set(impervious_blocks) - set(blocks)
    blocks_missing_group = []
    heat_value_present = 0
    impervious_present = 0
    canopy_block_max_254 = 0
    canopy_block_mean_missing = 0
    inherited_income_missing = 0
    inherited_canopy_missing = 0
    block_columns = [
        "census_block_geoid",
        "block_group_geoid",
        "state_fips",
        "county_fips",
        "tract_code",
        "block_code",
        "block_name",
        "county_name",
        "county_namelsad",
        "jurisdiction_type",
        "urban_rural_code_2020",
        "land_area_sq_m",
        "water_area_sq_m",
        "population_2020",
        "housing_units_2020",
        "internal_point_latitude",
        "internal_point_longitude",
        "tree_canopy_block_mean",
        "tree_canopy_block_median",
        "tree_canopy_block_stdev",
        "tree_canopy_block_min",
        "tree_canopy_block_max",
        "tree_canopy_block_max_anomalous",
        "heat_severity_block_mean",
        "heat_severity_block_median",
        "heat_severity_block_min",
        "heat_severity_block_max",
        "heat_severity_block_std",
        "heat_severity_block_pct90",
        "heat_severity_block_majority_class",
        "heat_severity_block_majority_percent",
        "heat_severity_block_pixel_count",
        "heat_severity_block_value_present",
        "impervious_block_mean",
        "impervious_block_median",
        "impervious_block_stdev",
        "impervious_block_min",
        "impervious_block_max",
        "impervious_block_record_present",
        "block_group_median_household_income_status",
        "block_group_median_household_income_code",
        "block_group_median_household_income_dollars",
        "block_group_median_household_income_moe_code",
        "block_group_median_household_income_moe_dollars",
        "block_group_tree_canopy_mean",
        "block_group_tree_canopy_median",
        "block_group_tree_canopy_stdev",
        "block_group_tree_canopy_min",
        "block_group_tree_canopy_max",
        "block_group_tree_canopy_max_anomalous",
        "block_group_impervious_mean",
        "block_group_impervious_median",
        "block_group_impervious_stdev",
        "block_group_impervious_min",
        "block_group_impervious_max",
        "block_group_impervious_max_anomalous",
        "block_group_heat_severity_mean",
        "block_group_heat_severity_median",
        "block_group_heat_severity_min",
        "block_group_heat_severity_max",
        "block_group_heat_severity_std",
        "block_group_heat_severity_majority_class",
        "block_group_heat_severity_majority_percent",
    ]
    with OUT_BLOCK.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=block_columns, extrasaction="raise")
        writer.writeheader()
        written = 0
        for geoid in block_ids:
            row = blocks[geoid]
            group_id = geoid[:12]
            if group_id not in tcc_ids:
                blocks_missing_group.append(geoid)
            county = counties.get(row["county_fips"], {})
            heat_row = heat_blocks.get(geoid, blank_heat())
            if heat_row.get("present"):
                heat_value_present += 1
            imp_row = impervious_blocks.get(geoid)
            if imp_row is not None:
                impervious_present += 1
            else:
                imp_row = {"mean": None, "median": None, "stdev": None, "min": None, "max": None}
            if row["canopy_max"] == 254:
                canopy_block_max_254 += 1
            if row["canopy_mean"] is None:
                canopy_block_mean_missing += 1
            inc = income.get(group_id)
            if inc is None:
                inherited_income_missing += 1
                inc = {
                    "median_household_income_status": None,
                    "median_household_income_code": None,
                    "median_household_income_dollars": None,
                    "median_household_income_moe_code": None,
                    "median_household_income_moe_dollars": None,
                }
            canopy_group = tcc.get(group_id)
            if canopy_group is None:
                inherited_canopy_missing += 1
                canopy_group = {}
            imperv_group = impervious.get(group_id, {})
            heat_group = heat.get(group_id) or blank_heat()
            lat = row["lat"].lstrip("+") if isinstance(row["lat"], str) else row["lat"]
            lon = row["lon"].lstrip("+") if isinstance(row["lon"], str) else row["lon"]
            output = {
                "census_block_geoid": geoid,
                "block_group_geoid": group_id,
                "state_fips": row["state_fips"],
                "county_fips": row["county_fips"],
                "tract_code": row["tract_code"],
                "block_code": row["block_code"],
                "block_name": row["block_name"],
                "county_name": county.get("county_name"),
                "county_namelsad": county.get("county_namelsad"),
                "jurisdiction_type": county.get("jurisdiction_type"),
                "urban_rural_code_2020": row["urban_rural"],
                "land_area_sq_m": row["aland"],
                "water_area_sq_m": row["awater"],
                "population_2020": row["population"],
                "housing_units_2020": row["housing"],
                "internal_point_latitude": None if lat in (None, "") else float(lat),
                "internal_point_longitude": None if lon in (None, "") else float(lon),
                "tree_canopy_block_mean": row["canopy_mean"],
                "tree_canopy_block_median": row["canopy_median"],
                "tree_canopy_block_stdev": row["canopy_stdev"],
                "tree_canopy_block_min": row["canopy_min"],
                "tree_canopy_block_max": row["canopy_max"],
                "tree_canopy_block_max_anomalous": anomalous_max(row["canopy_max"]),
                "heat_severity_block_mean": heat_row.get("mean"),
                "heat_severity_block_median": heat_row.get("median"),
                "heat_severity_block_min": heat_row.get("min"),
                "heat_severity_block_max": heat_row.get("max"),
                "heat_severity_block_std": heat_row.get("std"),
                "heat_severity_block_pct90": heat_row.get("pct90"),
                "heat_severity_block_majority_class": heat_row.get("majority"),
                "heat_severity_block_majority_percent": heat_row.get("majority_percent"),
                "heat_severity_block_pixel_count": heat_row.get("pixel_count"),
                "heat_severity_block_value_present": yes_no(bool(heat_row.get("present"))),
                "impervious_block_mean": imp_row["mean"],
                "impervious_block_median": imp_row["median"],
                "impervious_block_stdev": imp_row["stdev"],
                "impervious_block_min": imp_row["min"],
                "impervious_block_max": imp_row["max"],
                "impervious_block_record_present": yes_no(geoid in impervious_blocks),
                "block_group_median_household_income_status": inc["median_household_income_status"],
                "block_group_median_household_income_code": inc["median_household_income_code"],
                "block_group_median_household_income_dollars": inc["median_household_income_dollars"],
                "block_group_median_household_income_moe_code": inc["median_household_income_moe_code"],
                "block_group_median_household_income_moe_dollars": inc["median_household_income_moe_dollars"],
                "block_group_tree_canopy_mean": canopy_group.get("_mean"),
                "block_group_tree_canopy_median": canopy_group.get("_median"),
                "block_group_tree_canopy_stdev": canopy_group.get("_stdev"),
                "block_group_tree_canopy_min": canopy_group.get("_min"),
                "block_group_tree_canopy_max": canopy_group.get("_max"),
                "block_group_tree_canopy_max_anomalous": anomalous_max(canopy_group.get("_max")),
                "block_group_impervious_mean": imperv_group.get("_mean"),
                "block_group_impervious_median": imperv_group.get("_median"),
                "block_group_impervious_stdev": imperv_group.get("_stdev"),
                "block_group_impervious_min": imperv_group.get("_min"),
                "block_group_impervious_max": imperv_group.get("_max"),
                "block_group_impervious_max_anomalous": anomalous_max(imperv_group.get("_max")),
                "block_group_heat_severity_mean": heat_group.get("mean"),
                "block_group_heat_severity_median": heat_group.get("median"),
                "block_group_heat_severity_min": heat_group.get("min"),
                "block_group_heat_severity_max": heat_group.get("max"),
                "block_group_heat_severity_std": heat_group.get("std"),
                "block_group_heat_severity_majority_class": heat_group.get("majority"),
                "block_group_heat_severity_majority_percent": heat_group.get("majority_percent"),
            }
            writer.writerow({key: cell(output[key]) for key in block_columns})
            written += 1

    add("## Joins")
    add()
    add("### Block groups")
    add()
    add(f"- Income rows before join: {len(income):,}. Duplicate income GEOIDs: {len(income_dups)}.")
    add(f"- Heat block-group rows before join: {len(heat):,}. Duplicate heat GEOIDs: {len(heat_dups)}.")
    add(f"- County records: {len(counties):,}. Duplicate county FIPS: {len(county_dups)}.")
    add(f"- Income IDs matching canopy IDs: {len(set(income) & tcc_ids):,} of {len(income):,}.")
    add(f"- Heat IDs matching canopy IDs: {len(set(heat) & tcc_ids):,} of {len(heat):,}.")
    add(f"- Output rows: {len(bg_rows):,}. This equals the union of the four ID sets, so no source row was dropped and no ID was repeated.")
    add(f"- Output duplicate GEOIDs: {len(bg_rows) - len({row['block_group_geoid'] for row in bg_rows})}.")
    add(f"- Block groups without a county name: {len(missing_county)}.")
    add(f"- Land or water area disagreements among canopy, impervious, and heat boundaries: {aland_mismatch}.")
    add(f"- Income status counts: {dict(income_status_counts)}.")
    add(f"- Block groups with a missing heat-class mean: {heat_missing:,} of {len(bg_rows):,}.")
    add(f"- Tree-canopy block groups with maximum 254, retained and flagged: {len(tcc_max_254)} ({', '.join(tcc_max_254)}).")
    add()
    add("### Census blocks")
    add()
    add(f"- Tree-canopy block rows before join: {len(blocks):,}. Duplicate block GEOIDs: {len(block_dups)}.")
    add(f"- Heat block rows before join: {len(heat_blocks):,}. Duplicate heat block GEOIDs: {len(heat_block_dups)}.")
    add(f"- Impervious block rows before join: {len(impervious_blocks):,}. Duplicate impervious block GEOIDs: {len(impervious_block_dups)}.")
    add(f"- Heat IDs found in the canopy blocks: {len(set(heat_blocks) & set(blocks)):,}. Heat IDs not in the canopy blocks: {len(unmatched_heat_ids):,}.")
    add(f"- Impervious block IDs found in the canopy blocks: {len(set(impervious_blocks) & set(blocks)):,}. Impervious IDs not in the canopy blocks: {len(unmatched_imp_ids):,}.")
    add(f"- Output rows: {written:,}. Left-join base was the canopy block file, so the output count matches that file.")
    add(f"- Blocks whose first 12 digits do not match a canopy block-group GEOID: {len(blocks_missing_group)}.")
    add(f"- Blocks with a heat-class value: {heat_value_present:,}. Blocks with a heat geometry but no class value: {len(set(heat_blocks) & set(blocks)) - heat_value_present:,}.")
    add(f"- Blocks with an impervious-block record: {impervious_present:,}. Blocks left blank for block-level impervious surface: {written - impervious_present:,}.")
    add(f"- Blocks with a missing canopy mean: {canopy_block_mean_missing}. Blocks with canopy maximum 254: {canopy_block_max_254}.")
    add(f"- Blocks that did not inherit a block-group income record: {inherited_income_missing}.")
    add(f"- Blocks that did not inherit a block-group canopy record: {inherited_canopy_missing}.")
    add()
    add("The block output has one row per canopy-block GEOID. Heat and impervious block records were attached by full 15-digit GEOID. Block-group income, canopy, impervious surface, and heat were attached by the first 12 digits. Those inherited columns repeat the same block-group measurement on every block in the group.")
    add()
    add("## Assumptions and limits")
    add()
    add("- A census block GEOID's first 12 characters are its block group GEOID. This is the Census ID construction, and every block in this extract matched a block-group ID in the spatial files.")
    add("- Heat values are class codes from 1 to 5. The project definition is that 1 is mildly above the same city's mean and 5 is far above that city's mean, using Jenks natural breaks. A class is not a temperature, and a class in one city is not an absolute comparison with the same class in another city. Zonal means are averages of those class codes.")
    add("- `median_household_income_dollars` is blank when the Census code is `-` or `250,000+`. The original code is kept in `median_household_income_code`. The margin-of-error code is kept the same way. The margin is the Census 90 percent margin of error, in 2024 inflation-adjusted dollars, only when it is numeric.")
    add("- Income, block-group canopy, block-group impervious surface, and block-group heat are block-group measurements copied onto blocks. They are not block measurements.")
    add("- Block-level impervious surface comes from `impervious_census_block.geojson`. Its internal layer name is still `impervious_county_block`, and it contains 19,520 blocks rather than every Virginia block. Unmatched blocks are blank, not zero.")
    add("- Land and water area use the Census TIGER `ALAND` and `AWATER` fields, which the Census Bureau defines as square meters. The GeoJSON files do not restate that unit.")
    add("- County names come from the county canopy boundary attributes `NAME`, `NAMELSAD`, and `JURISTYPE`, joined on the five-digit county FIPS.")
    add("- ACS 2024 block-group IDs matched the TIGER block-group IDs in these files. The ACS geographic vintage and the TIGER file vintage are not the same document, so matching IDs do not prove that every boundary vertex is identical.")
    add("- No cost, vulnerability index, or cross-city heat ranking was created.")
    add()

    OUT_REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")
    write_dictionary(bg_columns, block_columns)
    print(f"Wrote {OUT_BG}")
    print(f"Wrote {OUT_BLOCK}")
    print(f"Wrote {OUT_DICT}")
    print(f"Wrote {OUT_REPORT}")
    print(f"block groups {len(bg_rows)} blocks {written}")


def write_dictionary(bg_columns, block_columns):
    definitions = {
        "block_group_geoid": ("Block group", "First 12 digits of the census GEOID", "Identifier", "TIGER / ACS GEOID", "None expected"),
        "census_block_geoid": ("Census block", "15-digit 2020 census block GEOID", "Identifier", "TIGER GEOID20", "None expected"),
        "state_fips": ("Block or block group", "State FIPS, 51 for Virginia", "Identifier", "GEOID", "None expected"),
        "county_fips": ("Block or block group", "Five-digit state and county FIPS", "Identifier", "GEOID", "None expected"),
        "tract_code": ("Block or block group", "Six-digit census tract code", "Identifier", "GEOID", "None expected"),
        "block_group_code": ("Block group", "One-digit block-group code", "Identifier", "GEOID", "None expected"),
        "block_code": ("Census block", "Four-digit block code", "Identifier", "BLOCKCE20", "None expected"),
        "block_name": ("Census block", "Census block name, such as Block 1056", "Name", "NAME20", "None expected"),
        "acs_geographic_name": ("Block group", "ACS geographic name, including county and tract", "Name", "ACS NAME", "Blank only if the income join missed"),
        "county_name": ("County or city", "Short county or city name from the Virginia boundary file", "Name", "County NAME", "Blank if FIPS is absent from the county file"),
        "county_namelsad": ("County or city", "Legal or statistical area name, distinguishing counties from independent cities", "Name", "County NAMELSAD", "Blank if FIPS is absent from the county file"),
        "jurisdiction_type": ("County or city", "CO for county, CI for independent city, from the boundary file", "Code", "County JURISTYPE", "Blank if FIPS is absent from the county file"),
        "urban_rural_code_2020": ("Census block", "2020 Census urban/rural code. U is urban and R is rural", "Code", "UR20", "May be blank in source"),
        "land_area_sq_m": ("Block or block group", "Census land area. TIGER defines ALAND as square meters; the GeoJSON does not restate the unit", "Square meters, flagged", "ALAND or ALAND20", "Preserved from source"),
        "water_area_sq_m": ("Block or block group", "Census water area. TIGER defines AWATER as square meters; the GeoJSON does not restate the unit", "Square meters, flagged", "AWATER or AWATER20", "Preserved from source"),
        "population_2020": ("Census block", "2020 Census population count for the block", "People", "POP20", "Preserved from source"),
        "housing_units_2020": ("Census block", "2020 Census housing-unit count for the block", "Housing units", "HOUSING20", "Preserved from source"),
        "internal_point_latitude": ("Census block", "Census internal-point latitude. Leading plus sign removed", "Decimal degrees", "INTPTLAT20", "Preserved from source"),
        "internal_point_longitude": ("Census block", "Census internal-point longitude. Leading plus sign removed", "Decimal degrees", "INTPTLON20", "Preserved from source"),
        "median_household_income_status": ("Block group", "numeric, insufficient_sample, or top_coded", "Category", "Derived from B19013_001E", "Blank only if the income file has no row"),
        "median_household_income_code": ("Block group", "Original ACS estimate text, including - and 250,000+", "Census code or dollars as published", "B19013_001E", "Census suppression and top-codes preserved"),
        "median_household_income_dollars": ("Block group", "Median household income in the past 12 months, 2024 inflation-adjusted dollars. Blank for - and 250,000+", "2024 dollars", "B19013_001E", "Blank when the estimate is not a single number"),
        "median_household_income_moe_code": ("Block group", "Original ACS 90 percent margin-of-error text, including ** and ***", "Census code or dollars as published", "B19013_001M", "Suppression codes preserved"),
        "median_household_income_moe_dollars": ("Block group", "Numeric 90 percent margin of error in 2024 dollars", "2024 dollars", "B19013_001M", "Blank when the margin is ** or ***"),
        "tree_canopy_block_group_mean": ("Block group", "Zonal mean of the tree-canopy surface. Unit is not named in the file; other values are consistent with percent cover. The mean includes any pixel valued 254", "Percent, flagged; source and year unverified", "tcc_cbg _mean", "No nulls in the current file"),
        "tree_canopy_block_group_median": ("Block group", "Zonal median of the tree-canopy surface", "Percent, flagged; source and year unverified", "tcc_cbg _median", "No nulls in the current file"),
        "tree_canopy_block_group_stdev": ("Block group", "Zonal standard deviation of the tree-canopy surface", "Percent, flagged; source and year unverified", "tcc_cbg _stdev", "No nulls in the current file"),
        "tree_canopy_block_group_min": ("Block group", "Zonal minimum of the tree-canopy surface", "Percent, flagged; source and year unverified", "tcc_cbg _min", "No nulls in the current file"),
        "tree_canopy_block_group_max": ("Block group", "Zonal maximum of the tree-canopy surface. 254 is retained", "Percent, flagged; 254 is anomalous", "tcc_cbg _max", "Value 254 retained"),
        "tree_canopy_block_group_max_anomalous": ("Block group", "yes when the canopy maximum is greater than 100", "Flag", "Derived from _max", "Does not replace the maximum"),
        "impervious_block_group_mean": ("Block group", "Zonal mean of the impervious-surface layer. Unit is not named in the file; values are consistent with percent cover", "Percent, flagged; source and year unverified", "impervious_cbg _mean", "No nulls in the current file"),
        "impervious_block_group_median": ("Block group", "Zonal median of the impervious-surface layer", "Percent, flagged; source and year unverified", "impervious_cbg _median", "No nulls in the current file"),
        "impervious_block_group_stdev": ("Block group", "Zonal standard deviation of the impervious-surface layer", "Percent, flagged; source and year unverified", "impervious_cbg _stdev", "No nulls in the current file"),
        "impervious_block_group_min": ("Block group", "Zonal minimum of the impervious-surface layer", "Percent, flagged; source and year unverified", "impervious_cbg _min", "No nulls in the current file"),
        "impervious_block_group_max": ("Block group", "Zonal maximum of the impervious-surface layer", "Percent, flagged; source and year unverified", "impervious_cbg _max", "No nulls in the current file"),
        "impervious_block_group_max_anomalous": ("Block group", "yes when the impervious maximum is greater than 100", "Flag", "Derived from _max", "Does not replace the maximum"),
        "heat_severity_block_group_mean": ("Block group", "Zonal mean of within-city heat-severity classes. This is an average of class codes, not a temperature", "Class code, 1 to 5", "heat_severity_cbg.MEAN", "Blank where the zonal join found no heat pixels"),
        "heat_severity_block_group_median": ("Block group", "Zonal median heat-severity class", "Class code, 1 to 5", "heat_severity_cbg.MEDIAN", "Blank where heat is missing"),
        "heat_severity_block_group_min": ("Block group", "Lowest heat-severity class in the block group", "Class code, 1 to 5", "heat_severity_cbg.MIN", "Blank where heat is missing"),
        "heat_severity_block_group_max": ("Block group", "Highest heat-severity class in the block group", "Class code, 1 to 5", "heat_severity_cbg.MAX", "Blank where heat is missing"),
        "heat_severity_block_group_std": ("Block group", "Standard deviation of heat-severity class codes", "Class code", "heat_severity_cbg.STD", "Blank where heat is missing"),
        "heat_severity_block_group_majority_class": ("Block group", "Most common heat-severity class", "Class code, 1 to 5", "heat_severity_cbg.MAJORITY", "Blank where heat is missing"),
        "heat_severity_block_group_majority_percent": ("Block group", "Percent of counted heat pixels in the majority class", "Percent of pixels", "heat_severity_cbg.MAJORITY_PERCENT", "Blank where heat is missing"),
        "heat_severity_block_group_pixel_count": ("Block group", "Count of heat raster pixels included in the zonal statistic", "Pixels", "heat_severity_cbg.COUNT", "Blank where heat is missing"),
        "tree_canopy_block_mean": ("Census block", "Zonal mean of the tree-canopy surface for the block", "Percent, flagged; source and year unverified", "tcc_census_block _mean", "Blank for the few blocks with no zonal result"),
        "tree_canopy_block_median": ("Census block", "Zonal median of the tree-canopy surface for the block", "Percent, flagged; source and year unverified", "tcc_census_block _median", "Blank when the block mean is blank"),
        "tree_canopy_block_stdev": ("Census block", "Zonal standard deviation of the tree-canopy surface for the block", "Percent, flagged; source and year unverified", "tcc_census_block _stdev", "Blank when the block mean is blank"),
        "tree_canopy_block_min": ("Census block", "Zonal minimum of the tree-canopy surface for the block", "Percent, flagged; source and year unverified", "tcc_census_block _min", "Blank when the block mean is blank"),
        "tree_canopy_block_max": ("Census block", "Zonal maximum of the tree-canopy surface for the block. 254 is retained", "Percent, flagged; 254 is anomalous", "tcc_census_block _max", "Value 254 retained"),
        "tree_canopy_block_max_anomalous": ("Census block", "yes when the block canopy maximum is greater than 100", "Flag", "Derived from _max", "Does not replace the maximum"),
        "heat_severity_block_mean": ("Census block", "Zonal mean of within-city heat-severity classes for the block. Not a temperature", "Class code, 1 to 5", "heat_severity_census_block.MEAN", "Blank where the block has no heat pixels"),
        "heat_severity_block_median": ("Census block", "Zonal median heat-severity class for the block", "Class code, 1 to 5", "heat_severity_census_block.MEDIAN", "Blank where heat is missing"),
        "heat_severity_block_min": ("Census block", "Lowest heat-severity class in the block", "Class code, 1 to 5", "heat_severity_census_block.MIN", "Blank where heat is missing"),
        "heat_severity_block_max": ("Census block", "Highest heat-severity class in the block", "Class code, 1 to 5", "heat_severity_census_block.MAX", "Blank where heat is missing"),
        "heat_severity_block_std": ("Census block", "Standard deviation of heat-severity class codes in the block", "Class code", "heat_severity_census_block.STD", "Blank where heat is missing"),
        "heat_severity_block_pct90": ("Census block", "90th percentile of heat-severity class codes in the block", "Class code, 1 to 5", "heat_severity_census_block.PCT90", "Blank where heat is missing"),
        "heat_severity_block_majority_class": ("Census block", "Most common heat-severity class in the block", "Class code, 1 to 5", "heat_severity_census_block.MAJORITY", "Blank where heat is missing"),
        "heat_severity_block_majority_percent": ("Census block", "Percent of counted heat pixels in the majority class", "Percent of pixels", "heat_severity_census_block.MAJORITY_PERCENT", "Blank where heat is missing"),
        "heat_severity_block_pixel_count": ("Census block", "Count of heat raster pixels included in the block zonal statistic", "Pixels", "heat_severity_census_block.COUNT", "Blank where heat is missing"),
        "heat_severity_block_value_present": ("Census block", "yes when the heat zonal mean is present", "Flag", "Derived", "no is not the same as class 0"),
        "impervious_block_mean": ("Census block", "Zonal mean from the incomplete block impervious extract. Blank means the block was not in that extract, not that impervious cover is zero", "Percent, flagged; source and year unverified", "impervious_census_block _mean", "Blank for blocks absent from the extract"),
        "impervious_block_median": ("Census block", "Zonal median from the incomplete block impervious extract", "Percent, flagged; source and year unverified", "impervious_census_block _median", "Blank for blocks absent from the extract"),
        "impervious_block_stdev": ("Census block", "Zonal standard deviation from the incomplete block impervious extract", "Percent, flagged; source and year unverified", "impervious_census_block _stdev", "Blank for blocks absent from the extract"),
        "impervious_block_min": ("Census block", "Zonal minimum from the incomplete block impervious extract", "Percent, flagged; source and year unverified", "impervious_census_block _min", "Blank for blocks absent from the extract"),
        "impervious_block_max": ("Census block", "Zonal maximum from the incomplete block impervious extract", "Percent, flagged; source and year unverified", "impervious_census_block _max", "Blank for blocks absent from the extract"),
        "impervious_block_record_present": ("Census block", "yes when the block GEOID was in the incomplete impervious extract", "Flag", "Derived", "no leaves the impervious block statistics blank"),
    }
    inherited = {
        "block_group_median_household_income_status": "median_household_income_status",
        "block_group_median_household_income_code": "median_household_income_code",
        "block_group_median_household_income_dollars": "median_household_income_dollars",
        "block_group_median_household_income_moe_code": "median_household_income_moe_code",
        "block_group_median_household_income_moe_dollars": "median_household_income_moe_dollars",
        "block_group_tree_canopy_mean": "tree_canopy_block_group_mean",
        "block_group_tree_canopy_median": "tree_canopy_block_group_median",
        "block_group_tree_canopy_stdev": "tree_canopy_block_group_stdev",
        "block_group_tree_canopy_min": "tree_canopy_block_group_min",
        "block_group_tree_canopy_max": "tree_canopy_block_group_max",
        "block_group_tree_canopy_max_anomalous": "tree_canopy_block_group_max_anomalous",
        "block_group_impervious_mean": "impervious_block_group_mean",
        "block_group_impervious_median": "impervious_block_group_median",
        "block_group_impervious_stdev": "impervious_block_group_stdev",
        "block_group_impervious_min": "impervious_block_group_min",
        "block_group_impervious_max": "impervious_block_group_max",
        "block_group_impervious_max_anomalous": "impervious_block_group_max_anomalous",
        "block_group_heat_severity_mean": "heat_severity_block_group_mean",
        "block_group_heat_severity_median": "heat_severity_block_group_median",
        "block_group_heat_severity_min": "heat_severity_block_group_min",
        "block_group_heat_severity_max": "heat_severity_block_group_max",
        "block_group_heat_severity_std": "heat_severity_block_group_std",
        "block_group_heat_severity_majority_class": "heat_severity_block_group_majority_class",
        "block_group_heat_severity_majority_percent": "heat_severity_block_group_majority_percent",
    }
    rows = []
    for table, columns in (("virginia_block_groups_clean.csv", bg_columns), ("virginia_census_blocks_clean.csv", block_columns)):
        for column in columns:
            if column in inherited and table.endswith("blocks_clean.csv"):
                base = definitions[inherited[column]]
                definition = "Block-group value repeated on every block in the group. " + base[1]
                rows.append({
                    "table": table,
                    "variable": column,
                    "geography": "Value belongs to the block group; repeated on each census block",
                    "definition": definition,
                    "unit": base[2],
                    "source_field": base[3],
                    "missing_or_special_values": base[4],
                })
            else:
                geography, definition, unit, source, missing = definitions[column]
                rows.append({
                    "table": table,
                    "variable": column,
                    "geography": geography,
                    "definition": definition,
                    "unit": unit,
                    "source_field": source,
                    "missing_or_special_values": missing,
                })
    with OUT_DICT.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["table", "variable", "geography", "definition", "unit", "source_field", "missing_or_special_values"],
        )
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
