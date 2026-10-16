import type { BlockGroup, MapLayer } from "./types";

export const LAYER_OPTIONS: { id: MapLayer; label: string }[] = [
  { id: "heat", label: "Heat severity" },
  { id: "canopy", label: "Tree canopy" },
  { id: "impervious", label: "Impervious surface" },
  { id: "income", label: "Median household income" },
];

const HEAT_STOPS = ["#2f6f86", "#7eae9a", "#e4c56a", "#e08a45", "#b6402c"];
const CANOPY_STOPS = ["#f4ead4", "#c9d7a2", "#7eae6a", "#3d7a49", "#1c4d32"];
const IMPERVIOUS_STOPS = ["#f6f0e4", "#e7c39a", "#d08a5a", "#b35a38", "#7a3124"];
const INCOME_STOPS = ["#f3e4cf", "#d7c4a3", "#8eafc4", "#3d7198", "#1d3f66"];

export const MISSING_COLOR = "#cfc8be";
export const INCOME_INSUFFICIENT_COLOR = "#8d86a3";
export const INCOME_TOP_CODED_COLOR = "#3d315b";

function mix(from: string, to: string, amount: number): string {
  const left = from.match(/\w\w/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const right = to.match(/\w\w/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const channels = left.map((channel, index) =>
    Math.round(channel + (right[index] - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function ramp(stops: string[], amount: number): string {
  const clamped = Math.min(1, Math.max(0, amount));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  return mix(stops[index], stops[index + 1], scaled - index);
}

export function layerColor(row: BlockGroup, layer: MapLayer): string {
  if (layer === "heat") {
    const value = row.heat_severity_block_group_mean;
    if (value == null) return MISSING_COLOR;
    return ramp(HEAT_STOPS, (value - 1) / 4);
  }
  if (layer === "canopy") {
    const value = row.tree_canopy_block_group_mean;
    if (value == null) return MISSING_COLOR;
    return ramp(CANOPY_STOPS, value / 80);
  }
  if (layer === "impervious") {
    const value = row.impervious_block_group_mean;
    if (value == null) return MISSING_COLOR;
    return ramp(IMPERVIOUS_STOPS, value / 80);
  }
  if (row.median_household_income_status === "insufficient_sample") return INCOME_INSUFFICIENT_COLOR;
  if (row.median_household_income_status === "top_coded") return INCOME_TOP_CODED_COLOR;
  const income = row.median_household_income_dollars;
  if (income == null) return MISSING_COLOR;
  return ramp(INCOME_STOPS, Math.min(income, 180000) / 180000);
}

export interface LegendItem {
  color: string;
  label: string;
}

export function legendFor(layer: MapLayer): { title: string; note: string; items: LegendItem[] } {
  if (layer === "heat") {
    return {
      title: "Average heat-severity class",
      note: "Classes run from 1 to 5 within a city. A blank is missing heat pixels, not class 0. The same class in two cities is not the same temperature.",
      items: [
        { color: HEAT_STOPS[0], label: "1" },
        { color: HEAT_STOPS[1], label: "2" },
        { color: HEAT_STOPS[2], label: "3" },
        { color: HEAT_STOPS[3], label: "4" },
        { color: HEAT_STOPS[4], label: "5" },
        { color: MISSING_COLOR, label: "No heat pixels" },
      ],
    };
  }
  if (layer === "canopy") {
    return {
      title: "Tree-canopy zonal mean",
      note: "Stored values are consistent with percent cover. The source file does not name the unit or year. A value of 0 is a measured mean, including water-only block groups.",
      items: [
        { color: CANOPY_STOPS[0], label: "0" },
        { color: CANOPY_STOPS[1], label: "20" },
        { color: CANOPY_STOPS[2], label: "40" },
        { color: CANOPY_STOPS[3], label: "60" },
        { color: CANOPY_STOPS[4], label: "80 or higher" },
        { color: MISSING_COLOR, label: "Missing mean" },
      ],
    };
  }
  if (layer === "impervious") {
    return {
      title: "Impervious-surface zonal mean",
      note: "Stored values are consistent with percent cover. The source file does not name the unit or year. A value of 0 is a measured mean, not a missing value.",
      items: [
        { color: IMPERVIOUS_STOPS[0], label: "0" },
        { color: IMPERVIOUS_STOPS[1], label: "20" },
        { color: IMPERVIOUS_STOPS[2], label: "40" },
        { color: IMPERVIOUS_STOPS[3], label: "60" },
        { color: IMPERVIOUS_STOPS[4], label: "80 or higher" },
        { color: MISSING_COLOR, label: "Missing mean" },
      ],
    };
  }
  return {
    title: "Median household income",
    note: "Dollars are ACS 2024 5-year estimates in 2024 inflation-adjusted dollars. Suppressed and top-coded estimates are separate colors. They are not drawn as $0 or $250,000.",
    items: [
      { color: INCOME_STOPS[0], label: "Lower numeric estimates" },
      { color: INCOME_STOPS[2], label: "Middle of the scale" },
      { color: INCOME_STOPS[4], label: "About $180,000 or higher" },
      { color: INCOME_INSUFFICIENT_COLOR, label: "Insufficient sample" },
      { color: INCOME_TOP_CODED_COLOR, label: "Top-coded" },
      { color: MISSING_COLOR, label: "No income record" },
    ],
  };
}
