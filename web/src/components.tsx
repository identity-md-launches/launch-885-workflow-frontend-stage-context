import { useState } from "react";
import { getAddress, type Address } from "viem";
import type { Runtime } from "./config";
import type { Transactions } from "./transactions";
export function AddressLink({
  address,
  r,
  label,
  compact = false,
}: {
  address: Address;
  r: Runtime;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState("");
  const full = getAddress(address);
  return (
    <span className={`address ${compact ? "compact" : ""}`}>
      <a
        href={`${r.deployment.network.explorer}/address/${full}`}
        target="_blank"
        rel="noreferrer"
        title={full}
        aria-label={`${label ?? "Address"} ${full} on explorer`}
      >
        {compact ? `${full.slice(0, 6)}…${full.slice(-4)}` : full}
        <span aria-hidden="true"> ↗</span>
      </a>
      <button
        className="copy"
        aria-label={`Copy ${label ?? "address"}`}
        title="Copy full address"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(full);
            setCopied("Copied");
          } catch {
            setCopied("Copy unavailable");
          }
          setTimeout(() => setCopied(""), 2500);
        }}
      >
        {copied || "Copy"}
      </button>
      <span className="sr-only" role="status">
        {copied}
      </span>
    </span>
  );
}
export function TxFeedback({
  id,
  tx,
  r,
}: {
  id: string;
  tx: Transactions;
  r: Runtime;
}) {
  const state = tx.states[id];
  return (
    <div
      className={`tx-feedback ${state?.phase === "error" ? "error-text" : ""}`}
      role="status"
      aria-live="polite"
    >
      {state && (
        <>
          <span>{state.message}</span>
          {state.hash && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`${r.deployment.network.explorer}/tx/${state.hash}`}
            >
              View transaction ↗
            </a>
          )}
          {state.phase === "unknown" && (
            <button className="secondary" onClick={() => void tx.recheck(id)}>
              Check pending transaction
            </button>
          )}
        </>
      )}
    </div>
  );
}
export function Orbit() {
  return (
    <svg className="orbit" viewBox="0 0 360 260" fill="none" aria-hidden="true">
      <g stroke="currentColor">
        <circle cx="180" cy="130" r="95" />
        <circle cx="180" cy="130" r="63" strokeDasharray="2 6" />
        <ellipse
          cx="180"
          cy="130"
          rx="151"
          ry="49"
          transform="rotate(-25 180 130)"
        />
        <ellipse
          cx="180"
          cy="130"
          rx="49"
          ry="116"
          transform="rotate(-25 180 130)"
        />
        <path d="M18 130h324M180 10v240" opacity=".4" />
      </g>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <g key={i}>
            <circle
              cx={180 + 95 * Math.cos(a)}
              cy={130 + 95 * Math.sin(a)}
              r="4"
              fill="currentColor"
            />
            <text
              x={180 + 115 * Math.cos(a)}
              y={134 + 115 * Math.sin(a)}
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              fontSize="10"
            >
              {i.toString(2).padStart(3, "0")}
            </text>
          </g>
        );
      })}
      <circle cx="180" cy="130" r="7" fill="currentColor" />
    </svg>
  );
}
