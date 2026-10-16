export type MapLayer = "heat" | "canopy" | "impervious" | "income";

export interface BlockGroup {
  block_group_geoid: string;
  county_fips: string;
  tract_code: string;
  block_group_code: string;
  acs_geographic_name: string;
  county_name: string;
  county_namelsad: string;
  jurisdiction_type: string;
  land_area_sq_m: number | null;
  water_area_sq_m: number | null;
  median_household_income_status: string;
  median_household_income_code: string;
  median_household_income_dollars: number | null;
  median_household_income_moe_dollars: number | null;
  tree_canopy_block_group_mean: number | null;
  tree_canopy_block_group_median: number | null;
  tree_canopy_block_group_max: number | null;
  tree_canopy_block_group_max_anomalous: string;
  impervious_block_group_mean: number | null;
  impervious_block_group_median: number | null;
  heat_severity_block_group_mean: number | null;
  heat_severity_block_group_median: number | null;
  heat_severity_block_group_min: number | null;
  heat_severity_block_group_max: number | null;
  heat_severity_block_group_majority_class: number | null;
  heat_severity_block_group_majority_percent: number | null;
  heat_severity_block_group_pixel_count: number | null;
}

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

export interface JoinedFeature {
  type: "Feature";
  properties: BlockGroup;
  geometry: MultiPolygonGeometry;
}

export interface CoverageMetrics {
  blockGroups: number;
  withHeat: number;
  heatPercent: number;
  incomeNumeric: number;
  incomeInsufficient: number;
  incomeTopCoded: number;
  incomeOther: number;
  incomeNumericPercent: number;
  canopyMedian: number | null;
  canopyMin: number | null;
  canopyMax: number | null;
  canopyMeasured: number;
  imperviousMedian: number | null;
  imperviousMin: number | null;
  imperviousMax: number | null;
  imperviousMeasured: number;
  canopyAnomalous: number;
}

export interface PlaceOption {
  countyFips: string;
  name: string;
  jurisdictionType: string;
  blockGroups: number;
}
