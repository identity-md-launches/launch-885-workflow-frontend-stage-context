# Frontend worker validation

Date: 2026-10-07. This records checks performed by this worker, not an independent network certification.

## Delivery status and scope

Frontend source, npm lockfile, static export, deployment manifest, model document, design documentation and validation evidence are complete within the permitted paths. Creating the requested commit is blocked by the workspace's read-only `.git`: `git add -- web dist docs` failed with `Unable to create .../.git/index.lock: Read-only file system`. No Git metadata was changed. The submission process must collect these files and create the commit.

The assignment's overriding write budget prohibits root `DESIGN.md`; the complete design document is at `docs/DESIGN.md`. All new files are under `web/`, `dist/` or `docs/`. `web/.gitignore` uses the explicit allowance for that exact path and excludes nested dependencies, caches and local test output. Original tracked contract sources, ABIs, Foundry configuration, remappings, libraries and root configuration are unchanged. The package budget check totals all existing reachable Git objects, all new file bytes and a 1 MiB metadata reserve without assuming compression; it remains below 8 MiB (see `integrity.json`). No submodule or dependency archive was introduced.

Scope: one observatory page, research hash view, injected/EIP-6963 wallets, engine observations/advancement, attested ETH/QOBS swaps, standard ERC-20 tools, deployed-address verification. The chosen visual direction is an inferred light scientific-notebook interface. No account login, price oracle, theme variants, mobile QR wallet service or hosting URL was supplied.

## Commands and outcomes

All commands run from `web/` unless noted.

| Check | Actual result |
| --- | --- |
| `npm install --cache /tmp/qobs-npm-cache` (frontend dependencies) | Installed lockfile dependencies; npm reported zero vulnerabilities. The initial attempt using the default read-only npm cache failed; rerunning with `/tmp` succeeded. |
| `npm run build` | Exit 0: TypeScript, Vite production build, ABI verification/copy and final manifest emission. Vite reports a nonfatal >500kB chunk advisory; largest JavaScript is about 666kB raw / 202kB gzip. |
| `npm run typecheck` | Exit 0 after final source/test changes. |
| `npm test` | Exit 0, 6 tests passed: amount/precision bounds, slippage, eligibility boundaries, allowance expiration/steps, both router tuple variants and canonical/path validation. |
| `BROWSER_LOW_RESOURCE=1 BROWSER_EXECUTABLE=/opt/imd-worker/local/imd-browser-tool/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser` | Exit 0, 13 tests passed in 56.9 seconds on the final export. Full report: `browser-results.json`. |
| `npm run verify` | Exit 0: 8 inventoried assets, 715,035 bytes excluding the manifest; all pinned ABIs and deployment bindings match. Entire export including manifest: 718,557 bytes. |
| `npm run check:live` | Exit 0, read-only Ethereum RPC verification; full snapshot and pool check in `live-read.json`. No signing or broadcast. |
| Independent Python integrity/path check from repository root | Supplied `.imd` handoff/network equal preserved build inputs; exact manifest keys, contract set, network, poolKey, identifiers, all final asset hashes and complete file inventory checked. Pinned model bytes match. No pre-existing tracked file changed. `integrity.json` records the result. |

The standard multiprocess Chromium runner initially exceeded the worker's process/thread limit. A low-resource launch was used, with a fresh single-process browser per test to avoid Chromium's context-reuse failure. Test-helper locator ambiguity and loading timing were corrected, and the entire suite reran successfully. The initial tool-managed preview file was absent; the included foreground `preview:subpath` server served only `dist/` under `/preview/` for both the assigned browser and the test runner.

## Browser and interaction evidence

The assigned browser tool opened the real export at `http://127.0.0.1:4173/preview/`. Rendered desktop (1440px) and narrow mobile (320px) screenshots were inspected with live public RPC reads, including missing-wallet recovery and the live pool-unavailable message. No horizontal overflow was observed. Final exported-app screenshots from the reproducible mock suite were also visually inspected.

