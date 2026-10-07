import {
  createPublicClient,
  custom,
  defineChain,
  fallback,
  http,
  isAddress,
  keccak256,
  toHex,
  type Abi,
  type Address,
  type EIP1193Provider,
} from "viem";
export type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};
export type Deployment = {
  version: 1;
  launchId: string;
  chainId: number;
  sourceCommit: string;
  attestationHash: string;
  contracts: {
    name: string;
    address: Address;
    abiHash: string;
    abiPath: string;
  }[];
  assets: { path: string; sha256: string }[];
  poolKey: PoolKey;
  network: {
    chainId: number;
    name: string;
    testnet: boolean;
    rpcUrls: string[];
    explorer: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    uniswapV4: {
      poolManager: Address;
      universalRouter: Address;
      quoter: Address;
      stateView: Address;
      positionManager: Address;
      permit2: Address;
      extendedSwapParams?: boolean;
    };
    pairToken?: { address: Address; symbol: string; decimals: number };
    otherPairTokens?: { address: Address; symbol: string; decimals: number }[];
  };
  walletAddChain?: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
    blockExplorerUrls: string[];
  };
};
export type Runtime = {
  deployment: Deployment;
  abis: Record<string, Abi>;
  chain: ReturnType<typeof defineChain>;
};
export const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .map(
            (k) =>
              `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`,
          )
          .join(",")}}`
      : JSON.stringify(v);
export function localPath(p: string) {
  return (
    !!p &&
    !p.startsWith("/") &&
    !p.includes("..") &&
    !p.includes(":") &&
    !p.includes("\\")
  );
}
export async function fetchLocal(path: string) {
  if (!localPath(path)) throw Error("Unsafe runtime asset path.");
  const r = await fetch(new URL(path, document.baseURI), { cache: "no-cache" });
  if (!r.ok) throw Error(`Unable to load ${path}. Reload the page to retry.`);
  return r;
}
export async function loadRuntime(): Promise<Runtime> {
  const deployment: Deployment = await (
    await fetchLocal("imd-deployment.json")
  ).json();
  const d = deployment;
  if (
    d.version !== 1 ||
    d.chainId !== d.network?.chainId ||
    !d.network.rpcUrls.length ||
    !d.poolKey
  )
    throw Error("Invalid deployment configuration. Transactions are disabled.");
  const keys = [
    "version",
    "launchId",
    "chainId",
    "sourceCommit",
    "attestationHash",
    "contracts",
    "assets",
    "poolKey",
    "network",
    "walletAddChain",
  ];
  if (Object.keys(d).some((k) => !keys.includes(k)))
    throw Error("Unexpected deployment configuration field.");
  const abis: Record<string, Abi> = {};
  for (const c of d.contracts) {
    if (!isAddress(c.address) || !localPath(c.abiPath))
      throw Error("Invalid contract configuration.");
    const abi = await (await fetchLocal(c.abiPath)).json();
    if (
      !Array.isArray(abi) ||
      keccak256(toHex(canonical(abi))).slice(2) !== c.abiHash
    )
      throw Error(
        `ABI verification failed for ${c.name}. Transactions are disabled.`,
      );
    abis[c.name] = abi;
  }
  for (const name of ["LaunchToken", "QuantumEngine"])
    if (!abis[name]) throw Error(`Missing ${name}.`);
  const chain = defineChain({
    id: d.chainId,
    name: d.network.name,
    nativeCurrency: d.network.nativeCurrency,
    rpcUrls: { default: { http: d.network.rpcUrls } },
    blockExplorers: { default: { name: "Explorer", url: d.network.explorer } },
  });
  return { deployment, abis, chain };
}
export function contract(r: Runtime, name: string) {
  const c = r.deployment.contracts.find((c) => c.name === name);
  if (!c) throw Error(`Missing ${name}`);
  return { address: c.address, abi: r.abis[name] };
}
export function publicClient(r: Runtime, provider?: EIP1193Provider) {
  return createPublicClient({
    chain: r.chain,
    transport: fallback(
      [
        ...r.deployment.network.rpcUrls.map((url) =>
          http(url, { batch: { wait: 25 }, retryCount: 0, timeout: 8000 }),
        ),
        ...(provider ? [custom(provider, { retryCount: 0 })] : []),
      ],
      { rank: false, retryCount: 0 },
    ),
    pollingInterval: 4000,
  });
}
export type Client = ReturnType<typeof publicClient>;
