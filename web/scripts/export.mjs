import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import { keccak256, toHex } from "viem";
const root = fileURLToPath(new URL("../../", import.meta.url));
const out = resolve(root, "dist");
const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
const handoff = readJSON(resolve(root, "web/config/handoff.json"));
const chain = readJSON(resolve(root, "web/config/network.json"));
export function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
const same = (a, b) => canonical(a) === canonical(b);
const requireThat = (test, message) => {
  if (!test) throw Error(message);
};
const pinned = (p) =>
  execFileSync("git", ["show", `${handoff.sourceCommit}:${p}`], { cwd: root });
const check = process.argv.includes("--check");
requireThat(
  handoff.chainId === chain.network.chainId,
  "Network chain mismatch",
);
const contracts = handoff.contracts.map((c) => {
  const bytes = pinned(`docs/abi/${c.name}.json`);
  const abi = JSON.parse(bytes);
  requireThat(Array.isArray(abi), "Expected implementation ABI array");
  requireThat(
    keccak256(toHex(canonical(abi))).slice(2) === c.abiHash,
    `ABI hash mismatch: ${c.name}`,
  );
  const abiPath = `abi/${c.name}.json`;
  if (!check) {
    mkdirSync(resolve(out, "abi"), { recursive: true });
    writeFileSync(resolve(out, abiPath), bytes);
  } else
    requireThat(
      readFileSync(resolve(out, abiPath)).equals(bytes),
      `Pinned ABI bytes differ: ${c.name}`,
    );
  return { name: c.name, address: c.address, abiHash: c.abiHash, abiPath };
});
if (!check) writeFileSync(resolve(out, "model.md"), pinned("docs/model.md"));
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const paths = walk(out)
  .filter((p) => relative(out, p) !== "imd-deployment.json")
  .sort();
requireThat(paths.length <= 128, "Too many export files");
let total = 0;
const assets = paths.map((p) => {
  const bytes = readFileSync(p);
  total += bytes.length;
  requireThat(bytes.length <= 8388608, "Asset exceeds 8 MiB");
  return {
    path: relative(out, p).replaceAll("\\", "/"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
});
requireThat(
  total < 24 * 1024 * 1024,
  "Export leaves insufficient HTTP verification budget",
);
const manifest = {
  version: 1,
  launchId: handoff.launchId,
  chainId: handoff.chainId,
  sourceCommit: handoff.sourceCommit,
  attestationHash: handoff.attestationHash,
  contracts,
  assets,
  ...(handoff.poolKey ? { poolKey: handoff.poolKey } : {}),
  network: chain.network,
  ...(chain.walletAddChain ? { walletAddChain: chain.walletAddChain } : {}),
};
if (check) {
  const actual = readJSON(resolve(out, "imd-deployment.json"));
  requireThat(
    same(actual, manifest),
    "Deployment manifest, inventory or asset hash mismatch",
  );
} else
  writeFileSync(
    resolve(out, "imd-deployment.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
console.log(
  `${check ? "Verified" : "Exported"} ${assets.length} assets, ${total} bytes; pinned ABIs and complete deployment binding match.`,
);
