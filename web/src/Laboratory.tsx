import { useMemo, useState } from "react";
import { BASELINE, experiment, UNIFORM } from "./model";
import type { Snapshot } from "./state";

export function Laboratory({ snapshot }: { snapshot?: Snapshot }) {
  const [noise, setNoise] = useState(25),
    [feedback, setFeedback] = useState(25);
  const [steps, setSteps] = useState(1),
    [pattern, setPattern] = useState("none");
  const [input, setInput] = useState({
    probabilities: UNIFORM,
    counts: Array<number>(8).fill(0),
    provenance: "Initial uniform vector (documentation)",
    kind: "uniform",
  });
  const [notice, setNotice] = useState("");
  const counts = useMemo(
    () =>
      pattern === "imported"
        ? input.counts
        : Array.from({ length: 8 }, (_, i) =>
            pattern === "balanced"
              ? 16
              : pattern === "state7" && i === 7
                ? 128
                : 0,
          ),
    [pattern, input],
  );
  const result = useMemo(
    () => experiment(input.probabilities, counts, noise, feedback, steps),
    [input, counts, noise, feedback, steps],
  );
  function reset() {
    setNoise(25);
    setFeedback(25);
    setSteps(1);
    setPattern("none");
    setInput({
      probabilities: UNIFORM,
      counts: Array<number>(8).fill(0),
      provenance: "Initial uniform vector (documentation)",
      kind: "uniform",
    });
    setNotice(
      "Reset to the documented initial vector and fixed baseline parameters.",
    );
  }
  function copyLive() {
    if (!snapshot || Date.now() - snapshot.at > 30000) {
      setNotice(
        "Live state is unavailable or stale. Refresh it in the Observatory, then try again.",
      );
      return;
    }
    setInput({
      probabilities: [...snapshot.probabilities],
      counts: [...snapshot.counts],
      provenance: `Ethereum block ${snapshot.block}, epoch ${snapshot.epoch}; copied ${new Date(snapshot.at).toISOString()}`,
      kind: "imported",
    });
    setPattern("imported");
    setNotice(
      "Copied a frozen input. All results below are browser calculations.",
    );
  }
  function download() {
    const data = {
      schemaVersion: 1,
      modelVersion: "qobs-browser-v2",
      mode: "browser-experiment",
      createdAt: new Date().toISOString(),
      input,
      counts,
      parameters: { noise, feedback, steps },
      baselineParameters: BASELINE,
      repeatedHistogram: true,
      ...result,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2) + "\n"], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "qobs-experiment.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Experiment exported with its inputs, parameters and provenance.",
    );
  }
  return (
    <section className="laboratory page-view">
      <div className="page-heading">
        <p className="eyebrow">Explore / Model laboratory</p>
        <h1>
          Change a parameter.
          <br />
          <em>Follow the possibilities.</em>
        </h1>
        <p>
          A small laboratory for a big idea. Explore how interference, mixing
          and collective choices shape eight probabilities.
        </p>
      </div>
      <div className="mode-banner">
        <span className="tag">Browser experiment</span>
        <p>
          Runs locally. No wallet, gas or changes to Ethereum. The live engine’s
          rules are immutable.
        </p>
      </div>
      <div className="lab-grid">
        <section
          className="panel lab-controls"
          aria-labelledby="parameters-heading"
        >
          <p className="eyebrow">01 / Configure</p>
          <h2 id="parameters-heading">Make it your experiment.</h2>
          <label htmlFor="starting-vector">Starting probabilities</label>
          <select
            id="starting-vector"
            value={input.kind}
            onChange={(e) => {
              const kind = e.target.value;
              setInput({
                probabilities:
                  kind === "uniform" ? UNIFORM : [1000000, 0, 0, 0, 0, 0, 0, 0],
                counts: Array<number>(8).fill(0),
                provenance:
                  kind === "uniform"
                    ? "Initial uniform vector (documentation)"
                    : "Synthetic state 0 basis vector",
                kind,
              });
              setPattern("none");
            }}
          >
            <option value="uniform">Uniform · 12.5% in each state</option>
            <option value="basis">Concentrated · 100% in state 0</option>
            {input.kind === "imported" && (
              <option value="imported">Copied Ethereum snapshot</option>
            )}
          </select>
          <button className="secondary full" onClick={copyLive}>
            Copy live state as input ↗
          </button>
          <p className="input-provenance">{input.provenance}</p>
          <label htmlFor="noise">
            Uniform mixing <output>{noise}%</output>
          </label>
          <input
            id="noise"
            type="range"
            min="0"
            max="100"
            value={noise}
            onChange={(e) => setNoise(Number(e.target.value))}
          />
          <p className="control-hint">
            On-chain rule: 25%. More mixing flattens the distribution.
          </p>
          <label htmlFor="feedback">
            Observation feedback <output>{feedback}%</output>
          </label>
          <input
            id="feedback"
            type="range"
            min="0"
            max="100"
            value={feedback}
            onChange={(e) => setFeedback(Number(e.target.value))}
          />
          <p className="control-hint">On-chain rule: 25% in nonempty epochs.</p>
          <label htmlFor="histogram">Observation histogram</label>
          <select
            id="histogram"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            <option value="none">Empty · no observations</option>
            <option value="state7">Unanimous · 128 for state 7</option>
            <option value="balanced">Balanced · 16 in each state</option>
            {input.kind === "imported" && (
              <option value="imported">Copied on-chain counts</option>
            )}
          </select>
          <label htmlFor="steps">
            Simulated transitions <output>{steps}</output>
          </label>
          <input
            id="steps"
            type="range"
            min="1"
            max="12"
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
          />
          <p className="control-hint">
            The same histogram is reused at every step. No time elapses on
            chain.
          </p>
          <div className="button-row">
            <button
              onClick={() => {
                setNoise(10);
                setFeedback(50);
                setPattern("state7");
                setNotice("Loaded a low-mixing, strong-feedback experiment.");
              }}
            >
              Try stronger feedback
            </button>
            <button className="text-button" onClick={reset}>
              Reset experiment
            </button>
          </div>
        </section>
        <section
          className="panel lab-results"
          aria-labelledby="results-heading"
        >
          <div className="section-title">
            <div>
              <p className="eyebrow">02 / Compare</p>
              <h2 id="results-heading">Same input. Different rules.</h2>
            </div>
            <span className="tag">Local calculation</span>
          </div>
          <p className="muted">
            The fixed on-chain baseline is reproduced in your browser with exact
            integer rounding. Neither column is live Ethereum state.
          </p>
          <div className="chart-legend">
            <span>
              <i className="legend-baseline" />
              Fixed baseline · 25% / 25%
            </span>
            <span>
              <i className="legend-experiment" />
              Experiment · {noise}% / {feedback}%
            </span>
          </div>
          <div className="comparison-chart" aria-hidden="true">
            {result.baseline.map((b, i) => (
              <div className="comparison-column" key={i}>
                <div className="comparison-bars">
                  <span
                    className="baseline-bar"
                    style={{ transform: `scaleY(${b / 1000000})` }}
                  />
                  <span
                    className="experiment-bar"
                    style={{
                      transform: `scaleY(${result.candidate[i] / 1000000})`,
                    }}
                  />
                </div>
                <span>{i.toString(2).padStart(3, "0")}</span>
              </div>
            ))}
          </div>
          <p className="chart-scale">
            Shared vertical scale: 0–100% probability
          </p>
          <div className="distance">
            <span>
              Total variation distance
              <small>0% = identical distributions; 100% = disjoint.</small>
            </span>
            <strong data-testid="distance">
              {(result.distance * 100).toFixed(4)}%
            </strong>
          </div>
          <table className="result-table">
            <caption>
              Probabilities after {steps} simulated{" "}
              {steps === 1 ? "transition" : "transitions"}
            </caption>
            <thead>
              <tr>
                <th scope="col">State</th>
                <th scope="col">Baseline</th>
                <th scope="col">Experiment</th>
                <th scope="col">Δ pp</th>
              </tr>
            </thead>
            <tbody>
              {result.baseline.map((b, i) => (
                <tr key={i}>
                  <th scope="row">{i}</th>
                  <td>{(b / 10000).toFixed(4)}%</td>
                  <td>{(result.candidate[i] / 10000).toFixed(4)}%</td>
                  <td>{((result.candidate[i] - b) / 10000).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="secondary full" onClick={download}>
            Export experiment JSON ↓
          </button>
          <p className="lab-status" role="status">
            {notice}
          </p>
        </section>
      </div>
      <div className="lab-explainer">
        <figure>
          <img
            src="./art/interference-field-960.webp"
            srcSet="./art/interference-field-480.webp 480w, ./art/interference-field-960.webp 960w"
            sizes="(max-width: 850px) 100vw, 45vw"
            width="960"
            height="640"
            loading="lazy"
            decoding="async"
            alt="Artistic illustration of two overlapping wave fields"
          />
          <figcaption>
            AI-generated interference artwork · an analogy, not model output
          </figcaption>
        </figure>
        <div>
          <p className="eyebrow">What this model can tell you</p>
          <h2>
            Interference, without
            <br />
            the mystery.
          </h2>
          <p>
            Signed amplitudes can reinforce or cancel before they are squared.
            Uniform mixing then softens the result; observations add a classical
            feedback signal.
          </p>
          <p className="muted">
            This deterministic toy model discards complex phases and
            entanglement. The parameters are design choices, not fitted physical
            constants. A browser experiment cannot update the immutable engine
            or predict prices.
          </p>
          <a href="#research">Read the full equations & limitations ↗</a>
        </div>
      </div>
    </section>
  );
}
