# Quantum Observatory v2 frontend

A static Vite / React / TypeScript application for the deployed QOBS token and QuantumEngine. Source is in `web/`; the complete hosting payload is repository-root `dist/`. There is no backend, private credential, WalletConnect project ID, or vendored registry. Dependencies are installed from the committed npm lockfile.

## Install, build and preview

Use Node.js 22.12+ (validated with Node 24.21.0) and npm:

```sh
cd web
npm ci --cache /tmp/qobs-npm-cache
npm run build
npm run preview:subpath
# Open http://127.0.0.1:4173/preview/
```

The subpath preview exits after 30 minutes or Ctrl-C. `npm run preview` also serves the production export using Vite. `npm run dev` runs the source development server; first build once because its middleware serves verified runtime files from `dist/`.

`npm run build` runs typecheck, builds with `base: './'`, copies the pinned implementation ABI arrays and model notes, then emits `dist/imd-deployment.json` from the final bytes. Rebuild after source changes; never edit a generated asset without regenerating the manifest. Hash routing (`#observatory`, `#research`, `#laboratory`, `#library`) needs no server rewrites. Publish the contents of `dist/` as one directory. No publication or contract deployment is performed by these commands.

## One deployment configuration

The browser fetches `./imd-deployment.json` and the ABI files it references. It does not import deployment addresses, chain IDs or RPC URLs from a second map. `web/config/handoff.json` and `web/config/network.json` are archival build inputs copied unchanged from the assigned handoff; they are not imported into browser code. All quotes, approvals, swaps and pool checks use the manifest's `network.uniswapV4` addresses. The complete `poolKey`, including fee 12500 and the initialization hook, is copied exactly; the older illustrative fee inside `manifest.pool` is not used.

ABIs come from `git show <sourceCommit>:docs/abi/<Contract>.json`. The exporter verifies Keccak-256 of recursively key-sorted, compact JSON against each handoff `abiHash`, and copies the original ABI bytes. Keep the pinned Git commit available when rebuilding. The UI repeats the canonical ABI check before rendering. `npm run verify` verifies the complete handoff binding, pool/network parameters, pinned ABI bytes and hashes, every asset SHA-256, inventory completeness and export limits.

The build inputs are public configuration. Never add credentials or replace contract/protocol addresses independently. A changed deployment requires its new attested handoff and corresponding pinned implementation ABIs.

## Behavior

- Public RPC fallback reads work before connection. An injected wallet or EIP-6963 browser wallet signs transactions. No QR/mobile WalletConnect connector is configured without a project ID. Full checksummed addresses, copy controls and explorer links are available; ENS resolution is not configured.
- Wrong-chain state offers one switch control. Error 4902/unknown-chain responses trigger `wallet_addEthereumChain` with the exact supplied parameters, then retry switching.
- Engine snapshots use one block for probabilities, counts, constants, token metadata, balance and eligibility. Visible pages poll at five seconds with no overlapping snapshot reads. RPC chain ID, nonempty application code and the engine's token reference are verified. Failed or >30-second-old snapshots disable writes.
- Hold at least 1 QOBS, observe one state 0–7 once per active epoch, and advance any expired epoch. Observations spend no QOBS and require no approval. The UI shows all eight probabilities and observation counts, current epoch, deadline, block, eligibility and transaction status.
- Buy/sell uses the attested Uniswap v4 pool. Quotes are `simulateContract` calls, never transactions. Slippage is bounded to 0.1–5%, minimum output rounds down, quotes expire in 30 seconds, and swaps have a five-minute deadline. Native input sends value without approvals. Token input uses exact-amount ERC-20 → Permit2 and Permit2 → Universal Router approvals only when insufficient; each is a separate confirmed action, with a fresh quote required afterwards. Permit2 grants expire in 30 minutes.
- The router uses V4_SWAP `0x10`, actions `0x060c0f`, SETTLE_ALL and TAKE_ALL. The extended six-field tuple is supported when the configured network requests it. The current Ethereum deployment uses five fields.
- Every write is simulated and gas-estimated before wallet signing. The account/network is checked again after simulation. The wallet shows the fee. Transaction-specific statuses cover simulation, signature, pending, success, rejection, revert and delayed confirmation. A shared signing lock prevents concurrent writes while individual actions retain their own feedback. Submitted transactions stay locked until a receipt; a timeout offers a status recheck, not a resend.
- Advanced token tools expose `transfer`, `approve` (including zero to revoke), and `transferFrom`, with a review showing balance/current allowance and recipient/spender before signing.
- The complete pinned `docs/model.md` is bundled as `dist/model.md` and rendered locally in the research view, including equations, approximations, unknowns and ten paper links. No live research fetch is required.

