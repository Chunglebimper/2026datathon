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
        <p className="lead">
          Extreme heat is not experienced equally across Virginia. Neighborhoods with limited
          tree canopy and extensive paved surfaces experience higher surface temperatures, while
          residents with limited financial resources may face additional barriers to staying cool.
          Our interactive dashboard allows state and local decision-makers to find and support
          low-income communities suffering from heat severity.
        </p>
        <p>
          Counts below are calculated from the cleaned Virginia block-group table. Blank
          measurements stay blank. They are not filled with zero.
        </p>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">Census Block groups</p>
          <p className="metric-value">{count(metrics.blockGroups)}</p>
          <p className="metric-note">each with a population of ~600 to 3000 people.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Block groups with heat data</p>
          <p className="metric-value">{count(metrics.withHeat)}</p>
          <p className="metric-note">
            {percent(metrics.heatPercent)} of census block groups have heat-severity data (primarily in urban areas).{" "}
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
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Canopy and impervious means</p>
          <p className="metric-value">
            {surface(metrics.canopyMedian)}%
            <span> / {surface(metrics.imperviousMedian)}%</span>
          </p>
          <p className="metric-note">
            median percent across the state. Tree Canopy coverage is the quantity of land covered by tree foilage
            and impervious surfaces are those that impede water infiltration into soil such as concrete or asphalt.

          </p>
        </article>
      </div>
    </section>
  );
}
