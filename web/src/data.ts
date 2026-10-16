import type { BlockGroup, CoverageMetrics, JoinedFeature, PlaceOption } from "./types";

const NUMERIC_FIELDS = [
  "land_area_sq_m",
  "water_area_sq_m",
  "median_household_income_dollars",
  "median_household_income_moe_dollars",
  "poverty_universe",
  "poverty_universe_moe",
  "below_poverty",
  "below_poverty_moe",
  "below_twice_poverty",
  "below_twice_poverty_moe",
  "tree_canopy_block_group_mean",
  "tree_canopy_block_group_median",
  "tree_canopy_block_group_max",
  "impervious_block_group_mean",
  "impervious_block_group_median",
  "heat_severity_block_group_mean",
  "heat_severity_block_group_median",
  "heat_severity_block_group_min",
  "heat_severity_block_group_max",
  "heat_severity_block_group_majority_class",
  "heat_severity_block_group_majority_percent",
  "heat_severity_block_group_pixel_count",
] as const;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((item) => item.some((value) => value.length > 0));
  if (!header) return [];
  return body.map((values) => {
    const record: Record<string, string> = {};
    header.forEach((name, index) => {
      record[name] = values[index] ?? "";
    });
    return record;
  });
}

function numberOrNull(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBlockGroup(row: Record<string, string>): BlockGroup {
  const record = { ...row } as unknown as BlockGroup;
  for (const field of NUMERIC_FIELDS) {
    record[field] = numberOrNull(row[field]);
  }
  return record;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function coverageMetrics(rows: BlockGroup[]): CoverageMetrics {
  const canopy = rows
    .map((row) => row.tree_canopy_block_group_mean)
    .filter((value): value is number => value != null);
  const impervious = rows
    .map((row) => row.impervious_block_group_mean)
    .filter((value): value is number => value != null);
  const withHeat = rows.filter((row) => row.heat_severity_block_group_mean != null).length;
  const incomeNumeric = rows.filter((row) => row.median_household_income_status === "numeric").length;
  const incomeInsufficient = rows.filter(
    (row) => row.median_household_income_status === "insufficient_sample",
  ).length;
  const incomeTopCoded = rows.filter((row) => row.median_household_income_status === "top_coded").length;
  const total = rows.length;
  return {
    blockGroups: total,
    withHeat,
    heatPercent: total === 0 ? 0 : (withHeat / total) * 100,
    incomeNumeric,
    incomeInsufficient,
    incomeTopCoded,
    incomeOther: total - incomeNumeric - incomeInsufficient - incomeTopCoded,
    incomeNumericPercent: total === 0 ? 0 : (incomeNumeric / total) * 100,
    canopyMedian: median(canopy),
    canopyMin: canopy.length ? Math.min(...canopy) : null,
    canopyMax: canopy.length ? Math.max(...canopy) : null,
    canopyMeasured: canopy.length,
    imperviousMedian: median(impervious),
    imperviousMin: impervious.length ? Math.min(...impervious) : null,
    imperviousMax: impervious.length ? Math.max(...impervious) : null,
    imperviousMeasured: impervious.length,
    canopyAnomalous: rows.filter((row) => row.tree_canopy_block_group_max_anomalous === "yes").length,
    ...povertyMetrics(rows),
  };
}

function povertyMetrics(rows: BlockGroup[]): Pick<
  CoverageMetrics,
  | "povertyMeasured"
  | "povertyEmpty"
  | "povertyUniversePeople"
  | "belowPovertyPeople"
  | "belowTwicePovertyPeople"
  | "belowPovertyPercent"
  | "belowTwicePovertyPercent"
  | "povertyWhereIncomeSuppressed"
> {
  const measured = rows.filter((row) => row.poverty_universe != null && row.poverty_universe > 0);
  const universe = measured.reduce((sum, row) => sum + (row.poverty_universe ?? 0), 0);
  const belowPoverty = measured.reduce((sum, row) => sum + (row.below_poverty ?? 0), 0);
  const belowTwice = measured.reduce((sum, row) => sum + (row.below_twice_poverty ?? 0), 0);
  const suppressed = measured.filter((row) => row.median_household_income_status === "insufficient_sample");
  return {
    povertyMeasured: measured.length,
    povertyEmpty: rows.filter((row) => row.poverty_universe === 0).length,
    povertyUniversePeople: universe,
    belowPovertyPeople: belowPoverty,
    belowTwicePovertyPeople: belowTwice,
    belowPovertyPercent: universe === 0 ? 0 : (belowPoverty / universe) * 100,
    belowTwicePovertyPercent: universe === 0 ? 0 : (belowTwice / universe) * 100,
    povertyWhereIncomeSuppressed: suppressed.length,
  };
}

function quantile(values: number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
}

export interface PovertyRecommendation {
  twicePovertyPercent: number;
  povertyPercent: number;
  universePeople: number;
  twicePovertyPeople: number;
  suppressedBlockGroups: number;
  suppressedPeople: number;
  suppressedTwicePovertyPercent: number;
  hotLowCanopyPeople: number;
  hotLowCanopyTwicePovertyPercent: number;
  otherHeatTwicePovertyPercent: number;
}

export function povertyRecommendation(rows: BlockGroup[]): PovertyRecommendation {
  const measured = rows.filter((row) => row.poverty_universe != null && row.poverty_universe > 0);
  const universe = measured.reduce((sum, row) => sum + (row.poverty_universe ?? 0), 0);
  const belowPoverty = measured.reduce((sum, row) => sum + (row.below_poverty ?? 0), 0);
  const belowTwice = measured.reduce((sum, row) => sum + (row.below_twice_poverty ?? 0), 0);
  const suppressed = measured.filter((row) => row.median_household_income_status === "insufficient_sample");
  const suppressedPeople = suppressed.reduce((sum, row) => sum + (row.poverty_universe ?? 0), 0);
  const suppressedTwice = suppressed.reduce((sum, row) => sum + (row.below_twice_poverty ?? 0), 0);
  const heatValues = rows
    .map((row) => row.heat_severity_block_group_mean)
    .filter((value): value is number => value != null);
  const canopyValues = rows
    .map((row) => row.tree_canopy_block_group_mean)
    .filter((value): value is number => value != null);
  const heatCut = quantile(heatValues, 0.75);
  const canopyCut = quantile(canopyValues, 0.25);
  const withHeat = measured.filter((row) => row.heat_severity_block_group_mean != null);
  const hotLow =
    heatCut == null || canopyCut == null
      ? []
      : withHeat.filter(
          (row) =>
            (row.heat_severity_block_group_mean ?? 0) >= heatCut &&
            row.tree_canopy_block_group_mean != null &&
            row.tree_canopy_block_group_mean <= canopyCut,
        );
  const otherHeat =
    heatCut == null
      ? []
      : withHeat.filter((row) => (row.heat_severity_block_group_mean ?? 0) < heatCut);
  const share = (group: BlockGroup[]) => {
    const people = group.reduce((sum, row) => sum + (row.poverty_universe ?? 0), 0);
    const under = group.reduce((sum, row) => sum + (row.below_twice_poverty ?? 0), 0);
    return { people, percent: people === 0 ? 0 : (under / people) * 100 };
  };
  const hotShare = share(hotLow);
  const otherShare = share(otherHeat);
  return {
    twicePovertyPercent: universe === 0 ? 0 : (belowTwice / universe) * 100,
    povertyPercent: universe === 0 ? 0 : (belowPoverty / universe) * 100,
    universePeople: universe,
    twicePovertyPeople: belowTwice,
    suppressedBlockGroups: suppressed.length,
    suppressedPeople,
    suppressedTwicePovertyPercent: suppressedPeople === 0 ? 0 : (suppressedTwice / suppressedPeople) * 100,
    hotLowCanopyPeople: hotShare.people,
    hotLowCanopyTwicePovertyPercent: hotShare.percent,
    otherHeatTwicePovertyPercent: otherShare.percent,
  };
}

export function placeOptions(rows: BlockGroup[]): PlaceOption[] {
  const counts = new Map<string, PlaceOption>();
  for (const row of rows) {
    const existing = counts.get(row.county_fips);
    if (existing) {
      existing.blockGroups += 1;
    } else {
      counts.set(row.county_fips, {
        countyFips: row.county_fips,
        name: row.county_namelsad || row.county_name || row.county_fips,
        jurisdictionType: row.jurisdiction_type,
        blockGroups: 1,
      });
    }
  }
  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadDashboardData(): Promise<{
  rows: BlockGroup[];
  features: JoinedFeature[];
}> {
  const base = import.meta.env.BASE_URL;
  const [csvResponse, geoResponse, povertyResponse] = await Promise.all([
    fetch(`${base}data/virginia_block_groups_clean.csv`),
    fetch(`${base}data/virginia_block_group_boundaries.geojson`),
    fetch(`${base}data/virginia_poverty_ratio_2024.csv`),
  ]);
  if (!csvResponse.ok) {
    throw new Error(`Could not load the block-group table (${csvResponse.status}).`);
  }
  if (!geoResponse.ok) {
    throw new Error(`Could not load block-group boundaries (${geoResponse.status}).`);
  }
  if (!povertyResponse.ok) {
    throw new Error(`Could not load the poverty-ratio table (${povertyResponse.status}).`);
  }
  const [csvText, geojson, povertyText] = await Promise.all([
    csvResponse.text(),
    geoResponse.json(),
    povertyResponse.text(),
  ]);
  const povertyById = new Map(
    parseCsv(povertyText).map((row) => [row.block_group_geoid, row]),
  );
  const rows = parseCsv(csvText).map((row) => toBlockGroup({ ...row, ...povertyById.get(row.block_group_geoid) }));
  const byId = new Map(rows.map((row) => [row.block_group_geoid, row]));
  const features: JoinedFeature[] = [];
  for (const feature of geojson.features ?? []) {
    const geoid = String(feature.properties?.GEOID ?? "");
    const row = byId.get(geoid);
    if (!row || !feature.geometry) continue;
    features.push({
      type: "Feature",
      properties: row,
      geometry: feature.geometry,
    });
  }
  if (rows.length === 0 || features.length === 0) {
    throw new Error("The block-group files loaded, but they did not contain usable records.");
  }
  return { rows, features };
}
