import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  parseUnits,
} from "viem";
export function parseAmount(text: string, decimals: number, allowZero = false) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text.trim()))
    throw Error("Enter an amount using digits and a decimal point.");
  if ((text.split(".")[1]?.length ?? 0) > decimals)
    throw Error(`Use at most ${decimals} decimal places.`);
  const amount = parseUnits(text.trim(), decimals);
  if (amount < 0n || (!allowZero && amount === 0n))
    throw Error("Enter an amount greater than zero.");
  if (amount > 2n ** 256n - 1n) throw Error("Amount is too large.");
  return amount;
}
export const units = (value: bigint, decimals: number, max = 6) => {
  const [whole, fraction] = formatUnits(value, decimals).split(".");
  const tail = fraction?.slice(0, max).replace(/0+$/, "");
  return `${BigInt(whole).toLocaleString("en-US")}${tail ? "." + tail : ""}`;
};
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const errors: Record<string, string> = {
  InvalidState: "Choose a state from 0 to 7.",
  EpochExpired: "This epoch has ended. Advance it before observing.",
  EpochStillActive: "The epoch is still active. Wait until its end.",
  EpochFull:
    "This epoch has reached 1,024 observations. Wait for the next epoch.",
  AlreadyObserved: "This wallet has already observed in this epoch.",
  InsufficientBalance: "Hold at least 1 QOBS to submit an observation.",
  ERC20InsufficientBalance: "The token balance is too low for this amount.",
  ERC20InsufficientAllowance:
    "The owner has not approved enough QOBS for this transfer.",
  ERC20InvalidReceiver: "Use a valid, nonzero recipient address.",
  TransactionDeadlinePassed: "The swap deadline passed. Get a new quote.",
  ExecutionFailed:
    "The router simulation reverted. Refresh the quote and check pool liquidity and allowances.",
};
export function errorText(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError;
    if (revert?.data?.errorName)
      return (
        errors[revert.data.errorName] ??
        `Contract rejected the action (${revert.data.errorName}). Refresh state and try again.`
      );
  }
  const e = error as {
    code?: number;
    message?: string;
    shortMessage?: string;
    cause?: unknown;
  };
  if (e?.code === 4001 || /rejected|denied/i.test(e?.message ?? ""))
    return "Request declined in the wallet. You can try again.";
  if (/insufficient funds/i.test(e?.message ?? ""))
    return "Not enough ETH for the transaction and network fee. Add ETH and try again.";
  const text = e?.shortMessage || e?.message;
  if (text && text.length < 300 && !/https?:|0x[0-9a-f]{8}/i.test(text))
    return text;
  return "Unable to complete the request. Check your wallet and connection, then retry.";
}
export function observationReason(s: {
  balance: bigint;
  minBalance: bigint;
  observed: boolean;
  count: number;
  max: number;
  timestamp: bigint;
  end: bigint;
}) {
  if (s.timestamp >= s.end)
    return "This epoch has ended. Anyone can advance it below.";
  if (s.count >= s.max) return "This epoch is full. Wait for the next epoch.";
  if (s.observed) return "Observation recorded. Come back next epoch.";
  if (s.balance < s.minBalance)
    return "Hold at least 1 QOBS to submit an observation.";
  return "";
}
