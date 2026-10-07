# Quantum Observatory v2 · QOBS

An open, deterministic eight-state experiment on Ethereum. The v2 website adds original quantum-inspired artwork, animated probabilities, a browser model laboratory and a traceable Learning library while preserving the existing wallet flows and verified deployment.

## Run the website

Use Node.js 22.12+ and npm (worker: Node 24.21.0, npm 11.19.0).

```sh
cd web
npm ci --cache /tmp/qobs-npm-cache
npm run typecheck
npm run build
npm run preview:subpath
# http://127.0.0.1:4173/preview/
```

`npm run dev` runs Vite after an initial build. `npm run preview` serves the production export. `npm run build` typechecks, produces repository-root `dist/`, copies the pinned ABIs/model notes and hashes the final asset inventory. Keep the pinned source commit available to Git: the exporter reads its exact ABI and documentation bytes. Source, the existing manifest and lockfile live in `web/`; the complete static export is delivered in `dist/`.

## Publish the next qobs version

Publish **the contents of `dist/` as one directory** with the existing IdentityMD hosting publisher, targeting **qobs.site.identitymd.eth** (qobs). Pin the directory, update that existing site's content reference, then verify its public gateway/subpath and hash navigation. Do not deploy a contract, create a replacement token, or change the site's name. Vite uses `base: './'`; all runtime assets are local and relative. There is no rewrite server, secret or backend in the export.

The worker prepared and validated the export for that publisher. No publication tool or hosting credentials are configured here, so a new public CID/ENS update is **not claimed**. [Release handoff](docs/v2/release.json) records this boundary and the previous version.

## Existing deployment — unchanged

| Item | Value |
| --- | --- |
| Network | Ethereum mainnet, chain 1 |
| QOBS | `0xad455ee2800b314588b5178df0dcbbc5dad7e1c7` |
| QuantumEngine | `0x44e8c4cfa22626145065a33d5ec74fedfe28c719` |
| Supply | 1,000,000,000 QOBS, 18 decimals |
| Epoch | 3,600 seconds; 8 states; scale 1,000,000 |
| Participation | Hold 1 QOBS; one choice per address/epoch; max 1,024 observations |
| Pool | Existing attested ETH/QOBS pool; fee 12500, tick spacing 60 and original hook |
| Source commit | `53c8e396dfaf7add0d1d90dd2ea19c52206feea3` |

The browser loads one generated deployment manifest and checks the pinned ABI hashes, chain, deployed code and engine token reference. Observation, advancement, exact approvals, swaps, token transfer/revoke/delegated transfer and wallet switching retain their simulations, review and receipt handling. Failed/stale state disables writes. No contract source, supply, balance or liquidity change is part of this upgrade; no transaction was broadcast by the worker.

The engine is immutable, ownerless and noncustodial, and **has no payouts**. Observations spend no QOBS and are user-selected labels, not physical quantum measurements. This classical model provides no randomness, price predictions or automatic profit. Complete [model notes and ten existing sources](docs/model.md) remain bundled in the site.

## What is new

- Original AI-generated hero and interference-field WebP assets with responsive loading; mint-on-forest typography; desktop/mobile layouts; reduced-motion support.
- Browser-only experiments vary uniform mixing and observation feedback, compare with the fixed on-chain baseline, optionally copy a frozen live input and export reproducible JSON. The baseline matches all 32 existing reference vectors.
- Learning library search and topic filters, a static initial snapshot of existing sources, explicit retrieval-date provenance, evidence classifications, changes, model evaluation and limitations. No live research endpoint is configured.
- A [versioned snapshot schema](web/public/research/snapshot.schema.json), [future hosted collector design](web/public/research/collector.md) and [future realised-revenue reward proposal](web/public/research/rewards.md). Neither proposal is implemented as a service or funded program.

## Check and maintain

```sh
cd web
npm run typecheck
npm test
npm run verify
npx playwright install chromium
npm run test:browser
npm run check:live  # read-only RPC/code/supply/pool verification
```

The worker ran the production build, typecheck, ten unit tests, browser interaction checks and read-only mainnet validation. [Actual results, bounded browser commands and limitations](docs/v2/validation.md) distinguish mocked wallet checks from live reads. No real signing, paid transactions, native screen reader or physical mobile wallet testing is claimed.

[DESIGN.md](DESIGN.md) describes the final tokens, type, components and responsive behavior. [web/README.md](web/README.md) explains wallet/protocol details and build integrity. [Artwork provenance](docs/v2/artwork.md) contains the exact generation prompts. Existing build configuration, package manifests, lockfiles and dependency directories are unchanged. No ignore files were edited; package caches and generated dependencies are excluded from submission. The complete candidate bundle is checked against the 8 MiB limit.

Contract source and tests are retained. Their established optional commands are `forge build`, `forge test`, `forge fmt --check` and `python3 tools/export_abi.py --check`; this website upgrade does not claim to have rerun the Solidity suite. See [security notes](docs/security.md), [deployment history](docs/deployment.md) and [ABI documentation](docs/abi/README.md).
