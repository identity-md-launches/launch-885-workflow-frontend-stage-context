import { useRef, useState } from "react";
import {
  createWalletClient,
  custom,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import type { Runtime } from "./config";
import type { Wallet } from "./wallet";
import type { Observatory } from "./state";
import { errorText } from "./domain";
export type Request = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};
export type TxState = {
  phase: "simulating" | "signing" | "pending" | "success" | "error" | "unknown";
  message: string;
  hash?: Hex;
};
export function useTransactions(r: Runtime, w: Wallet, o: Observatory) {
  const [states, setStates] = useState<Record<string, TxState>>({});
  const [active, setActive] = useState("");
  const lock = useRef(false);
  const set = (id: string, state: TxState) =>
    setStates((prev) => ({ ...prev, [id]: state }));
  const checkWallet = async () => {
    if (!w.provider || !w.account || !w.correctChain)
      throw Error(`Connect a wallet on ${r.deployment.network.name}.`);
    if (
      !o.verified ||
      !o.snapshot ||
      o.snapshot.account !== w.account ||
      Date.now() - o.snapshot.at > 30000
    )
      throw Error(
        "State is unavailable or stale. Refresh state before continuing.",
      );
    const accounts = await w.provider.request({ method: "eth_accounts" });
    const chain = Number(await w.provider.request({ method: "eth_chainId" }));
    if (
      accounts[0]?.toLowerCase() !== w.account.toLowerCase() ||
      chain !== r.deployment.chainId
    )
      throw Error(
        "Wallet account or network changed. Refresh and review the action again.",
      );
    return { account: w.account, provider: w.provider };
  };
  const confirmed = async (id: string, hash: Hex) => {
    const receipt = await o.client.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 120000,
    });
    if (receipt.status === "reverted") {
      set(id, {
        phase: "error",
        message:
          "Transaction reverted on chain. Refresh state before trying again.",
        hash,
      });
    } else {
      await o.refresh(true);
      set(id, {
        phase: "success",
        message: "Confirmed on Ethereum. Live state refreshed.",
        hash,
      });
    }
    lock.current = false;
    setActive("");
  };
  const run = async (id: string, prepare: () => Promise<Request> | Request) => {
    if (lock.current) return false;
    lock.current = true;
    setActive(id);
    let hash: Hex | undefined;
    try {
      set(id, {
        phase: "simulating",
        message: "Simulating against current contract state…",
      });
      const { account, provider } = await checkWallet();
      const req = await prepare();
      await o.client.simulateContract({ ...req, account });
      const gas = await o.client.estimateContractGas({ ...req, account });
      await checkWallet();
      set(id, {
        phase: "signing",
        message: "Review the action and network fee in your wallet.",
      });
      hash = await createWalletClient({
        chain: r.chain,
        transport: custom(provider),
      }).writeContract({
        ...req,
        account,
        chain: r.chain,
        gas: (gas * 120n) / 100n,
      });
      set(id, {
        phase: "pending",
        message: "Transaction submitted. Waiting for confirmation…",
        hash,
      });
      await confirmed(id, hash);
      return true;
    } catch (e) {
      if (hash) {
        set(id, {
          phase: "unknown",
          message:
            "Confirmation is delayed. Check the submitted transaction before sending another.",
          hash,
        });
      } else {
        set(id, { phase: "error", message: errorText(e) });
        lock.current = false;
        setActive("");
      }
      return false;
    }
  };
  const recheck = async (id: string) => {
    const hash = states[id]?.hash;
    if (!hash) return;
    set(id, {
      phase: "pending",
      message: "Checking transaction confirmation…",
      hash,
    });
    try {
      await confirmed(id, hash);
    } catch {
      set(id, {
        phase: "unknown",
        message:
          "Still awaiting confirmation. Check the explorer or retry the status check.",
        hash,
      });
    }
  };
  return { states, active, run, recheck };
}
export type Transactions = ReturnType<typeof useTransactions>;
