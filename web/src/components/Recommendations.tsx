import type { PovertyRecommendation } from "../data";

const SLOTS = [
  "Where heat severity is high relative to the same city",
  "Where tree canopy is limited",
];

function count(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const CHATBOT_SRC = "https://interfaces.zapier.com/embed/chatbot/cmvab5ost009veqxawinfyi6q";

export function Recommendations({ poverty }: { poverty: PovertyRecommendation }) {
  return (
    <section id="recommendations" className="section">
      <div className="section-heading">
        <h2>Recommendations</h2>
        <p>
          The affordability card uses the 2024 poverty-ratio counts. The heat and canopy
          cards are still open slots. Compare poverty with heat inside one city. The same
          heat class is not the same temperature in two cities.
        </p>
      </div>
      <div className="recommendation-layout">
        <div className="recommendation-list">
          {SLOTS.map((title, index) => (
            <article key={title} className="recommendation-card">
              <p className="placeholder-flag">Placeholder {index + 1} — not a validated finding</p>
              <h3>{title}</h3>
              <dl>
                <div>
                  <dt>Observed finding</dt>
                  <dd>To be written from the validated block-group results.</dd>
                </div>
                <div>
                  <dt>Potential intervention</dt>
                  <dd>To be chosen after the finding is confirmed.</dd>
                </div>
                <div>
                  <dt>Rationale</dt>
                  <dd>To be tied to a specific pattern in the data, without a composite score.</dd>
                </div>
                <div>
                  <dt>Possible government partner</dt>
                  <dd>To be named when the intervention and jurisdiction are known.</dd>
                </div>
                <div>
                  <dt>Next step</dt>
                  <dd>To be set with the local staff who would use the result.</dd>
                </div>
              </dl>
            </article>
          ))}
          <article className="recommendation-card">
            <p className="placeholder-flag">From the 2024 poverty-ratio table</p>
            <h3>Where cooling costs may be harder to afford</h3>
            <dl>
              <div>
                <dt>Observed finding</dt>
                <dd>
                  {percent(poverty.twicePovertyPercent)} of people in the poverty count
                  ({count(poverty.twicePovertyPeople)} of {count(poverty.universePeople)}) are
                  below twice the poverty line. In 2024 that line was $31,812 for a family of
                  four with two children, so twice the line is about $63,600. The Census table
                  calls this “under 200% of poverty.” {percent(poverty.povertyPercent)} are
                  under the poverty line itself. Median income is suppressed in{" "}
                  {count(poverty.suppressedBlockGroups)} block groups that still have this count
                  ({count(poverty.suppressedPeople)} people,{" "}
                  {percent(poverty.suppressedTwicePovertyPercent)} below twice the line).
                </dd>
              </div>
              <div>
                <dt>Potential intervention</dt>
                <dd>
                  Point cooling-bill assistance and weatherization outreach to block groups
                  in the same city where heat severity is high and a large share of people
                  are below twice the poverty line. Use the share as a screen, then check the
                  margin of error before treating two neighboring block groups as different.
                </dd>
              </div>
              <div>
                <dt>Rationale</dt>
                <dd>
                  Twice the poverty line is closer to who struggles with a cooling bill than
                  either the official poverty line or median household income. Median income
                  describes the typical household. In block groups that are in the top quarter
                  of heat and the bottom quarter of tree canopy,{" "}
                  {percent(poverty.hotLowCanopyTwicePovertyPercent)} of{" "}
                  {count(poverty.hotLowCanopyPeople)} people are below twice the line. In other
                  block groups with a heat measurement, that share is{" "}
                  {percent(poverty.otherHeatTwicePovertyPercent)}. College towns can look
                  high on this ratio because students are in the count.
                </dd>
              </div>
              <div>
                <dt>Possible government partner</dt>
                <dd>
                  Local departments of social services for energy assistance, with the
                  Virginia Department of Social Services, and the Virginia Department of
                  Housing and Community Development for weatherization. Name the local
                  office once a city is selected.
                </dd>
              </div>
              <div>
                <dt>Next step</dt>
                <dd>
                  On the map, choose one city and turn on “Below twice the poverty line.” Review
                  block groups that are high on that layer and high on heat severity
                  relative to the same city. Leave a block group out when its poverty
                  universe is zero or the count margin of error swallows the estimate.
                </dd>
              </div>
            </dl>
          </article>
        </div>
        <aside className="chat-panel">
          <h3>Ask about the data</h3>
          <p className="chart-caption">
            Answers from this chatbot are not a substitute for the validated tables on the
            other tabs.
          </p>
          <iframe
            className="chat-frame"
            title="Project data chatbot"
            src={CHATBOT_SRC}
            height="600"
            width="400"
            allow="clipboard-write *"
          />
        </aside>
      </div>
    </section>
  );
}
