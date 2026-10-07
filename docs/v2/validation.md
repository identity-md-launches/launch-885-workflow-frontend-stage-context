# Quantum Observatory v2 — worker validation

Date: 2026-10-07. This is the implementing worker’s evidence, not an independent certification.

## Scope and assumptions

Upgraded the existing React/TypeScript/Vite frontend and retained the wallet, state, protocol, swap and token-action implementation. Ethereum chain 1, QOBS, QuantumEngine, supply and the attested ETH/QOBS pool are unchanged. No transaction was broadcast and no contract was deployed. Existing build configuration, package manifests, lockfiles, dependency sources and ignore files were not edited.

The inferred visual direction is a dark scientific observatory with original mint interference artwork. The lab calculates locally; its baseline reproduces the existing integer model. The library is a static initial snapshot of the existing ten sources. No live research endpoint, backend, ongoing collection, funded rewards or profit mechanism is represented as operating.

## Actual command results

Commands ran in `web/` unless indicated. Node 24.21.0 / npm 11.19.0.

| Check | Actual outcome |
| --- | --- |
| `npm ci --cache /tmp/qobs-v2-npm-cache` | Exit 0; 130 packages installed from the existing lockfile; audit reported zero vulnerabilities. No manifest/lockfile changes. |
| `npm run build` | Exit 0 on the final source. Includes `tsc --noEmit`, Vite production build and pinned-ABI export. 22 inventoried assets, 1,071,479 bytes excluding the deployment manifest. No chunk-size warning in the final build. |
| `npm run typecheck` | Run by the final build; exit 0, including the new source/tests. |
| `npm test` | Exit 0; 10 tests passed. Includes all 32 existing reference vectors, repeated-step mass conservation, parameter extremes, invalid input rejection and snapshot/source hash/link preservation. |
| `npm run verify` | Exit 0; complete asset inventory and hashes, pinned ABI bytes/Keccak hashes and deployment bindings match. |
| Four bounded `npm run test:browser -- …` runs below | Exit 0 for each: 6 + 5 + 2 + 5 = 18 passing scenarios; zero failed, skipped or flaky results. |
| `npm run check:live` | Exit 0, read-only Ethereum RPC. Both application contracts have code, engine token reference matches, total supply is `10^27` minor units, and the attested pool has positive active liquidity. |
| Root Python deployment/path checks | Pinned `.imd` inputs equal archived `web/config` inputs; exact chain, contracts, pool and network preserved; model bytes match pinned commit; export SHA-256 values match; protected configuration/contracts unchanged. |
| Strict Ajv draft 2020-12 + ajv-formats validation | Initial research snapshot passes its bundled schema. Validator installed only in `/tmp`, not added to the project. |
| Bounded foreground Chromium capture | Final export served at a local `/preview/` subpath. Six route/width captures, no overflow, no JavaScript errors and no failed local resources. Keyboard and forced-colors captures also inspected. |
| Packaging check | See `bundle-budget.json` for actual bytes and exclusions; the complete candidate file set and compressed submission-style archive are below 8,388,608 bytes. |

The live read at block **26,139,735** returned epoch 2, supply **1,000,000,000 QOBS**, nonempty code (token 1,722 bytes; engine 4,789 bytes), pool fee **12500** and positive liquidity. `docs/frontend/live-read.json` has the timestamp, full numerical snapshot and pool data. These are historical read results, not promises of current eligibility or swap liquidity.

## Reproduce the browser checks

`BROWSER_EXECUTABLE` selected the worker Chromium at `/opt/imd-worker/local/imd-browser-tool/ms-playwright/chromium-1246/chrome-linux64/chrome`. `BROWSER_LOW_RESOURCE=1` used a fresh single-process Chromium per scenario. On a workstation, install Chromium and run the entire `npm run test:browser` suite normally. Worker batches used:

```sh
export BROWSER_EXECUTABLE=/opt/imd-worker/local/imd-browser-tool/ms-playwright/chromium-1246/chrome-linux64/chrome
export BROWSER_LOW_RESOURCE=1
npm run test:browser -- tests/frontend.spec.ts:39 tests/frontend.spec.ts:65 tests/frontend.spec.ts:95 tests/frontend.spec.ts:135 tests/frontend.spec.ts:170 tests/frontend.spec.ts:184
npm run test:browser -- tests/frontend.spec.ts:227 tests/frontend.spec.ts:265 tests/frontend.spec.ts:304 tests/frontend.spec.ts:332 tests/frontend.spec.ts:378
npm run test:browser -- --grep 'responsive|pending receipt'
npm run test:browser -- tests/v2.spec.ts
```

