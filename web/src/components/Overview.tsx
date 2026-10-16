import type { CoverageMetrics } from "../types";

function count(value: number): string {
  return value.toLocaleString("en-US");
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function surface(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1);
}

interface OverviewProps {
  metrics: CoverageMetrics;
}

export function Overview({ metrics }: OverviewProps) {
  return (
    <section id="overview" className="section">
      <div className="section-heading">
        <h2>Overview</h2>
        <p>
          Counts below are calculated from the cleaned Virginia block-group table. Blank
          measurements stay blank. They are not filled with zero.
        </p>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">Block groups</p>
          <p className="metric-value">{count(metrics.blockGroups)}</p>
          <p className="metric-note">One row per block-group GEOID in the cleaned table.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Block groups with heat data</p>
          <p className="metric-value">{count(metrics.withHeat)}</p>
          <p className="metric-note">
            {percent(metrics.heatPercent)} of block groups have a heat-severity mean.{" "}
            {count(metrics.blockGroups - metrics.withHeat)} are blank because the zonal
            join found no heat pixels.
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Numeric median income</p>
          <p className="metric-value">{count(metrics.incomeNumeric)}</p>
          <p className="metric-note">
            {percent(metrics.incomeNumericPercent)} have a single dollar estimate.{" "}
            {count(metrics.incomeInsufficient)} are an insufficient sample, and{" "}
            {count(metrics.incomeTopCoded)} are top-coded at 250,000+.
            {metrics.incomeOther > 0 ? ` ${count(metrics.incomeOther)} have another status.` : ""}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Below twice the poverty line</p>
          <p className="metric-value">{percent(metrics.belowTwicePovertyPercent)}</p>
          <p className="metric-note">
            {count(metrics.belowTwicePovertyPeople)} of {count(metrics.povertyUniversePeople)} people
            earn less than double the Census poverty line. In 2024 that line was $31,812 for a
            family of four with two children, so twice the line is about $63,600.{" "}
            {percent(metrics.belowPovertyPercent)} are under the poverty line itself.{" "}
            {count(metrics.povertyMeasured)} block groups have someone in the count;{" "}
            {count(metrics.povertyEmpty)} do not. {count(metrics.povertyWhereIncomeSuppressed)} still
            have this count where median income is an insufficient sample.
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Canopy and impervious means</p>
          <p className="metric-value">
            {surface(metrics.canopyMedian)}
            <span> / {surface(metrics.imperviousMedian)}</span>
          </p>
          <p className="metric-note">
            Median of the block-group zonal means. Canopy means in this table run from{" "}
            {surface(metrics.canopyMin)} to {surface(metrics.canopyMax)}; impervious means
            run from {surface(metrics.imperviousMin)} to {surface(metrics.imperviousMax)}.
            The files do not name the unit. Other values are consistent with percent cover,
            so percent remains flagged. {count(metrics.canopyAnomalous)} canopy block groups
            keep a pixel maximum of 254.
          </p>
        </article>
      </div>
    </section>
  );
}
