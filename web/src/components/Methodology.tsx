import type { CoverageMetrics } from "../types";

function count(value: number): string {
  return value.toLocaleString("en-US");
}

export function Methodology({ metrics }: { metrics: CoverageMetrics }) {
  return (
    <section id="methods" className="section">
      <div className="section-heading">
        <h2>Methodology and data limitations</h2>
        <p>
          The map and charts read the cleaned block-group table. Census-block rows are not
          used. No vulnerability score is calculated.
        </p>
      </div>
      <div className="method-grid">
        <article>
          <h3>Heat severity</h3>
          <p>
            Heat severity is a relative class from 1 to 5 inside a city. Class 1 means
            mildly above that city’s mean, and class 5 means far above it, using Jenks
            natural breaks. The mapped value is the zonal mean of those class codes. It is
            not degrees Fahrenheit, and the same class cannot be compared across cities as
            a temperature.
          </p>
          <p>
            {count(metrics.withHeat)} of {count(metrics.blockGroups)} block groups have a
            heat mean. The other {count(metrics.blockGroups - metrics.withHeat)} are blank
            because the zonal join found no heat pixels. Those areas are gray on the heat
            map. They are not coded as 0.
          </p>
        </article>
        <article>
          <h3>Income</h3>
          <p>
            Median household income is the ACS 5-year 2024 table B19013 estimate for the
            block group, in 2024 inflation-adjusted dollars. It is not a census-block
            measurement. The dollar field is blank when the published code is “-”
            (insufficient sample, {count(metrics.incomeInsufficient)} block groups) or
            “250,000+” (top-coded, {count(metrics.incomeTopCoded)} block groups). A numeric
            margin of error is the Census 90 percent margin.
          </p>
        </article>
        <article>
          <h3>Canopy and impervious surface</h3>
          <p>
            Both are block-group zonal means. {count(metrics.canopyMeasured)} canopy means
            and {count(metrics.imperviousMeasured)} impervious means are present. Values
            other than two canopy maxima of 254 fall in a 0–100 range, which is consistent
            with percent cover. The source files do not name the unit, raster, or year, so
            percent stays flagged. A mean of 0 is kept as measured, including eight
            water-only block groups with no land area. {count(metrics.canopyAnomalous)}{" "}
            canopy means still include a pixel value of 254.
          </p>
        </article>
        <article>
          <h3>Zero and missing values</h3>
          <p>
            A blank heat mean means the zonal join found no heat pixels. On the map that
            block group is gray. It is not class 0. Class 1 is the lowest measured class:
            mildly above that city’s own mean. Class 5 is far above that city’s mean.
            Those classes are not degrees, and the same class is not the same temperature
            in two cities.
          </p>
          <p>
            A canopy or impervious mean of 0 is a measured zonal mean, including eight
            water-only block groups with no land area. It is not a missing value. The
            files do not name the unit or year. Other values fall in a 0–100 range, which
            is consistent with percent cover, so percent stays flagged. Two canopy means
            still include a pixel value of 254.
          </p>
          <p>
            Income is blank, not $0, when the Census code is “-” ({count(metrics.incomeInsufficient)}{" "}
            block groups, insufficient sample). It is also blank when the code is
            “250,000+” ({count(metrics.incomeTopCoded)} block groups). Those two cases use
            their own map colors and are left off the income charts. They are not drawn as
            $0 or $250,000.
          </p>
        </article>
        <article>
          <h3>Geography and sources</h3>
          <p>
            Block-group boundaries on the map come from the tree-canopy block-group
            GeoJSON. The validation check found the same GEOIDs and the same land and water
            areas in the canopy, impervious, and heat boundary files. Rings are simplified
            for display. Attributes still come from the cleaned table, joined on the
            12-digit GEOID.
          </p>
          <ul>
            <li>Income: U.S. Census Bureau, 2024 American Community Survey 5-year estimates, table B19013.</li>
            <li>Heat classes: within-city 1–5 classification supplied with the project files. The raster year is not verified here.</li>
            <li>Tree canopy and impervious surface: zonal statistics supplied with the project files. Source and year are not verified here.</li>
            <li>Land and water area: Census TIGER square meters, as defined by the Census Bureau. The GeoJSON does not restate the unit.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
