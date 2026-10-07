import { useEffect, useState } from "react";
import { getAddress, isAddress, zeroAddress } from "viem";
import { contract, type Runtime } from "./config";
import { errorText, parseAmount, units } from "./domain";
import type { Wallet } from "./wallet";
import type { Observatory } from "./state";
import type { Request, Transactions } from "./transactions";
import { TxFeedback } from "./components";
export function TokenTools({
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
  const [mode, setMode] = useState("transfer"),
    [target, setTarget] = useState(""),
    [owner, setOwner] = useState(""),
    [amount, setAmount] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{
    request: Request;
    description: string;
    balance: bigint;
    allowance?: bigint;
  }>();
  useEffect(() => {
    setReview(undefined);
    setError("");
  }, [mode, target, owner, amount, w.account, w.chainId]);
  const token = contract(r, "LaunchToken");
  const decimals = o.snapshot?.decimals ?? 18;
  const preview = async () => {
    setError("");
    setReview(undefined);
    setBusy(true);
    try {
      if (!isAddress(target.trim()) || target.trim() === zeroAddress)
        throw Error("Enter a complete, nonzero Ethereum address.");
      if (
        mode === "transferFrom" &&
        (!isAddress(owner.trim()) || owner.trim() === zeroAddress)
      )
        throw Error("Enter a complete token owner address.");
      const to = getAddress(target.trim()),
        from = mode === "transferFrom" ? getAddress(owner.trim()) : w.account!;
      const value = parseAmount(amount, decimals, mode === "approve");
      const [balance, allowance] = await Promise.all([
        o.client.readContract({
          ...token,
          functionName: "balanceOf",
          args: [from],
        }) as Promise<bigint>,
        mode === "transfer"
          ? undefined
          : (o.client.readContract({
              ...token,
              functionName: "allowance",
              args: mode === "approve" ? [w.account, to] : [from, w.account],
            }) as Promise<bigint>),
      ]);
      const args = mode === "transferFrom" ? [from, to, value] : [to, value];
      const request = { ...token, functionName: mode, args };
      await o.client.simulateContract({ ...request, account: w.account });
      setReview({
        request,
        balance,
        allowance,
        description:
          mode === "approve"
            ? `Set this spender’s QOBS allowance to ${units(value, decimals)}. This replaces the existing allowance.`
            : `Send ${units(value, decimals)} QOBS ${mode === "transferFrom" ? `from ${from} ` : ""}to ${to}. Transfers cannot be reversed.`,
      });
    } catch (e) {
      const message = errorText(e);
      setError(message);
      document
        .getElementById(
          message.includes("owner")
            ? "token-owner"
            : message.includes("address")
              ? "token-target"
              : "token-amount",
        )
        ?.focus();
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="token-tools panel" id="token-tools">
      <summary>
        Token tools <span>Transfer & allowances</span>
      </summary>
      <div className="tools-content">
        <p>
          QOBS is a standard ERC-20. Observations never require an allowance or
          transfer. These tools move tokens or grant spending permission;
          Ethereum network fees apply.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void preview();
          }}
        >
          <label htmlFor="token-action">Action</label>
          <select
            id="token-action"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={!!tx.active || busy}
          >
            <option value="transfer">Transfer QOBS</option>
            <option value="approve">Set / revoke allowance</option>
            <option value="transferFrom">Transfer using allowance</option>
          </select>
          {mode === "transferFrom" && (
            <>
              <label htmlFor="token-owner">Token owner address</label>
              <input
                id="token-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="0x…"
                disabled={!!tx.active || busy}
              />
            </>
          )}
          <label htmlFor="token-target">
            {mode === "approve" ? "Spender address" : "Recipient address"}
          </label>
          <input
            id="token-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            disabled={!!tx.active || busy}
            aria-describedby="token-error"
            aria-invalid={!!error}
          />
          <label htmlFor="token-amount">
            Amount (QOBS){mode === "approve" ? " · 0 revokes permission" : ""}
          </label>
          <input
            id="token-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={!!tx.active || busy}
          />
          <p id="token-error" className="error-text" role="alert">
            {error}
          </p>
          <button
            className="secondary"
            disabled={!ready || !!tx.active || busy}
            type="submit"
          >
            {busy ? "Checking transaction…" : "Review token action"}
          </button>
        </form>
        {review && (
          <div className="notice review">
            <h3>Review token action</h3>
            <p>{review.description}</p>
            <p>
              Owner balance: {units(review.balance, decimals)} QOBS
              {review.allowance !== undefined
                ? ` · Current allowance: ${units(review.allowance, decimals)} QOBS`
                : ""}
            </p>
            {mode === "approve" && (
              <p>
                Only approve a spender you trust. To replace a nonzero
                allowance, first revoke it with an amount of 0.
              </p>
            )}
            <button
              className="secondary"
              disabled={!ready || !!tx.active}
              onClick={async () => {
                if (await tx.run("token", () => review.request))
                  setReview(undefined);
              }}
            >
              {tx.active === "token"
                ? "Processing token action…"
                : mode === "approve"
                  ? "Confirm allowance"
                  : "Confirm transfer"}
            </button>
          </div>
        )}
        <TxFeedback id="token" tx={tx} r={r} />
      </div>
    </details>
  );
}
