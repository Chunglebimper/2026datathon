import type { BlockGroup } from "./types";

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "n/a";
  return Math.round(value).toLocaleString("en-US");
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "n/a";
  return `${value.toFixed(1)}%`;
}

// ── Place helpers ─────────────────────────────────────────────────────────────

/**
 * The data is at the block-group scale, but for jurisdictions that are
 * actually cities (independent cities or compact urban counties), the term
 * "neighborhood" is much easier for readers to picture. We switch based on
 * the number of block groups in the jurisdiction:
 *   - 20 or fewer  -> "neighborhood" (each is large, city-block scale)
 *   - more than 20 -> "block group" (too granular for the "neighborhood" label)
 */
export function neighborhoodWord(_countyFips: string, blockGroups: number): "neighborhood" | "block group" {
  return blockGroups <= 20 ? "neighborhood" : "block group";
}

/**
 * Human-friendly label for a single feature, e.g. "neighborhood 2101" or
 * "block group 1803". The number comes from the last 4 digits of the block
 * group FIPS so readers see a short, sortable token instead of a long geoid.
 */
export function placeLabel(countyFips: string, blockGroups: number, geoid: string): string {
  const unit = neighborhoodWord(countyFips, blockGroups);
  const short = geoid.slice(-4);
  return `${unit} ${short}`;
}

// ── Correlation ───────────────────────────────────────────────────────────────

/**
 * Pearson correlation coefficient (r) in the range [-1, 1].
 * Returns null when fewer than 3 paired values are available or when
 * either variable has zero variance.
 */
export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Returns block groups that have both a heat-severity mean and a canopy mean.
 */
export function heatCanopyPairs(rows: BlockGroup[]): { heat: number; canopy: number }[] {
  return rows
    .filter((r) => r.heat_severity_block_group_mean != null && r.tree_canopy_block_group_mean != null)
    .map((r) => ({
      heat: r.heat_severity_block_group_mean as number,
      canopy: r.tree_canopy_block_group_mean as number,
    }));
}

/**
 * Pearson r between heat-severity mean and canopy mean for the given block groups.
 */
export function heatCanopyCorrelation(rows: BlockGroup[]): number | null {
  const pairs = heatCanopyPairs(rows);
  if (pairs.length < 3) return null;
  return pearsonCorrelation(
    pairs.map((p) => p.heat),
    pairs.map((p) => p.canopy),
  );
}

/**
 * Describe a Pearson correlation score in plain language.
 */
export function correlationNote(score: number | null, n: number, place: string): string {
  if (score == null || Number.isNaN(score)) {
    return "Not enough block groups with both heat severity and tree canopy to compute a correlation.";
  }
  const sign = score < 0 ? "inverse" : "positive";
  const magnitude = Math.abs(score);
  const strength =
    magnitude >= 0.7 ? "strong" :
    magnitude >= 0.4 ? "moderate" :
    magnitude >= 0.2 ? "weak" :
    "very weak";
  const direction = score < 0 ? "where canopy is higher, heat is lower" : "where canopy is higher, heat is higher";
  return `${strength} ${sign} correlation across ${n} block groups in ${place}: ${direction}. Correlation is not causation — urban heat is shaped by many factors (density, surface materials, air quality, etc.) — but this is a signal worth acting on.`;
}

// ── Neighborhood ranking ──────────────────────────────────────────────────────

export interface RankedNeighborhood {
  geoid: string;
  name: string;
  heatMean: number;
  canopyMean: number;
  imperviousMean: number | null;
  povertyPercent: number | null;
  score: number;
}

/**
 * Ranks block groups by a composite heat-vulnerability score (0–100).
 *
 * Weighted blend:
 *   40 %  heat-severity mean          (higher = hotter)
 *   25 %  inverse canopy mean         (less canopy = higher vulnerability)
 *   20 %  impervious-surface mean     (more paved = higher vulnerability)
 *   15 %  below-twice-poverty share   (higher share = higher financial vulnerability)
 *
 * Missing values are excluded; remaining weights are renormalised.
 * Returns the top `topN` rows sorted by descending score.
 */
export function rankNeighborhoods(rows: BlockGroup[], topN = 5): RankedNeighborhood[] {
  const minMax = (vals: number[]): ((v: number) => number) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max === min) return () => 0.5;
    return (v: number) => (v - min) / (max - min);
  };

  const heatVals = rows.map((r) => r.heat_severity_block_group_mean).filter((v): v is number => v != null);
  const canopyVals = rows.map((r) => r.tree_canopy_block_group_mean).filter((v): v is number => v != null);
  const imperviousVals = rows.map((r) => r.impervious_block_group_mean).filter((v): v is number => v != null);
  const povertyVals: number[] = [];
  for (const r of rows) {
    if (r.poverty_universe != null && r.poverty_universe > 0 && r.below_twice_poverty != null) {
      povertyVals.push((r.below_twice_poverty / r.poverty_universe) * 100);
    }
  }

  const normHeat = minMax(heatVals.length > 0 ? heatVals : [0]);
  const normCanopy = minMax(canopyVals.length > 0 ? canopyVals : [0]);
  const normImpervious = minMax(imperviousVals.length > 0 ? imperviousVals : [0]);
  const normPoverty = minMax(povertyVals.length > 0 ? povertyVals : [0]);

  const W = { heat: 0.4, canopy: 0.25, impervious: 0.2, poverty: 0.15 };

  const scored: RankedNeighborhood[] = rows.map((row) => {
    const heat = row.heat_severity_block_group_mean;
    const canopy = row.tree_canopy_block_group_mean;
    const imperviousVal = row.impervious_block_group_mean;
    const povertyPct =
      row.poverty_universe != null && row.poverty_universe > 0 && row.below_twice_poverty != null
        ? (row.below_twice_poverty / row.poverty_universe) * 100
        : null;
    let score = 0;
    let weightUsed = 0;
    if (heat != null) { score += normHeat(heat) * W.heat; weightUsed += W.heat; }
    if (canopy != null) { score += (1 - normCanopy(canopy)) * W.canopy; weightUsed += W.canopy; }
    if (imperviousVal != null) { score += normImpervious(imperviousVal) * W.impervious; weightUsed += W.impervious; }
    if (povertyPct != null) { score += normPoverty(povertyPct) * W.poverty; weightUsed += W.poverty; }
    return {
      geoid: row.block_group_geoid,
      name: row.acs_geographic_name || row.block_group_geoid,
      heatMean: heat as number,
      canopyMean: canopy as number,
      imperviousMean: imperviousVal,
      povertyPercent: povertyPct,
      score: (weightUsed === 0 ? 0 : score / weightUsed) * 100,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