The 13 browser scenarios exercise:

1. Disconnected actions, missing browser-wallet recovery and all ten bundled research links/equations.
2. Wallet rejection/retry; wrong network; exact `wallet_addEthereumChain` data and switch retry after 4902.
3. Keyboard state choice, observation simulation, wallet rejection/retry, one confirmed transaction and duplicate prevention.
4. Insufficient QOBS, full epoch, expiry and confirmed epoch advancement.
5. ABI-decoded observation simulation revert; no transaction submitted.
6. Native buy; exact router, attested hook/fee, V4 actions, minimum output, deadline and ETH value decoded from transaction calldata.
7. Token sale with separately confirmed exact-amount ERC-20 and Permit2 approvals; configured spender addresses; swap with zero native value.
8. Invalid amount and slippage, quote expiration and router simulation revert with no broadcast.
9. Account and network events invalidating eligibility/quotes.
10. Invalid recipient, transfer review/confirmation, allowance revocation and delegated transfer controls.
11. Missing deployed code, RPC failure/recovery and tampered ABI hash blocking actions.
12. Radio keyboard navigation, responsive reflow, research layout, reduced motion, text enlargement and automated accessibility.
13. Pending transaction interlock, no duplicate sends, delayed-confirmation recovery through a status check rather than resending.

All wallet submissions and transaction RPCs in these tests are intercepted mocks. They prove frontend behavior and calldata construction, not that a real wallet or current pool will execute a funded swap.

Screenshots, all from the production export with mocked state:

- `screenshots/observatory-1440.png`: desktop, connected state and visible radio focus.
- `screenshots/observatory-390.png`: mobile reading/interaction order.
- `screenshots/observatory-320.png`: minimum-width reflow and wrapped contract addresses.
- `screenshots/research-320.png`: complete rendered research content, wrapped equations and bibliography.
- `screenshots/research-viewport-320.png`: assigned-browser viewport inspection of the research introduction, using the actual bundled notes.

Additional tested widths: 850 and 768px. `responsive.json` records no horizontal overflow at 1440/850/768/390/320, no page JavaScript errors or failed resource requests in the happy-path accessibility scenario, and 200% text enlargement at 1440px without overflow. This is text enlargement, not a native browser zoom session. Reduced-motion computed transitions are zero.

## Better Interface consolidated review

Read and applied the pinned workflow and core principles for all six domains, plus relevant focus/forms, responsive layout and documentation guidance. Licenses and attribution are preserved. “Checked” is scoped to the evidence below, not a claim of complete accessibility conformance.

| Domain | Coverage and result | Unperformed / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Native landmarks, labels, radio/fieldset semantics, keyboard arrows/Space, skip link, visible focus, action explanations, persistent live regions, input recovery. Axe scans on the observatory and research view report zero WCAG A/AA violations; see `axe-observatory.json` and `axe-research.json`. | No native screen-reader session, physical touch device, hardware wallet or Windows high-contrast visual inspection. No modal is present, so focus trapping is not applicable. |
| Layout — Checked | Desktop/two-column and single-column mobile states inspected; no overflow across five widths; research equations wrap at 320px; enlarged text remains in flow. Header and addresses wrap; controls are inset. | Native 200% browser zoom and an RTL/localized edition were not tested. Only English is delivered. |
| Writing — Checked | Labels name actions and distinguish observing, advancing, approving and swapping. Recovery text covers wallet absence/rejection, RPC failure, expiry and missing liquidity. Classical/deterministic limits and lack of USD data are visible. | No separate localization review. |
| Typography — Checked | Real rendered heading/body hierarchy, percentages, addresses and equations inspected. Tabular numbers and complete copyable addresses; local font stacks and bounded article measure. | OS-specific fallback fonts and native mobile text settings were not independently tested. |
| Colors — Checked | Opaque rendered pairs measured, recorded in `contrast.json`; text ratios range from 5.56:1 to 15.93:1 for the five sampled pairs. Axe checks additional visible text contrast. Statuses have text/shape cues. | No dark theme exists. Disabled-control contrast is not claimed to meet active-text thresholds. Every possible forced-color/background pairing was not measured. |
| UI details — Checked | Selected, focused, disabled, loading, approval, pending, success and error states exercised. One component system, flat bordered panels, no decorative entrance animation; reduced-motion disables press transitions. | No Animations-panel 10%-speed review; there are only brief button interactions. No overlays, drag gestures or hover-only information. |

