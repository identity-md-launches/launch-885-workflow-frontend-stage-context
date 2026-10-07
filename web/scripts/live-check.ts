import { readFileSync, writeFileSync } from "node:fs";
import {
  defineChain,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
} from "viem";
import { publicClient, type Deployment, type Runtime } from "../src/config";
import { verifyContracts, readSnapshot } from "../src/state";
import { poolTuple, stateViewAbi } from "../src/protocol";
const deployment: Deployment = JSON.parse(
  readFileSync("../dist/imd-deployment.json", "utf8"),
);
const abis = Object.fromEntries(
  deployment.contracts.map((c) => [
    c.name,
    JSON.parse(readFileSync(`../dist/${c.abiPath}`, "utf8")),
  ]),
);
const r: Runtime = {
  deployment,
  abis,
  chain: defineChain({
    id: deployment.chainId,
    name: deployment.network.name,
    nativeCurrency: deployment.network.nativeCurrency,
    rpcUrls: { default: { http: deployment.network.rpcUrls } },
  }),
};
const client = publicClient(r);
const report: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  mode: "read-only; no wallet; no broadcast",
};
try {
  await verifyContracts(r, client);
  report.chainId = await client.getChainId();
  report.contracts = await Promise.all(
    deployment.contracts.map(async (c) => ({
      name: c.name,
      address: c.address,
      codeBytes:
        ((await client.getCode({ address: c.address }))!.length - 2) / 2,
    })),
  );
  report.snapshot = await readSnapshot(r, client);
  const poolId = keccak256(
    encodeAbiParameters(parseAbiParameters(poolTuple), [deployment.poolKey]),
  );
  report.pool = {
    poolId,
    slot0: await client.readContract({
      address: deployment.network.uniswapV4.stateView,
      abi: stateViewAbi,
      functionName: "getSlot0",
      args: [poolId],
    }),
    liquidity: await client.readContract({
      address: deployment.network.uniswapV4.stateView,
      abi: stateViewAbi,
      functionName: "getLiquidity",
      args: [poolId],
    }),
  };
} catch (e) {
  report.error = String(e);
  process.exitCode = 1;
}
writeFileSync(
  "../docs/frontend/live-read.json",
  JSON.stringify(
    report,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    report,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ),
);