## Validation

```sh
cd web
npm run typecheck
npm test
npm run test:browser
npm run verify
npm run check:live  # Read-only public RPC check; never broadcasts
```

Install Chromium for normal local browser testing with `npx playwright install chromium`. `BROWSER_EXECUTABLE` can select an existing Chromium executable. On a resource-constrained worker, set `BROWSER_LOW_RESOURCE=1`: this uses a fresh Chromium process for every test and limits subprocess creation. The browser suite serves the production export at `/preview/`, intercepts both configured RPCs and wallet requests, and never signs or broadcasts real transactions. Reports and screenshots go under `docs/frontend/` and worker `artifacts/`; durable v2 evidence is preserved in `docs/v2/`. Temporary traces are under `test/scratch/`.

See `../docs/v2/validation.md` for v2 worker results and limits, `../DESIGN.md` for implemented design tokens/components, and the adjacent license files for pinned guide attribution. Native screen-reader sessions, hardware-wallet behavior, native browser zoom and real paid transactions are not certified by these tests. No USD oracle was supplied, so the UI explicitly says USD prices are unavailable. Absolute social-image URLs await the publisher's final hosting URL.

## Scope and packaging

All source, dependencies and frontend configuration stay inside `web/`. The existing `web/.gitignore` excludes dependency/cache/test outputs at every nesting level; this upgrade does not modify any ignore file. `node_modules`, registries, dependency archives and caches are excluded. The root build and deployed contract sources are untouched. The final design document is repository-root `DESIGN.md`. Existing package manifests, lockfiles, build configuration, contract sources and dependency sources are unchanged. The existing package metadata still reads 1.0.0 because it is protected; the website release is v2.

Design guidance: Better Interface, Jakub Krehel, MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation method: Paul Bakaus / Impeccable, Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. Ethereum UX guidance: Austin Griffith / ethskills, MIT, pinned commit `06ea4efa08076ff04f6ca4945ef4a2ca881115b0`. This site adapts the guides to this specific product and write budget; full notices are preserved under `docs/frontend/`.

Protocol encoding was cross-checked against the primary Uniswap [routing guide](https://developers.uniswap.org/docs/protocols/v4/guides/swapping/routing) and [quoter guide](https://developers.uniswap.org/docs/sdks/v4/guides/swapping/quoting). Deployment addresses always come from the supplied network configuration.

## v2 additions and publishing

- Original AI-generated local WebP hero and interference images; prompts and optimization notes in `../docs/v2/artwork.md`. Responsive source selection, lazy illustrations and separate page/Markdown chunks keep loading bounded.
- A browser-only exact integer model, two parameter sliders, starting-vector/histogram experiments, up to twelve repeated steps, fixed 25%/25% baseline comparison, optional frozen live input and provenance-bearing JSON export. No lab action calls a wallet.
- The static Learning library has ten existing sources, search/topic filters, retrieval-date qualifications, evidence levels, changes, evaluation and SHA-256 provenance. `public/research/initial.json` is the versioned snapshot and `snapshot.schema.json` is the documented interchange schema. No live research endpoint is configured or polled.
- `public/research/collector.md` describes a future separately hosted collector; `rewards.md` describes a separately pre-funded program using realised revenue. Neither is an operating service. The current engine remains immutable and pays no rewards.

Publish the **contents of repository-root `dist/`**, with its relative paths intact, through the existing IdentityMD publisher as the next version of **qobs.site.identitymd.eth** (qobs). Preserve the existing name and deployment. A rebuild is not an on-chain deployment. The publisher must pin the directory, update that existing site's content reference and report the resulting CID; test the published gateway at its real subpath, direct hash navigation and relative assets. The worker has no configured hosting publication capability and does not claim a new public CID or updated ENS record. `../docs/v2/release.json` records the intended target and publication handoff.

On this worker, commands longer than about one minute were terminated, so browser tests ran in bounded batches; see the exact commands and individual reports in `../docs/v2/validation.md`. All paid wallet interactions are mocked. For a regular workstation, `npm run test:browser` runs the full suite.
