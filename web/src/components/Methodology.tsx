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
          <h3>Ratio of income to poverty</h3>
          <p>
            The poverty layer uses the ACS 5-year 2024 ratio of income to the poverty
            line, joined on the 12-digit GEOID. The poverty line is a dollar cutoff that
            rises with household size. In 2024 it was $31,812 for a family of four with
            two children, so twice the line is about $63,600. “Below twice the poverty
            line” is everyone in the poverty count except the “2.00 and over” bin. “Under
            the poverty line” is the “under 0.50” and “0.50 to 0.99” bins added together.
            The mapped value is the doubled-line count divided by the people in the count.{" "}
            {count(metrics.povertyMeasured)} block groups have someone in that count.{" "}
            {count(metrics.povertyEmpty)} have a count of zero and stay gray. They are not
            drawn as 0%.
          </p>
          <p>
            The margin shown on a selected block group for the doubled-line count is the Census
            approximation for a difference of two estimates: the square root of the sum of
            the squared 90% margins on the universe and on the “2.00 and over” count.
            Block-group margins are often wide, so the share is a screen inside one city,
            not a ranking of one block group against the next. College towns can look
            high because students are included.
          </p>
        </article>
        <article>
          <h3>Canopy and impervious surface</h3>
          <p>
            Both are block-group zonal means. {count(metrics.canopyMeasured)} canopy means
            and {count(metrics.imperviousMeasured)} impervious means are present. Values
            other than two canopy maxima of 254 fall in a 0–100 range, which is consistent
            with percent cover. The MRLC download used here does not name the product year
            in the table, so percent stays flagged. A mean of 0 is kept as measured, including eight
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
          <ul className="source-list">
            <li>
              <a href="https://www.arcgis.com/home/item.html?id=48edb3800dab4f70ae42eb0ccf5e08f4#overview" target="_blank" rel="noreferrer">
                Heat Severity — USA 2025
              </a>
              <p>
                Trust for Public Land. Relative heat severity for each city, classes 1–5, from
                Landsat 8 surface temperature in summer 2025.
              </p>
            </li>
            <li>
              <a href="https://www.mrlc.gov/viewer/" target="_blank" rel="noreferrer">MRLC viewer</a>
              {" · "}
              <a href="https://www.mrlc.gov/data" target="_blank" rel="noreferrer">MRLC data download</a>
              <p>
                Tree canopy and impervious surface from the Multi-Resolution Land Characteristics
                Consortium. The Virginia extract can be clipped in the viewer or downloaded from the data page.
              </p>
            </li>
            <li>
              <a href="https://johnnyfinn.substack.com/p/the-unequal-geography-of-heat" target="_blank" rel="noreferrer">
                The Unequal Geography of Heat
              </a>
              <p>Johnny Finn, September 3, 2026. Background essay on trees, pavement, income, and heat.</p>
            </li>
            <li>
              Income: U.S. Census Bureau, 2024 American Community Survey 5-year estimates, table B19013.
            </li>
            <li>
              Poverty ratio: U.S. Census Bureau, 2024 American Community Survey 5-year estimates,
              ratio of income to poverty level by block group. The site uses the 2024 rows only.
            </li>
            <li>
              Land and water area: Census TIGER square meters, as defined by the Census Bureau.
              The GeoJSON does not restate the unit.
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
