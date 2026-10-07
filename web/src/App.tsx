import { useEffect, useState, useRef, lazy, Suspense } from "react";
const ReactMarkdown = lazy(() => import("react-markdown"));
import { contract, fetchLocal, type Runtime } from "./config";
import { useWallet } from "./wallet";
import { useObservatory } from "./state";
import { useTransactions } from "./transactions";
import { observationReason, units } from "./domain";
import { AddressLink, TxFeedback } from "./components";
import { Swap } from "./Swap";
import { TokenTools } from "./TokenTools";
const Laboratory = lazy(() =>
  import("./Laboratory").then((m) => ({ default: m.Laboratory })),
);
const Library = lazy(() =>
  import("./Library").then((m) => ({ default: m.Library })),
);
const route = () =>
  ["research", "laboratory", "library"].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "observatory";
export default function App({ runtime: r }: { runtime: Runtime }) {
  const w = useWallet(r);
  const o = useObservatory(r, w);
  const tx = useTransactions(r, w, o);
  const [selected, setSelected] = useState<number>(),
    [clock, setClock] = useState(Date.now()),
    [model, setModel] = useState(""),
    [modelError, setModelError] = useState("");
  const [view, setView] = useState(route);
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    const hash = () => {
      if (location.hash !== "#main") setView(route());
    };
    window.addEventListener("hashchange", hash);
    return () => {
      clearInterval(id);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  useEffect(() => {
    document.title = `${view === "laboratory" ? "Model laboratory" : view === "library" ? "Learning library" : view === "research" ? "Model notes" : "Observatory"} · Quantum Observatory v2`;
    document.getElementById("main")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [view]);
  const previousEpoch = useRef<bigint | undefined>(undefined);
  useEffect(() => {
    setSelected(undefined);
  }, [w.account]);
  useEffect(() => {
    const epoch = o.snapshot?.epoch;
    if (epoch !== undefined) {
      if (
        previousEpoch.current !== undefined &&
        previousEpoch.current !== epoch
      )
        setSelected(undefined);
      previousEpoch.current = epoch;
    }
  }, [o.snapshot?.epoch]);
  const loadModel = () => {
    setModelError("");
    fetchLocal("model.md")
      .then((x) => x.text())
      .then(setModel)
      .catch(() =>
        setModelError(
          "Unable to load the model documentation. Retry when your connection is available.",
        ),
      );
  };
  useEffect(loadModel, []);
  const s = o.snapshot,
    connected = !!w.account,
    stale = !s || clock - s.at > 30000;
  const ready =
    connected &&
    w.correctChain &&
    o.verified &&
    !stale &&
    s?.account === w.account;
  const reason = !connected
    ? "Connect your wallet to contribute an observation."
    : !w.correctChain
      ? `Switch to ${r.deployment.network.name} to continue.`
      : !o.verified || stale
        ? "Waiting for a verified, fresh snapshot."
        : s
          ? observationReason(s)
          : "Loading your eligibility…";
  const remaining = s
    ? Math.max(
        0,
        Number(s.end - s.timestamp) - Math.floor((clock - s.at) / 1000),
      )
    : 0;
  const countdown = `${Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  const connectControl = (
    <button
      className="primary"
      disabled={w.busy}
      onClick={() => void w.connect()}
    >
      {w.busy ? "Connecting…" : "Connect wallet"}{" "}
      <span aria-hidden="true">↗</span>
    </button>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a
          href="#observatory"
          className="brand"
          aria-label="Quantum Observatory home"
        >
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="17" />
            <ellipse
              cx="20"
              cy="20"
              rx="8"
              ry="17"
              transform="rotate(40 20 20)"
            />
            <path d="M3 20h34" />
            <circle cx="20" cy="20" r="3" />
          </svg>
          <span>
            Quantum
            <br />
            <b>Observatory</b>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a
            href="#observatory"
            aria-current={view === "observatory" ? "page" : undefined}
          >
            Observatory
          </a>
          <a
            href="#research"
            aria-current={view === "research" ? "page" : undefined}
          >
            Model notes
          </a>
          <a
            href="#laboratory"
            aria-current={view === "laboratory" ? "page" : undefined}
          >
            Model lab
          </a>
          <a
            href="#library"
            aria-current={view === "library" ? "page" : undefined}
          >
            Learning library
          </a>
        </nav>
        <div className="wallet-control">
          <span className="network-name">
            <i />
            {r.deployment.network.name}
          </span>
          {connected ? (
            <>
              <AddressLink
                address={w.account!}
                r={r}
                label="Connected wallet"
                compact
              />
              <button
                className="text-button"
                disabled={!!tx.active}
                onClick={w.disconnect}
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              {w.options.length > 1 && (
                <select
                  aria-label="Choose a wallet"
                  value={w.selected}
                  onChange={(e) => w.setSelected(e.target.value)}
                >
                  {w.options.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              )}
              {connectControl}
            </>
          )}
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="wallet-message" role="status">
          {w.error}
        </div>
        {connected && !w.correctChain && (
          <div className="network-warning">
            <span>
              Wrong network. Connect to {r.deployment.network.name} for
              transactions.
            </span>
            <button
              className="primary"
              disabled={w.busy || !!tx.active}
              onClick={() => void w.switchChain()}
            >
              {w.busy ? "Switching…" : `Switch to ${r.deployment.network.name}`}
            </button>
          </div>
        )}
        <Suspense
          fallback={
            <p className="notice" role="status">
              Loading this view…
            </p>
          }
        >
          {view === "laboratory" ? (
            <Laboratory snapshot={o.verified && !stale ? s : undefined} />
          ) : view === "library" ? (
            <Library />
          ) : view === "research" ? (
            <section className="research">
              <div className="research-heading">
                <p className="eyebrow">The research notebook</p>
                <h1 tabIndex={-1}>
                  A model, with its
                  <br />
                  <em>assumptions in view.</em>
                </h1>
                <p>
                  The complete implementation research, bundled with this site.
                  Ten publications, one deterministic rule, and explicit limits.
                </p>
                <a href="#observatory">← Return to the observatory</a>
                <a href="./model.md" download>
                  Download model notes ↗
                </a>
              </div>
              {model ? (
                <article className="prose">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h2>{children}</h2>,
                      h2: ({ children }) => <h3>{children}</h3>,
                      h3: ({ children }) => <h4>{children}</h4>,
                      a: ({ children, ...props }) => (
                        <a {...props} target="_blank" rel="noreferrer">
                          {children} ↗
                        </a>
                      ),
                    }}
                  >
                    {model}
                  </ReactMarkdown>
                </article>
              ) : (
                <div role="status">
                  {modelError || "Loading model notes…"}
                  {modelError && (
                    <button onClick={loadModel}>Retry model notes</button>
                  )}
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="intro">
                <div className="intro-copy">
                  <p className="eyebrow">
                    <span className="tiny-star">✳</span> Quantum Observatory{" "}
                    <span className="version-label">v2.0</span>
                  </p>
                  <h1 tabIndex={-1}>
                    A universe of
                    <br />
                    <em>possibility.</em>
                    <br />
                    An experiment
                    <br />
                    we share.
                  </h1>
                  <p>
                    Eight states. One evolving system.
                    <br />
                    Explore a quantum-inspired experiment on Ethereum.
                    <br className="desktop-break" /> Observe the present. Shape
                    the next transition.
                  </p>
                  <div className="hero-actions">
                    <a className="primary link-button" href="#observe">
                      Explore the observatory <span aria-hidden="true">↘</span>
                    </a>
                    <a className="intro-link" href="#laboratory">
                      Enter the model lab <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                  <p className="hero-disclaimer">
                    Classical by design. Deterministic. Open to everyone.
                  </p>
                </div>
                <figure className="hero-art">
                  <img
                    src="./art/quantum-hero-1440.webp"
                    srcSet="./art/quantum-hero-720.webp 720w, ./art/quantum-hero-1440.webp 1440w"
                    sizes="(max-width: 580px) 100vw, 65vw"
                    width="1440"
                    height="960"
                    fetchPriority="high"
                    alt="Luminous mint filaments forming a toroidal interference field"
                  />
                  <div className="art-cross cross-top" aria-hidden="true">
                    +
                  </div>
                  <div className="art-cross cross-bottom" aria-hidden="true">
                    +
                  </div>
                  <figcaption>
                    <span>Fig. 01 — A field of possibilities</span>
                    <span>AI artwork · not live data</span>
                  </figcaption>
                </figure>
              </section>
              <div className="section-divider">
                <span>01 / The live observatory</span>
                <span>Ethereum mainnet · chain 1</span>
              </div>
              <div className="status-bar">
                <div>
                  <span
                    className={`status-dot ${o.verified && !stale ? "live" : ""}`}
                  />
                  <strong>
                    {o.verified && !stale
                      ? "Live on Ethereum"
                      : o.loading
                        ? "Connecting to Ethereum"
                        : "State unavailable"}
                  </strong>
                  {s && (
                    <span className="block-number">
                      Block {s.block.toLocaleString()}
                    </span>
                  )}
                </div>
                <div>
                  {s && (
                    <span>
                      Updated {Math.max(0, Math.floor((clock - s.at) / 1000))}s
                      ago
                    </span>
                  )}
                  <button
                    className="text-button"
                    disabled={o.loading}
                    onClick={() => void o.refresh()}
                  >
                    {o.loading ? "Refreshing…" : "Refresh state ↻"}
                  </button>
                </div>
              </div>
              {o.error && (
                <p className="notice error-text" role="alert">
                  {o.error} Use “Refresh state” to retry. Transactions are
                  disabled.
                </p>
              )}
              <section className="stats" aria-label="Current epoch summary">
                <div>
                  <span>Current epoch</span>
                  <strong>
                    {s ? String(s.epoch).padStart(3, "0") : "—"}
                    <small>/ current cycle</small>
                  </strong>
                </div>
                <div>
                  <span>
                    {s && s.timestamp >= s.end
                      ? "Awaiting advancement"
                      : "Time to next epoch"}
                  </span>
                  <strong>
                    {s ? countdown : "—"}
                    <small>{s ? " / 60 min window" : ""}</small>
                  </strong>
                </div>
                <div>
                  <span>Observations this epoch</span>
                  <strong>
                    {s ? s.count : "—"}
                    <small>
                      / {s ? s.max.toLocaleString() : "1,024"} maximum
                    </small>
                  </strong>
                </div>
              </section>
              <div className="workspace">
                <section
                  id="observe"
                  className="panel observation-panel"
                  aria-labelledby="observe-heading"
                >
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">01 / Observe</p>
                      <h2 id="observe-heading">Choose your observation.</h2>
                    </div>
                    <span className="tag">8 states</span>
                  </div>
                  <p className="muted">
                    Choose a state to contribute to the next transition.
                  </p>
                  <div className="chart-caption">
                    <span>Current probabilities</span>
                    <span>Classical deterministic model</span>
                  </div>
                  <fieldset className="states" disabled={!!tx.active}>
                    <legend className="sr-only">
                      Choose observation state
                    </legend>
                    {Array.from({ length: 8 }, (_, i) => {
                      const probability = s
                        ? (Number(s.probabilities[i]) * 100) / Number(s.scale)
                        : undefined;
                      return (
                        <label
                          key={i}
                          className={`state ${selected === i ? "selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="observation-state"
                            value={i}
                            checked={selected === i}
                            onChange={() => setSelected(i)}
                            aria-label={`State ${i}`}
                          />
                          <span className="state-top">
                            <span>{i.toString(2).padStart(3, "0")}</span>
                            <span className="radio-dot" />
                          </span>
                          <span className="bar-space" aria-hidden="true">
                            <span
                              className="probability-bar"
                              style={{
                                height:
                                  probability === undefined
                                    ? "0%"
                                    : `${probability}%`,
                              }}
                            />
                          </span>
                          <strong className="probability">
                            {probability === undefined
                              ? "—"
                              : `${probability.toFixed(4)}%`}
                          </strong>
                          <span className="state-name">State {i}</span>
                          <small>
                            {s
                              ? `${s.counts[i]} observations`
                              : "Awaiting data"}
                          </small>
                        </label>
                      );
                    })}
                  </fieldset>
                  <div className="observation-note">
                    <span aria-hidden="true">ⓘ</span>
                    <p>
                      One observation per wallet, per epoch. Hold at least 1
                      QOBS.
                      <br />
                      Your tokens stay in your wallet. Only the network fee is
                      paid.
                    </p>
                  </div>
                  <div className="observe-action">
                    <div>
                      <strong>
                        {selected === undefined
                          ? "Choose a state above"
                          : `Selected: State ${selected} · ${selected.toString(2).padStart(3, "0")}`}
                      </strong>
                      <p className="muted" id="observe-reason">
                        {reason ||
                          (selected === undefined
                            ? "All eight states are open for observation."
                            : "Ready to submit your choice for this epoch.")}
                      </p>
                    </div>
                    {!connected ? (
                      connectControl
                    ) : (
                      <button
                        className="primary"
                        aria-describedby="observe-reason"
                        disabled={
                          !ready ||
                          !!reason ||
                          selected === undefined ||
                          !!tx.active
                        }
                        onClick={() =>
                          void tx.run("observe", () => ({
                            ...contract(r, "QuantumEngine"),
                            functionName: "observe",
                            args: [selected],
                          }))
                        }
                      >
                        {tx.active === "observe"
                          ? "Submitting observation…"
                          : "Submit observation"}{" "}
                        <span aria-hidden="true">↗</span>
                      </button>
                    )}
                  </div>
                  <TxFeedback id="observe" tx={tx} r={r} />
                  <div className="epoch-action">
                    <div>
                      <h3>Keep the experiment moving.</h3>
                      <p>
                        When an epoch ends, anyone can advance it. This applies
                        one transition and starts a fresh hour.
                      </p>
                      {s && (
                        <small>
                          Epoch ends{" "}
                          {new Date(Number(s.end) * 1000).toLocaleString()} ·
                          local time
                        </small>
                      )}
                    </div>
                    <button
                      className="secondary"
                      disabled={
                        !ready || !s || s.timestamp < s.end || !!tx.active
                      }
                      onClick={() =>
                        void tx.run("advance", () => ({
                          ...contract(r, "QuantumEngine"),
                          functionName: "advanceEpoch",
                        }))
                      }
                    >
                      {tx.active === "advance"
                        ? "Advancing epoch…"
                        : "Advance epoch"}
                    </button>
                  </div>
                  <TxFeedback id="advance" tx={tx} r={r} />
                </section>
                <Swap r={r} w={w} o={o} tx={tx} ready={ready} />
              </div>
              <section className="discovery-strip">
                <img
                  src="./art/interference-field-480.webp"
                  width="480"
                  height="320"
                  loading="lazy"
                  decoding="async"
                  alt=""
                />
                <div>
                  <p className="eyebrow">Beyond the live state</p>
                  <h2>A little curiosity goes a long way.</h2>
                  <p>
                    Change the rules in your browser. Trace the ideas back to
                    their sources.
                  </p>
                </div>
                <div className="discovery-links">
                  <a href="#laboratory">Experiment in the model lab ↗</a>
                  <a href="#library">Explore the learning library ↗</a>
                </div>
              </section>
              <section className="about-strip">
                <div>
                  <span className="small-index">01</span>
                  <h3>Inspired by quantum theory.</h3>
                  <p>
                    Signed amplitudes, interference and a uniform mixing step
                    shape the model.
                  </p>
                </div>
                <div>
                  <span className="small-index">02</span>
                  <h3>Entirely classical.</h3>
                  <p>
                    Integer arithmetic. No quantum hardware, randomness,
                    predictions or rewards.
                  </p>
                </div>
                <div>
                  <span className="small-index">03</span>
                  <h3>Open, from first principles.</h3>
                  <p>
                    No owner powers. No custody. Read the equations, sources and
                    known limits.
                  </p>
                  <a href="#research">Read the research notes ↗</a>
                </div>
              </section>
              <section className="deployment panel" id="deployment">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">03 / Verify</p>
                    <h2>On chain. In the open.</h2>
                  </div>
                  <span className="tag">
                    {o.verified ? "ABI & code checked" : "ABI hashes checked"}
                  </span>
                </div>
                <p className="muted">
                  The deployed contracts behind the observatory. Check their
                  source and activity in the explorer.
                </p>
                <div className="contract-list">
                  {r.deployment.contracts.map((c) => (
                    <div key={c.name}>
                      <span>
                        <strong>
                          {c.name === "LaunchToken"
                            ? "QOBS token"
                            : "Quantum engine"}
                        </strong>
                        <small>
                          {c.name === "LaunchToken"
                            ? s
                              ? `${units(s.supply, s.decimals, 0)} ${s.symbol} · fixed supply`
                              : "Fixed supply · ERC-20"
                            : "Ownerless · Noncustodial"}
                        </small>
                      </span>
                      <AddressLink address={c.address} r={r} label={c.name} />
                    </div>
                  ))}
                </div>
                <div className="deployment-meta">
                  <a
                    href={`${r.deployment.network.explorer}/address/${contract(r, "QuantumEngine").address}#code`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Verified engine source ↗
                  </a>
                  <a
                    href={`https://github.com/identity-md-launches/launch-884-workflow-contract-stage-context/tree/${r.deployment.sourceCommit}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pinned source{" "}
                    <code>{r.deployment.sourceCommit.slice(0, 12)}</code> ↗
                  </a>
                  <span>
                    Pool fee {(r.deployment.poolKey.fee / 10000).toFixed(2)}% ·
                    Tick spacing {r.deployment.poolKey.tickSpacing}
                  </span>
                  <a
                    href="./imd-deployment.json"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Deployment manifest ↗
                  </a>
                </div>
                {connected && s && (
                  <div className="wallet-balances">
                    Wallet balance:{" "}
                    <b>
                      {units(s.balance, s.decimals)} {s.symbol}
                    </b>{" "}
                    ·{" "}
                    {units(
                      s.nativeBalance,
                      r.deployment.network.nativeCurrency.decimals,
                    )}{" "}
                    ETH <span>USD prices unavailable</span>
                  </div>
                )}
              </section>
              <TokenTools r={r} w={w} o={o} tx={tx} ready={ready} />
            </>
          )}
        </Suspense>
      </main>
      <footer>
        <span className="footer-brand">
          QOBS <span>/ Quantum Observatory</span>
        </span>
        <p>Version 2 · An open, classical experiment.</p>
        <a href="#research">Research & limitations ↗</a>
      </footer>
    </>
  );
}
