import type { BlockGroup, CoverageMetrics, PovertyRecommendation } from "../types";
import { correlationNote, formatNumber, formatPercent, heatCanopyCorrelation, heatCanopyPairs, rankNeighborhoods } from "../helpers";

const CHATBOT_SRC = "https://interfaces.zapier.com/embed/chatbot/cmvab5ost009veqxawinfyi6q";

interface RecommendationsProps {
  poverty: PovertyRecommendation;
  metrics: CoverageMetrics;
  placeName: string;
  visibleRows: BlockGroup[];
}

export function Recommendations({ poverty, metrics, placeName, visibleRows }: RecommendationsProps) {
  const suppressionRate =
    metrics.blockGroups === 0 ? 0 : (metrics.incomeInsufficient / metrics.blockGroups) * 100;
  const surface = (value: number | null) => (value == null ? null : value.toFixed(1));
  const ranked = rankNeighborhoods(visibleRows, 10);
  const rScore = heatCanopyCorrelation(visibleRows);
  const nPairs = heatCanopyPairs(visibleRows).length;

  return (
    <section id="recommendations" className="section">
      <div className="section-heading">
        <h2>Recommendations</h2>
        <p>
          Our primary recommendation is to direct cooling-cost assistance to the roughly
          {formatPercent(poverty.twicePovertyPercent)} of residents living below twice the federal
          poverty line. We do not yet have validated heat data that lets us narrow this
          further to specific hot neighborhoods.
        </p>
      </div>
      <div className="recommendation-layout">
        <div className="recommendation-list">
          <article className="recommendation-card">
            <p className="placeholder-flag">Primary finding — 2024 poverty-ratio table</p>
            <h3>
              {formatPercent(poverty.twicePovertyPercent)} of residents live below twice the federal
              poverty line
            </h3>
            <dl>
              <div>
                <dt>Observed finding</dt>
                <dd>
                  {formatNumber(poverty.belowTwicePovertyPeople)} of {formatNumber(poverty.universePeople)} people (
                  {formatPercent(poverty.twicePovertyPercent)}) are below twice the federal poverty line.
                  In 2024 that line was $31,812 for a family of four with two children, so twice
                  the line is about $63,600. The Census table calls this “under 200% of poverty.”{" "}
                  {formatPercent(poverty.povertyPercent)} are under the poverty line itself. In these
                  areas, paying a summer cooling bill competes directly with rent, food, and other
                  essentials.
                </dd>
              </div>
              <div>
                <dt>Potential intervention</dt>
                <dd>
                  Expand summer utility assistance (LIHEAP / Emergency Assistance), cooling
                  centers, and weatherization outreach in jurisdictions with high shares of
                  residents below twice the poverty line. Use the “Below twice the poverty
                  line” layer to target the highest-share block groups, and check each block
                  group’s margin of error before treating neighboring areas as different.
                </dd>
              </div>
              <div>
                <dt>Rationale</dt>
                <dd>
                  Twice the poverty line is closer to who struggles with a cooling bill than
                  either the official poverty line or median household income — median income
                  describes the typical household and can look “fine” even in places where a
                  large share of residents can barely cover essentials. College towns can read
                  high on this ratio because students are in the count, so pair the share with
                  a quick look at the composition of the block group.
                </dd>
              </div>
              <div>
                <dt>Possible government partner</dt>
                <dd>
                  Local departments of social services for energy assistance, with the
                  Virginia Department of Social Services, and the Virginia Department of
                  Housing and Community Development for weatherization. Name the local office
                  once a city is selected.
                </dd>
              </div>
              <div>
                <dt>Next step</dt>
                <dd>
                  On the map, choose one city and turn on “Below twice the poverty line.”
                  Review the block groups with the highest shares and route cooling-bill
                  assistance there first. Leave a block group out when its poverty universe is
                  zero or the count margin of error swallows the estimate.
                </dd>
              </div>
            </dl>
          </article>
          <article className="recommendation-card">
            <p className="placeholder-flag">Evidence</p>
            <h3>What supports this recommendation</h3>
            <dl>
              <div>
                <dt>Suppression rate</dt>
                <dd>
                  Median household income is suppressed in {formatNumber(metrics.incomeInsufficient)} of{" "}
                  {formatNumber(metrics.blockGroups)} block groups ({formatPercent(suppressionRate)}) — too few
                  households to estimate. Income-based targeting is unreliable in exactly the
                  densest areas, which is why we anchor on the poverty-ratio counts, which are
                  published there.
                </dd>
              </div>
              <div>
                <dt>Typical conditions</dt>
                <dd>
                  The median tree canopy is {surface(metrics.canopyMedian) ?? "not measured"} and
                  the median impervious surface is{" "}
                  {surface(metrics.imperviousMedian) ?? "not measured"} across the{" "}
                  {formatNumber(metrics.blockGroups)} block groups (percent cover, flagged as in the
                  Overview tab) — useful context for where cooling capacity is likely to be low.
                </dd>
              </div>
            </dl>
          </article>
          <article className="recommendation-card">
            <p className="placeholder-flag">Data gap</p>
            <h3>What we cannot yet claim</h3>
            <dl>
              <div>
                <dt>No direct heat measurement</dt>
                <dd>
                  We do not have direct surface-temperature data. The “Heat severity” layer is a
                  relative 1–5 classification scale, not a temperature: the same class number
                  does not mean the same temperature in two cities, so it cannot rank
                  neighborhoods against each other. Until we obtain a temperature-based
                  product, we cannot validly say “this block group is hotter than that one,”
                  and our recommendations intentionally stop short of heat targeting.
                </dd>
              </div>
            </dl>
          </article>
          <article className="recommendation-card">
            <p className="placeholder-flag">Canopy–heat relationship</p>
            <h3>Tree canopy and heat severity</h3>
            <dl>
              <div>
                <dt>What the data shows</dt>
                <dd>
                  {correlationNote(rScore, nPairs, placeName)}
                  {" "}If the relationship is inverse, expanding canopy in high-heat areas is the most
                  direct lever our data supports.
                </dd>
              </div>
            </dl>
          </article>
        </div>
        <aside className="right-panel">
          <div className="ranking-card">
            <p className="placeholder-flag">Priority block groups</p>
            <h3>Highest composite heat vulnerability</h3>
            <p className="ranking-subtitle">
              Composite score: heat 40% · canopy 25% · impervious 20% · poverty 15%
            </p>
            {ranked.length === 0 ? (
              <p className="chart-caption">
                No block groups available to rank yet.
              </p>
            ) : (
              <ol className="ranking-list">
                {ranked.map((x, i) => {
                  const maxScore = ranked[0]?.score || 1;
                  const barPct = (x.score / maxScore) * 100;
                  const rankClass =
                    i === 0 ? "rank-top-1" : i === 1 ? "rank-top-2" : i === 2 ? "rank-top-3" : "";
                  return (
                    <li key={x.geoid} className={`ranking-item ${rankClass}`.trim()}>
                      <span className="rank-badge">{i + 1}</span>
                      <div className="rank-detail">
                        <div className="rank-header">
                          <span className="rank-name">{x.name}</span>
                          <span className="rank-score">{x.score.toFixed(1)}</span>
                        </div>
                        <div className="rank-bar-track">
                          <div className="rank-bar-fill" style={{ width: `${barPct}%` }} />
                        </div>
                        {x.povertyPercent != null && (
                          <span className="rank-poverty">
                            {formatPercent(x.povertyPercent)} below twice poverty
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className="chat-panel">
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
          </div>
        </aside>
      </div>
    </section>
  );
}
