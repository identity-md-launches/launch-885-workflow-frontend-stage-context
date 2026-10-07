import { useEffect, useRef, useState } from "react";
import { zeroAddress, type Address } from "viem";
import { contract, type Runtime } from "./config";
import {
  approvalStep,
  erc20Abi,
  minimumOutput,
  pairedCurrency,
  permitAbi,
  quoterAbi,
  routerAbi,
  swapPayload,
} from "./protocol";
import { errorText, parseAmount, units } from "./domain";
import type { Wallet } from "./wallet";
import type { Observatory } from "./state";
import type { Transactions } from "./transactions";
import { TxFeedback } from "./components";
type Quote = {
  amount: bigint;
  out: bigint;
  min: bigint;
  gas: bigint;
  at: number;
  key: string;
  allowance: bigint;
  permit: bigint;
  expiration: number;
};
export function Swap({
  r,
  w,
  o,
  tx,
  ready,
}: {
  r: Runtime;
  w: Wallet;
  o: Observatory;
  tx: Transactions;
  ready: boolean;
}) {
  const [buy, setBuy] = useState(true),
    [amount, setAmount] = useState(""),
    [slippage, setSlippage] = useState("0.5"),
    [quote, setQuote] = useState<Quote>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now());
  const serial = useRef(0);
  const s = o.snapshot;
  const token = contract(r, "LaunchToken");
  const pair = pairedCurrency(r);
  const input: Address = buy ? pair : token.address;
  const inputSymbol = buy
    ? (s?.pairSymbol ?? r.deployment.network.nativeCurrency.symbol)
    : (s?.symbol ?? "QOBS");
  const outputSymbol = buy
    ? (s?.symbol ?? "QOBS")
    : (s?.pairSymbol ?? r.deployment.network.nativeCurrency.symbol);
  const inputDecimals = buy ? (s?.pairDecimals ?? 18) : (s?.decimals ?? 18),
    outputDecimals = buy ? (s?.decimals ?? 18) : (s?.pairDecimals ?? 18);
  const balance = w.account ? (buy ? s?.pairBalance : s?.balance) : undefined;
  const key = [buy, amount, slippage, w.account, w.chainId].join(":");
  useEffect(() => {
    serial.current++;
    setQuote(undefined);
    setError("");
    setBusy(false);
  }, [key]);
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const valid = quote?.key === key && clock - quote.at < 30000;
  const step = quote
    ? approvalStep(
        input,
        quote.amount,
        quote.allowance,
        quote.permit,
        quote.expiration,
        Math.floor(clock / 1000),
      )
    : "swap";
  async function allowances(amountIn: bigint) {
    if (input === zeroAddress)
      return { allowance: amountIn, permit: amountIn, expiration: 0 };
    const addresses = r.deployment.network.uniswapV4;
    const [allowance, permit] = await Promise.all([
      o.client.readContract({
        address: input,
        abi:
          input.toLowerCase() === token.address.toLowerCase()
            ? token.abi
            : erc20Abi,
        functionName: "allowance",
        args: [w.account!, addresses.permit2],
      }) as Promise<bigint>,
      o.client.readContract({
        address: addresses.permit2,
        abi: permitAbi,
        functionName: "allowance",
        args: [w.account!, input, addresses.universalRouter],
      }),
    ]);
    return { allowance, permit: permit[0], expiration: permit[1] };
  }
  const getQuote = async () => {
    if (busy || !ready || !o.pool) return;
    const nonce = ++serial.current;
    setBusy(true);
    setError("");
    setQuote(undefined);
    try {
      const amountIn = parseAmount(amount, inputDecimals);
      let bps: number;
      try {
        bps = Number(parseAmount(slippage, 2, true));
      } catch {
        throw Error(
          "Enter slippage as a decimal percentage with up to two decimal places.",
        );
      }
      minimumOutput(10000n, bps);
      if (amountIn > 2n ** 128n - 1n)
        throw Error("Amount exceeds the pool’s supported range.");
      if (balance === undefined || amountIn > balance)
        throw Error(
          `Not enough ${inputSymbol}. Reduce the amount or add funds.`,
        );
      const { result } = await o.client.simulateContract({
        address: r.deployment.network.uniswapV4.quoter,
        abi: quoterAbi,
        functionName: "quoteExactInputSingle",
        args: [
          {
            poolKey: r.deployment.poolKey,
            zeroForOne:
              input.toLowerCase() ===
              r.deployment.poolKey.currency0.toLowerCase(),
            exactAmount: amountIn,
            hookData: "0x",
          },
        ],
        account: w.account,
      });
      const min = minimumOutput(result[0], bps);
      if (min === 0n)
        throw Error(
          "The quote returns too little output. Try a different amount.",
        );
      const a = await allowances(amountIn);
      if (nonce === serial.current)
        setQuote({
          amount: amountIn,
          out: result[0],
          min,
          gas: result[1],
          at: Date.now(),
          key,
          ...a,
        });
    } catch (e) {
      if (nonce === serial.current) {
        const message = errorText(e);
        setError(message);
        document
          .getElementById(
            message.includes("slippage") ? "slippage" : "swap-amount",
          )
          ?.focus();
      }
    } finally {
      if (nonce === serial.current) setBusy(false);
    }
  };
  const execute = async () => {
    if (!quote || !valid || !ready) return;
    const current = quote;
    const action =
      step === "token"
        ? "approve-token"
        : step === "permit"
          ? "approve-router"
          : "swap";
    const result = await tx.run(action, async () => {
      if (Date.now() - current.at >= 30000 || current.key !== key)
        throw Error("Quote expired. Get a new quote before continuing.");
      const fresh = await allowances(current.amount);
      const next = approvalStep(
        input,
        current.amount,
        fresh.allowance,
        fresh.permit,
        fresh.expiration,
        Math.floor(Date.now() / 1000),
      );
      const addresses = r.deployment.network.uniswapV4;
      if (next !== step)
        throw Error("Allowances changed. Get a new quote to update the steps.");
      if (next === "token")
        return {
          address: input,
          abi:
            input.toLowerCase() === token.address.toLowerCase()
              ? token.abi
              : erc20Abi,
          functionName: "approve",
          args: [addresses.permit2, current.amount],
        };
      if (next === "permit")
        return {
          address: addresses.permit2,
          abi: permitAbi,
          functionName: "approve",
          args: [
            input,
            addresses.universalRouter,
            current.amount,
            Math.floor(Date.now() / 1000) + 1800,
          ],
        };
      const p = swapPayload(
        r.deployment.poolKey,
        input,
        current.amount,
        current.min,
        BigInt(Math.floor(Date.now() / 1000) + 300),
        addresses.extendedSwapParams,
      );
      return {
        address: addresses.universalRouter,
        abi: routerAbi,
        functionName: "execute",
        ...p,
      };
    });
    if (result) {
      setQuote(undefined);
      if (action === "swap") void o.refreshPool();
    }
  };
  const working = ["approve-token", "approve-router", "swap"].includes(
    tx.active,
  );
  return (
    <section
      id="swap"
      className="panel swap-panel"
      aria-labelledby="swap-heading"
    >
      <div className="section-title">
        <div>
          <p className="eyebrow">02 / Exchange</p>
          <h2 id="swap-heading">Get QOBS</h2>
        </div>
        <span className="tag">Uniswap v4</span>
      </div>
      <p className="muted">
        Trade in the attested {s?.pairSymbol ?? "ETH"}/QOBS pool.
      </p>
      <div className="segmented" aria-label="Swap direction">
        <button
          aria-pressed={buy}
          disabled={!!tx.active}
          onClick={() => setBuy(true)}
        >
          Buy QOBS
        </button>
        <button
          aria-pressed={!buy}
          disabled={!!tx.active}
          onClick={() => setBuy(false)}
        >
          Sell QOBS
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void getQuote();
        }}
      >
        <div className="amount-field">
          <label htmlFor="swap-amount">
            You pay <span>{inputSymbol}</span>
          </label>
          <input
            id="swap-amount"
            name="swap-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!!tx.active}
            aria-describedby="swap-balance swap-error"
            aria-invalid={!!error}
          />
          <small id="swap-balance">
            Balance:{" "}
            {balance === undefined ? "—" : units(balance, inputDecimals)}{" "}
            {inputSymbol}
          </small>
        </div>
        <div className="quote-output">
          <span>
            You receive <b>{outputSymbol}</b>
          </span>
          <strong>
            {valid && quote ? units(quote.out, outputDecimals) : "—"}
          </strong>
          <small>
            {valid
              ? "Estimated output"
              : "Request a fresh quote for an estimate"}
          </small>
        </div>
        <div className="slippage">
          <label htmlFor="slippage">Slippage tolerance</label>
          <span>
            <input
              id="slippage"
              name="slippage"
              inputMode="decimal"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              disabled={!!tx.active}
              aria-describedby="slippage-help"
            />{" "}
            %
          </span>
        </div>
        <small id="slippage-help">
          Choose 0.1–5%. Quotes expire after 30 seconds.
        </small>
        {quote && valid && (
          <dl className="quote-details">
            <div>
              <dt>Minimum received</dt>
              <dd>
                {units(quote.min, outputDecimals)} {outputSymbol}
              </dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>
                1 {inputSymbol} ≈{" "}
                {units(
                  (quote.out * 10n ** BigInt(inputDecimals)) / quote.amount,
                  outputDecimals,
                )}{" "}
                {outputSymbol}
              </dd>
            </div>
            <div>
              <dt>Pool fee</dt>
              <dd>{(r.deployment.poolKey.fee / 10000).toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Quote expires in</dt>
              <dd>
                {Math.max(0, Math.ceil((30000 - (clock - quote.at)) / 1000))}s
              </dd>
            </div>
          </dl>
        )}
        <p className="error-text" id="swap-error" role="alert">
          {error}
        </p>
        {!o.pool && (
          <p className="notice">
            {o.poolError || "Checking pool availability…"}
            {o.poolError && (
              <button
                type="button"
                className="text-button"
                onClick={() => void o.refreshPool()}
              >
                Retry pool check
              </button>
            )}
          </p>
        )}
        {quote && !valid && (
          <p className="notice">Quote expired. Refresh it before continuing.</p>
        )}
        {valid && quote ? (
          <>
            <p className="action-description">
              {step === "token"
                ? `Step 1: Allow Permit2 to spend exactly ${units(quote.amount, inputDecimals)} ${inputSymbol}.`
                : step === "permit"
                  ? `Step 2: Allow the Universal Router to spend exactly ${units(quote.amount, inputDecimals)} ${inputSymbol} through Permit2 for 30 minutes.`
                  : `Swap ${units(quote.amount, inputDecimals)} ${inputSymbol} for at least ${units(quote.min, outputDecimals)} ${outputSymbol}. Deadline: 5 minutes. Network fees are paid in ETH.`}
            </p>
            <button
              type="button"
              className="secondary full"
              disabled={!ready || !!tx.active}
              onClick={() => void execute()}
            >
              {working
                ? "Processing…"
                : step === "token"
                  ? `Approve ${inputSymbol} to Permit2`
                  : step === "permit"
                    ? "Approve router in Permit2"
                    : "Confirm swap"}
            </button>
          </>
        ) : (
          <button
            className="secondary full"
            type="submit"
            disabled={!ready || !o.pool || busy || !!tx.active}
          >
            {busy ? "Getting quote…" : "Get quote"}
          </button>
        )}
      </form>
      <TxFeedback id="approve-token" tx={tx} r={r} />
      <TxFeedback id="approve-router" tx={tx} r={r} />
      <TxFeedback id="swap" tx={tx} r={r} />
      <p className="fine-print">
        {input === zeroAddress ? "ETH swaps need no token approval. " : ""}
        Approval confirmations require a fresh quote. Keep ETH available for
        gas. USD prices are unavailable.
      </p>
    </section>
  );
}
