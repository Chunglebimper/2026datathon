const SLOTS = [
  "Where heat severity is high relative to the same city",
  "Where tree canopy is limited",
  "Where cooling costs may be harder to afford",
];

const CHATBOT_SRC = "https://interfaces.zapier.com/embed/chatbot/cmvab5ost009veqxawinfyi6q";

export function Recommendations() {
  return (
    <section id="recommendations" className="section">
      <div className="section-heading">
        <h2>Recommendations</h2>
        <p>
          These slots show the fields a recommendation will use. They are not findings.
          No intervention, partner, or statistic is filled in until the block-group
          analysis has been checked.
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
