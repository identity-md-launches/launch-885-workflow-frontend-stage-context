import { useEffect, useState } from "react";
import { fetchLocal } from "./config";
export type ResearchSnapshot = {
  schemaVersion: 1;
  id: string;
  version: string;
  title: string;
  createdAt: string;
  mode: "static";
  source: string;
  retrievalDate: string;
  evidenceLevel: string;
  changes: string[];
  modelEvaluation: { status: string; evidence: string; limitations: string[] };
  provenance: {
    repository: string;
    sourceCommit: string;
    documentPath: string;
    documentSha256: string;
    method: string;
    review: string;
  };
  sources: {
    id: string;
    title: string;
    authors: string;
    url: string;
    retrievalDate: string;
    retrievalBasis: string;
    evidenceLevel: string;
    topic: string;
    notes: string;
  }[];
};
export function Library() {
  const [snapshot, setSnapshot] = useState<ResearchSnapshot>(),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [topic, setTopic] = useState("All sources");
  function load() {
    setError("");
    fetchLocal("research/initial.json")
      .then((r) => r.json())
      .then((s: ResearchSnapshot) => {
        if (
          s.schemaVersion !== 1 ||
          s.mode !== "static" ||
          !Array.isArray(s.sources) ||
          !s.provenance ||
          !s.modelEvaluation
        )
          throw Error("Unsupported snapshot");
        setSnapshot(s);
      })
      .catch(() =>
        setError(
          "Unable to load the bundled snapshot. Check your connection and retry.",
        ),
      );
  }
  useEffect(load, []);
  const sources =
    snapshot?.sources.filter(
      (s) =>
        (topic === "All sources" || s.topic === topic) &&
        `${s.title} ${s.authors} ${s.notes}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  return (
    <section className="library page-view">
      <div className="page-heading">
        <p className="eyebrow">Learn / Research library</p>
        <h1>
          Ideas worth
          <br />
          <em>looking closer at.</em>
        </h1>
        <p>
          Explore the scientific ideas behind the model, with their assumptions,
          provenance and limits in view.
        </p>
      </div>
      <div className="mode-banner">
        <span className="tag">Static initial snapshot</span>
        <p>
          No live research endpoint is configured. This is an archive of
          existing project documentation, not an ongoing research feed.
        </p>
      </div>
      {!snapshot ? (
        <div className="panel" role="status">
          {error || "Loading the bundled research snapshot…"}
          {error && <button onClick={load}>Retry snapshot</button>}
        </div>
      ) : (
        <>
          <section className="snapshot-summary panel">
            <div>
              <p className="eyebrow">Research snapshot / v{snapshot.version}</p>
              <h2>{snapshot.title}</h2>
              <p>10 existing sources · compiled {snapshot.createdAt}</p>
              <p className="muted">
                Evidence: theoretical background and project interpretation.
                These papers motivate analogies; none validates this engine or
                its constants.
              </p>
            </div>
            <a
              className="secondary link-button"
              href="./research/initial.json"
              download
            >
              Download snapshot ↓
            </a>
          </section>
          <div className="library-toolbar">
            <div>
              <label htmlFor="source-search">Search the library</label>
              <input
                id="source-search"
                type="search"
                value={query}
                placeholder="Try interference or an author…"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="source-topic">Topic</label>
              <select
                id="source-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {[
                  "All sources",
                  "Interference",
                  "Probability",
                  "Decoherence",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <p role="status">
              {sources.length} of {snapshot.sources.length} sources
            </p>
          </div>
          <div className="source-grid">
            {sources.map((s) => (
              <article className="source-card" key={s.id}>
                <div className="source-meta">
                  <span>{s.topic}</span>
                  <span>
                    {s.id.replace("source-", "").padStart(2, "0")} / 10
                  </span>
                </div>
                <h2>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </h2>
                <p className="source-authors">{s.authors}</p>
                <details>
                  <summary>Read relevance & limitations</summary>
                  <p>{s.notes}</p>
                </details>
                <div className="source-footnote">
                  <span>Theoretical background</span>
                  <span>Retrieved {s.retrievalDate}*</span>
                </div>
              </article>
            ))}
          </div>
          {sources.length === 0 && (
            <div className="panel empty-state">
              <h2>No sources match “{query}”.</h2>
              <p>
                Try another term or clear the filters to explore all ten
                sources.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setTopic("All sources");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <p className="muted retrieval-note">
            * Retrieval dates are reported by the original model documentation.
            Primary papers were not re-retrieved for this website upgrade.
          </p>
          <section className="provenance panel">
            <p className="eyebrow">A record you can inspect</p>
            <h2>Where this snapshot comes from.</h2>
            <dl>
              <div>
                <dt>Source</dt>
                <dd>
                  <a href="./model.md">Bundled model notes</a> ·{" "}
                  {snapshot.source}
                </dd>
              </div>
              <div>
                <dt>Snapshot</dt>
                <dd>{snapshot.id}</dd>
              </div>
              <div>
                <dt>Evidence level</dt>
                <dd>{snapshot.evidenceLevel}</dd>
              </div>
              <div>
                <dt>Source commit</dt>
                <dd>
                  <a
                    href={`${snapshot.provenance.repository}/tree/${snapshot.provenance.sourceCommit}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {snapshot.provenance.sourceCommit} ↗
                  </a>
                </dd>
              </div>
              <div>
                <dt>Document SHA-256</dt>
                <dd>
                  <code>{snapshot.provenance.documentSha256}</code>
                </dd>
              </div>
            </dl>
            <p>{snapshot.provenance.method}</p>
            <details>
              <summary>Changes, model evaluation & limitations</summary>
              <h3>Changes in this snapshot</h3>
              <ul>
                {snapshot.changes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h3>Model evaluation</h3>
              <p>{snapshot.modelEvaluation.evidence}</p>
              <ul>
                {snapshot.modelEvaluation.limitations.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </details>
            <div className="button-row">
              <a href="#research">Read the complete model notes ↗</a>
              <a href="./research/snapshot.schema.json" download>
                Download snapshot schema ↓
              </a>
            </div>
          </section>
          <section className="future-note">
            <div>
              <p className="eyebrow">Designed for traceable updates</p>
              <h2>A library with a memory.</h2>
              <p>
                Future snapshots can record new sources, retrieval dates,
                evidence levels, changes and model evaluations. Each version
                must preserve its provenance. A separate collector would need to
                be hosted and reviewed before any live feed is enabled.
              </p>
              <a href="./research/collector.md">
                Read the future collector design ↗
              </a>
            </div>
            <div>
              <p className="eyebrow">Participation & funding</p>
              <h2>Curiosity is the incentive today.</h2>
              <p>
                The immutable engine has no payouts. Any future participant
                rewards would require a separate, funded program using realised
                project revenue. There are no active rewards or automatic
                profit.
              </p>
              <a href="./research/rewards.md">
                Read the revenue funding proposal ↗
              </a>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
