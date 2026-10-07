import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  zeroAddress,
  type Address,
} from "viem";
import { contract, publicClient, type Client, type Runtime } from "./config";
import { erc20Abi, pairedCurrency, poolTuple, stateViewAbi } from "./protocol";
import { errorText } from "./domain";
import type { Wallet } from "./wallet";
export type Snapshot = {
  block: bigint;
  timestamp: bigint;
  epoch: bigint;
  start: bigint;
  end: bigint;
  count: number;
  max: number;
  scale: bigint;
  minBalance: bigint;
  probabilities: number[];
  counts: number[];
  observed: boolean;
  balance: bigint;
  nativeBalance: bigint;
  pairBalance: bigint;
  symbol: string;
  decimals: number;
  pairSymbol: string;
  pairDecimals: number;
  supply: bigint;
  at: number;
  account?: Address;
};
export async function verifyContracts(r: Runtime, client: Client) {
  if ((await client.getChainId()) !== r.deployment.chainId)
    throw Error("RPC reports the wrong chain. Transactions are disabled.");
  const codes = await Promise.all(
    r.deployment.contracts.map(async (c) => ({
      name: c.name,
      code: await client.getCode({ address: c.address }),
    })),
  );
  if (codes.some((c) => !c.code || c.code === "0x"))
    throw Error(
      "A deployed contract has no code at this RPC. Transactions are disabled.",
    );
  const token = (await client.readContract({
    ...contract(r, "QuantumEngine"),
    functionName: "token",
  })) as Address;
  if (token.toLowerCase() !== contract(r, "LaunchToken").address.toLowerCase())
    throw Error(
      "Engine token differs from the deployment. Transactions are disabled.",
    );
}
export async function readSnapshot(
  r: Runtime,
  client: Client,
  account?: Address,
): Promise<Snapshot> {
  const block = await client.getBlock();
  const blockNumber = block.number;
  const engine = contract(r, "QuantumEngine"),
    token = contract(r, "LaunchToken");
  const read = (functionName: string, args?: readonly unknown[]) =>
    client.readContract({ ...engine, functionName, args, blockNumber });
  const t = (functionName: string, args?: readonly unknown[]) =>
    client.readContract({ ...token, functionName, args, blockNumber });
  const pair = pairedCurrency(r);
  const v = await Promise.all([
    read("epoch"),
    read("epochStartedAt"),
    read("epochEndsAt"),
    read("observationCount"),
    read("MAX_OBSERVATIONS"),
    read("SCALE"),
    read("MIN_BALANCE"),
    read("getProbabilities"),
    read("getObservationCounts"),
    account ? read("hasObserved", [account]) : false,
    account ? t("balanceOf", [account]) : 0n,
    t("symbol"),
    t("decimals"),
    t("totalSupply"),
    account ? client.getBalance({ address: account, blockNumber }) : 0n,
    pair === zeroAddress
      ? r.deployment.network.nativeCurrency.symbol
      : client.readContract({
          address: pair,
          abi: erc20Abi,
          functionName: "symbol",
          blockNumber,
        }),
    pair === zeroAddress
      ? r.deployment.network.nativeCurrency.decimals
      : client.readContract({
          address: pair,
          abi: erc20Abi,
          functionName: "decimals",
          blockNumber,
        }),
    pair !== zeroAddress && account
      ? client.readContract({
          address: pair,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account],
          blockNumber,
        })
      : 0n,
  ]);
  const probabilities = v[7] as number[];
  if (
    probabilities.length !== 8 ||
    probabilities.reduce((a, b) => a + b, 0) !== Number(v[5])
  )
    throw Error("Invalid probability snapshot. Refresh state to retry.");
  return {
    block: blockNumber,
    timestamp: block.timestamp,
    epoch: BigInt(v[0] as bigint),
    start: BigInt(v[1] as bigint),
    end: BigInt(v[2] as bigint),
    count: Number(v[3]),
    max: Number(v[4]),
    scale: BigInt(v[5] as bigint),
    minBalance: BigInt(v[6] as bigint),
    probabilities,
    counts: v[8] as number[],
    observed: v[9] as boolean,
    balance: v[10] as bigint,
    symbol: String(v[11]),
    decimals: Number(v[12]),
    supply: v[13] as bigint,
    nativeBalance: v[14] as bigint,
    pairSymbol: String(v[15]),
    pairDecimals: Number(v[16]),
    pairBalance: pair === zeroAddress ? (v[14] as bigint) : (v[17] as bigint),
    at: Date.now(),
    account,
  };
}
export async function readPool(r: Runtime, client: Client) {
  const p = r.deployment.poolKey;
  const addresses = [
    ...Object.entries(r.deployment.network.uniswapV4)
      .filter(([, value]) => typeof value === "string")
      .map(([, value]) => value as Address),
    ...(p.hooks !== zeroAddress ? [p.hooks] : []),
  ];
  const code = await Promise.all(
    addresses.map((address) => client.getCode({ address })),
  );
  if (code.some((c) => !c || c === "0x"))
    throw Error("A configured pool contract has no code. Swaps are disabled.");
  const poolId = keccak256(
    encodeAbiParameters(parseAbiParameters(poolTuple), [p]),
  );
  const [slot, liquidity] = await Promise.all([
    client.readContract({
      address: r.deployment.network.uniswapV4.stateView,
      abi: stateViewAbi,
      functionName: "getSlot0",
      args: [poolId],
    }),
    client.readContract({
      address: r.deployment.network.uniswapV4.stateView,
      abi: stateViewAbi,
      functionName: "getLiquidity",
      args: [poolId],
    }),
  ]);
  if (slot[0] === 0n || liquidity === 0n)
    throw Error(
      "The attested pool has no active liquidity. Swaps are unavailable.",
    );
  return { poolId, liquidity, fee: slot[3] };
}
export function useObservatory(r: Runtime, w: Wallet) {
  const client = useMemo(
    () => publicClient(r, w.correctChain ? w.provider : undefined),
    [r, w.provider, w.correctChain],
  );
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [pool, setPool] = useState<Awaited<ReturnType<typeof readPool>>>();
  const [poolError, setPoolError] = useState("");
  const generation = useRef(0);
  const running = useRef<number | undefined>(undefined);
  const refresh = useCallback(
    async (force = false) => {
      const g = generation.current;
      if (running.current === g) {
        if (!force) return;
        while (running.current === g)
          await new Promise((resolve) => setTimeout(resolve, 100));
        if (g !== generation.current) return;
      }
      running.current = g;
      setLoading(true);
      try {
        await verifyContracts(r, client);
        const s = await readSnapshot(r, client, w.account);
        if (g === generation.current) {
          setSnapshot(s);
          setVerified(true);
          setError("");
        }
      } catch (e) {
        if (g === generation.current) {
          setError(errorText(e));
          setVerified(false);
        }
      } finally {
        if (g === generation.current) setLoading(false);
        if (running.current === g) running.current = undefined;
      }
    },
    [r, client, w.account],
  );
  useEffect(() => {
    generation.current++;
    setSnapshot(undefined);
    setVerified(false);
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => {
      generation.current++;
      clearInterval(id);
    };
  }, [refresh]);
  const refreshPool = useCallback(async () => {
    try {
      const p = await readPool(r, client);
      setPool(p);
      setPoolError("");
    } catch (e) {
      setPool(undefined);
      setPoolError(errorText(e));
    }
  }, [r, client]);
  useEffect(() => {
    void refreshPool();
  }, [refreshPool]);
  return {
    client,
    snapshot,
    error,
    loading,
    verified,
    refresh,
    pool,
    poolError,
    refreshPool,
  };
}
export type Observatory = ReturnType<typeof useObservatory>;