### Findings, corrections and rechecks

| Severity / location | Finding and impact | Fix and evidence |
| --- | --- | --- |
| High — `web/src/App.tsx:32` | Selecting a state while a newly connected wallet snapshot loaded could clear the choice when the snapshot arrived. The observation browser test caught the disabled submission. | Track actual epoch changes separately from temporary missing data; reset for an account change or a different known epoch. Observation and keyboard tests pass. |
| High — `web/src/state.ts:195`, `web/src/transactions.ts:68` | Source review found that a receipt-triggered refresh could return early behind an in-flight poll, releasing the signing lock before a post-receipt read. | Forced refresh waits for the in-flight read, then requests a new snapshot before unlocking. Confirmation, duplicate prevention and delayed-receipt tests pass. |
| High — `web/src/App.tsx:62`, `web/src/transactions.ts:31` | A cached snapshot from another account must never establish new-account eligibility. | Both UI and signing preflight bind the snapshot to the connected account; account/network change tests pass. |
| Medium — `web/src/Swap.tsx:63` | The disconnected swap balance displayed zero even though no account had been queried. | Display an unknown balance until connected; inspect final loading/disconnected state and test connection flows. |
| Medium — `web/src/Swap.tsx:164`, `web/src/TokenTools.tsx:81` | Invalid form submissions announced an error but did not direct keyboard focus back to the relevant field. | Focus amount/slippage/address/owner fields as appropriate after validation; invalid amount/address browser flows rechecked. |
| Medium — `web/src/Swap.tsx:117` | Multiplying decimal slippage by 100 could reject valid values such as 0.29% because of floating-point representation. | Parse the percentage as exact two-decimal integer units; regression assertion verifies 29 basis points and the exact minimum output. |
| Build blocker — `web/src/styles.css` responsive section | An extra closing parenthesis in the first draft prevented CSS minification. | Removed the malformed duplicate rule. Final production builds and five-width browser checks pass. |

No unresolved rendered blocker was observed in the reviewed scope. Small metadata type is deliberately dense; the 200% text-enlargement check provides a readable enlargement path. Scope limitations remain as listed above.

## Live chain observation and limits

At block **26,139,151**, read-only checks returned chain ID **1**, nonempty LaunchToken code (1,722 bytes), nonempty QuantumEngine code (4,789 bytes), and the engine's token reference matched the handoff. Epoch was 1, observations 0, all eight probabilities 125,000 / 1,000,000; total supply was 1,000,000,000 QOBS with 18 decimals.

The exact attested pool ID is in `live-read.json`. Its slot0 is initialized and reports fee 12,500, but active liquidity returned **0**. The frontend therefore displays “The attested pool has no active liquidity. Swaps are unavailable” and offers a retry. Mock validation covers active-pool execution flows; **no live quote, approval, paid observation, advancement, token transfer or swap was broadcast**. Live balances were not queried for a visitor account. This is not a claim of byte-for-byte runtime-code attestation, protocol audit or executable pool liquidity.

No site publishing, IPFS pinning, naming, deployment, ENS resolution or social-image URL verification was performed. Publication checks remain the control plane's responsibility and were not used as a substitute for worker browser tests.

## Completion

Source/export/design/evidence: complete for the assigned frontend scope. Git commit creation: blocked solely by read-only repository metadata; files remain ready for collection. The design-document path follows the overriding write restriction. Unfunded live-chain transaction behavior, real-wallet extension compatibility and the accessibility/device checks identified above remain untested.