Reports: `browser-wallet-a.json` (6/6, 37.6s), `browser-wallet-b.json` (5/5, 31.4s), `browser-layout-pending.json` (2/2, 41.5s), `browser-v2.json` (5/5, 52.4s). `docs/frontend/browser-results.json` indexes these batches. Early combined runs ended with exit 143 before finishing; they are not counted as passing suites. The same scenarios subsequently completed in the bounded batches. Early JSX errors introduced while adding lazy loading were caught by typecheck and corrected before the final build.

The 13 preserved-flow scenarios cover disconnected/missing wallets, rejection recovery, exact wrong-chain addition/switching, keyboard state selection, observation simulation and confirmation, duplicate prevention, eligibility/capacity/expiry, advancement, simulation failure, native buy, sale with exact separate token/Permit2 approvals, expired quotes/slippage, account/network changes, token transfer/revoke/delegated transfer review, missing code, tampered ABI and pending-receipt interlocks. Calldata and target assertions bind observations/advancement to QuantumEngine, token tools to QOBS and swaps/approvals to the configured router/Permit2 and exact pool.

The five new scenarios cover slider keyboard changes, baseline outputs, presets/reset and JSON export; frozen input provenance when Ethereum changes; source search/filter/empty recovery, disclosure and snapshot download; local snapshot retry and experiments during RPC failure; responsive reflow, accessibility scans and reduced motion. None sends a real transaction.

## Better Interface: consolidated six-domain review

Read and applied the pinned workflow plus core principles of all six domains before/during implementation; read the documentation method for the final root `DESIGN.md`. Existing MIT/Apache license notices remain in `docs/frontend/BETTER-INTERFACE-LICENSE.txt`.

| Domain | Coverage and evidence | Limitations / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Native radios/sliders/selects/buttons/details; labels, skip link, main focus on routes, visible control focus, exact chart table, status/error regions. Keyboard observation and lab changes exercised. Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA tags report zero violations on all four views. Reduced-motion chart/control transitions are 0s. Forced-colors and focused slider screenshots inspected. | Native screen-reader session, full OS accessibility settings and every focus background combination not verified. No modal exists, so trapping/escape/return is not applicable. Automated scans do not certify full compliance. |
| Layout — Checked | Observatory at 1440/850/768/390/320; lab/library at 1440/950/850/580/390/320. No document overflow. Research reflow at 320. Text enlarged to 200% at 1440 on Observatory, lab and library without overflow. Final desktop/mobile screenshots inspected. | Native browser zoom, physical devices, RTL and pseudolocalization not tested. The product currently offers English only. |
| Writing — Checked | Actions name the operation; error paths offer refresh/retry; local calculations, live Ethereum state and static notes are distinguished. Retrieval dates are qualified as inherited. No payout, automatic profit or running collector claims. Current limitations and verified-source links visible. | Original scientific notes were preserved; this is not a fresh paper review or scientific peer review. |
| Typography — Checked | System font stacks, deliberate serif emphasis, numeric tabular alignment, 16px inputs, wrapping hashes, 74ch notes and descending heading styles. Shared inherited sub-12px functional captions raised to 12px. Rendered headings/cards/320px forms inspected. | Exact installed system fonts are not certified on other OSes. Some decorative metadata and narrow comparison cells intentionally remain smaller than 12px; text enlargement was tested. |
| Colors — Checked | Semantic dark tokens, explicit on-accent ink, selected radio/border plus text cues, labeled chart series with exact table. Five rendered pairs measured: heading 15.88:1, muted panel text 9.19:1, selected probability 13.01:1, primary action 12.96:1, hero emphasis 14.56:1. | Ratios apply only to the named pairs in `docs/frontend/contrast.json`; no blanket image-overlay or universal contrast claim. Light theme is not implemented. Hero copy now has an opaque background. |
| UI — Checked | Consistent bordered surfaces, native disclosures, source-card hover, selected/disabled/loading/error states, optimized real image files. Probability changes use interruptible 450ms transitions; ordinary controls 120ms; press scale .96; motion preference gates all animation. | Animations-panel replay at 10% speed not performed. No infinite animation or autoplay media, so pause controls are not applicable. |

