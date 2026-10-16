import type { BlockGroup, PovertyRecommendation } from "../types";
import { formatPercent, rankNeighborhoods } from "../helpers";

const CHATBOT_SRC = "https://interfaces.zapier.com/embed/chatbot/cmvab5ost009veqxawinfyi6q";

interface RecommendationsProps {
  poverty: PovertyRecommendation;
  placeName: string;
  visibleRows: BlockGroup[];
  metrics?: unknown;
}

const PRIMARY_RECS = [
  "Protecting existing tree canopies so cool areas will stay cool. Trees also absorb carbon, which helps with climate change.",
  "Planting where heat is worst, which is essential to mitigating long-term heat inequality.",
  "Shading sidewalks and bus stops, which are excessively hot and likely used by marginalized populations that rely on public transit.",
  "Expanding the Energy Assistance Program and improving the efficiency of cooling systems in rentals for more affordable cooling solutions.",
  "Creating cooling centers in the hottest areas, especially during summer months and during heat waves.",
];

export function Recommendations({ visibleRows }: RecommendationsProps) {
  const ranked = rankNeighborhoods(visibleRows, 10);

  return (
    <section id="recommendations" className="section">
      <div className="section-heading">
        <h2>Recommendations</h2>
        <p>Our primary recommendations are the following:</p>
        <ol className="primary-recs">
          {PRIMARY_RECS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
      <div className="recommendation-layout">
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
      </div>
    </section>
  );
}