## Findings corrected and rechecked

| Severity | Final source location | Finding / evidence | Correction and recheck |
| --- | --- | --- | --- |
| Medium | `web/src/v2.css:132` | At 850px, generated bright filaments extended beneath the last words of hero copy. This made contrast depend on the image. | Opaque `--page` copy surface; visually rechecked at 850px and final desktop/mobile captures. Named hero contrast pair 14.56:1. |
| Medium | `web/src/styles.css:470` and `web/src/v2.css:304` | Inherited 9–11px functional captions were too small for the more detailed v2 interface. | Raised inherited small captions to .75rem, retained 1rem inputs, expanded copy targets to 44px. Mobile rendering and automated scans pass. Decorative labels and dense table exceptions are documented in DESIGN.md. |
| Medium | `web/src/App.tsx:1` | Initial upgraded bundle was 685.60kB and loaded all page code together. | Lazy-loaded lab, library and Markdown; final entry is 442.90kB / 138.05kB gzip. All routes, subpath assets and downloads passed again. |
| Medium | `web/src/App.tsx:36` | Focusing a lazily rendered route heading was unreliable before it existed. | Focus the persistent main landmark on route change, retain a skip link and visible interactive focus. Keyboard journeys and focused slider inspected; main-only outline is suppressed. |
| High, task gap | `web/src/Laboratory.tsx:108`, `web/src/Library.tsx:84` | Experiments and imported research needed unmistakable boundaries from Ethereum state and fresh research. | Explicit persistent mode banners, frozen input provenance, inherited-date footnote, static endpoint declaration, exact reference comparison and JSON metadata. Mock RPC-failure and changing-epoch tests pass without any transaction. |
| Medium | `web/src/model.ts:1`, `web/tests/model.test.ts:7` | Floating-point approximations could differ from the immutable model’s rounding. | BigInt integer square roots and largest-remainder allocation; independent explicit matrix matches all 32 supplied vectors. Repeated/extreme-parameter checks conserve exactly 1,000,000 units. |

No unresolved primary interaction, overflow or automated accessibility failure was observed on the tested final export.

## Rendered evidence and limitations

`docs/v2/screenshots/` contains final real-RPC production captures: Observatory, laboratory and library at 1440 and 320px, plus focused and forced-colors lab views. `rendered-review.json` records zero JavaScript/local-resource errors and no overflow. Observatory captures may show the legitimate connecting state while RPC reads resolve. `docs/frontend/screenshots/` contains final full-page mocked-state Observatory 1440/390/320 and research 320 captures from the reproducible suite.

The assigned browser tool was used to inspect desktop, tablet and mobile pages during implementation. Its later attempts lost the shell preview and reported connection-refused/dynamic-import failures when that preview was unavailable. Those captures are not treated as a clean final run. Final screenshots were regenerated in a bounded foreground process that owned both the static subpath server and Chromium, then inspected locally. No failed or fabricated screenshot is submitted as evidence. Tool caches and superseded PNG packaging were removed; optimized runtime artwork and source assets remain complete.

Real paid transactions, wallet-extension/hardware-wallet interoperability, physical mobile wallets, native screen readers, native 200% browser zoom and a public hosting gateway after publication remain unverified. The existing injected/EIP-6963 wallet approach is retained; there is no configured WalletConnect connector. Solidity tests were not rerun because no contracts changed. Snapshot schema validation applies to trusted bundled data; the collector design explicitly requires stronger validation before accepting a remote feed.

## Completion and publication boundary

Implementation and local validation are complete for the website export. **Public publication is pending the existing IdentityMD publisher**: no hosting tool or credentials were supplied to this worker. `release.json` targets the same `qobs.site.identitymd.eth` name and records the previous version; it does not invent a new CID or claim an updated ENS record. The user’s full publish outcome is therefore not claimed as completed here. README documents the final publishing step and public smoke check.

Durable copies of the worker artifacts are stored in `docs/v2/` because the environment excludes `artifacts/` from Git via its existing `.git/info/exclude`. No ignore file or Git metadata was modified. The original named worker outputs remain available in `artifacts/`.
