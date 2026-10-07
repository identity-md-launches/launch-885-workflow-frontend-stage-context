# Quantum Observatory v2 design

## Overview

QOBS serves people exploring a classical quantum-inspired model and participants interacting with the existing Ethereum engine. The v2 interface uses a dark forest background, pale mint accents, large editorial headings, original interference artwork and quieter numerical workspaces. This direction was inferred from the assignment, not an existing brand approval.

The live Observatory, browser Model lab, Learning library and complete Model notes are separate hash views. Keep live state, locally calculated results and static research clearly labeled. The inherited wallet and transaction components remain the interaction foundation.

## Colors

The final source of truth is `web/src/v2.css`, loaded after the established layered `web/src/styles.css`. Unlayered v2 rules override the old light-theme values. There is one implemented dark appearance, no theme toggle.

| Semantic token | Effective value | Role |
| --- | --- | --- |
| `--page` | `#080f0d` | Page, state wells and solid hero copy backdrop |
| `--surface` | `#101b16` | Main panels and source cards |
| `--surface-soft` | `#17251d` | Notices, segmented wells, secondary header action |
| `--ink` | `#f0f4f0` | Primary text |
| `--muted` | `#b2beb6` | Supporting text |
| `--line` | `#26392f` | Quiet structural separators |
| `--control-border` | `#60776a` | Inputs, buttons and selectable tiles |
| `--accent`, `--accent-ink` | `#b7edb5` | Main action, links, heading emphasis |
| `--on-accent` | `#101e15` | Text on mint actions |
| `--selected` | `#172e24` | Selected tiles and segments |
| `--bar` | `#83bd8f` | Live probability bars |
| `--baseline` | `#9eadbd` | Browser reference-series bars |
| `--experiment` | `#b7edb5` | Browser experiment bars |
| `--error` | `#ffb4aa` | Recoverable errors |
| `--focus` | `#c8d8ff` | Two-pixel focus ring, four-pixel offset |

Use semantic aliases in components. Both chart series have text labels and an exact numerical table; state selection has a native radio and a border in addition to color. The connected indicator always has a textual status. Disabled controls retain explanatory text. Measured rendered contrast is in `docs/frontend/contrast.json`; it is not a blanket claim about every pixel.

## Typography

No fonts are downloaded. The UI uses `"Avenir Next", "Segoe UI", Arial, sans-serif`; italic heading emphasis uses `Georgia, "Times New Roman", serif`. System monospace is used for code, addresses and binary labels. OS-installed faces vary; the exact installed face is not certified by the computed stack.

Base type is 16px, weight 400, line height 1.55. Prose is 1rem with 1.7 line height and a 74ch maximum measure. Headings balance, short descriptions wrap prettily, addresses/hashes wrap anywhere, and data uses tabular numerals. Weights are 400, 500 and 600; required italic emphasis remains distinct with system fallback.

The Observatory heading is `clamp(3rem, 4.9vw, 4.65rem)`, line height 1.04 and tracking −0.05em. It becomes 3.5rem below 950px, `clamp(2.65rem,10.8vw,3.75rem)` below 580px and 2.8rem below 360px. Other page headings use `clamp(2.6rem,4.3vw,4.1rem)`, then 2.6rem/2.2rem. Section headings are generally 1.5rem; paragraph-level headings 1rem/600. Smaller section-specific headings remain subordinate.

Body UI copy is .875–1rem; control labels .8125–.875rem; numerical cells .8125rem; normal metadata .75rem. Decorative hero annotations and narrow chart binary labels use .625rem. At 320px the exact results table uses .7rem to keep all four columns visible. Form input text remains at least 1rem. Main metrics use 2.25rem, reducing to 1.85rem on mobile.

## Layout

Reuse the inherited centered header/main/footer frame, with `--content:1440px`. Inline gutters are 40px on desktop, 28px below 1100px, 20px below 580px and 16px below 360px. Spacing is primarily 8/12/16/20/24/28/32/40/56px; separate groups have more space than their internal controls. Panels use 28px padding, then 22px below 1200px, 20px below 580px and 16px below 360px.

At desktop, the hero copy and artwork share a wide composition; copy has an opaque backdrop. Below 580px the artwork becomes a 275px-high block after the copy. It stays visible on mobile. Header navigation wraps to its own row below 950px. Wallet controls remain in the first row and can wrap when connected.

The live workspace uses a flexible observation panel plus a 335px swap panel (310px below 1200px); it stacks below 950px. State choices use four columns, then two below 580px. The lab uses .8fr/1.2fr controls/results columns (.85fr/1.15fr below 1200px), stacking below 950px. Library cards use two columns, then one below 580px. Provenance labels stack above their values at that breakpoint. The lab illustration and future-proposal blocks also stack. See the validation record for actually tested widths and text enlargement.

## Elevation & Depth

Panels are flat tonal surfaces with structural borders. Image outlines use translucent white `#ffffff1a`. The hero's photographic glow is artwork, not live model output. The hero establishes an isolated stacking context: artwork behind, opaque copy above. There are no modals, floating menus, backdrop blurs or persistent overlays in the shipped UI.

## Shapes

Panels use a 12px radius; source cards and large field illustrations 10px; inputs, state choices and notices 8px; link buttons 7px; small version labels 4px. Charts have 3px upper bar corners. Native range controls retain platform interaction and mint accent color. Decorative arrows and the existing orbital brand SVG use the established visual language.

## Components

- `App.tsx`: hash navigation, wallet controls, live epoch metrics, eight native radio choices, observation and advancement. `aria-current` marks the current page. Hash navigation restores focus to the main landmark; the skip link targets it. Loading, RPC failure, stale snapshots and wrong-chain states remain explicit.
- `Swap.tsx`, `TokenTools.tsx`, `transactions.ts`, `wallet.ts`: existing review/simulation/signature/receipt flows, shared transaction lock, amount/recipient validation, exact approvals and recovery. Use these components rather than constructing independent wallet flows.
- `Laboratory.tsx` and `model.ts`: native sliders/selects, frozen input provenance, grouped reference/experiment bars, exact captioned table, total variation distance, reset/preset/export controls and a persistent status region. No transaction functions are imported into the numerical model.
- `Library.tsx`: static mode banner, snapshot summary/download, labeled search and topic filter, source cards with native details disclosure, empty-result recovery, provenance and limitations. Data is bundled under `web/public/research/`.
- `.primary`: mint fill with dark ink. The header's connection action is intentionally neutral so the principal page action dominates. `.secondary` is a bordered neutral action; `.text-button` and text links are underlined; `.link-button` supports navigation styled as an action.
- `AddressLink` and `TxFeedback` in `components.tsx`: preserve full-address copy/explorer access, readable transaction feedback and explorer receipts. Touch copy controls are 44px.

State controls and buttons have focus, selection, disabled and hover treatments. Hover effects are pointer-gated. Motion is enabled only under `prefers-reduced-motion: no-preference`: 450ms interruptible height/transform transitions for probability changes, 120ms controls, and .96 press scale. No infinite or automatically playing animation needs a pause control. Reduced-motion charts retain exact values with zero-duration transitions. Forced colors uses system Highlight for selection/focus and distinct chart bars.

Artwork lives in `web/public/art/`. The hero has 720/1440px WebP variants, explicit dimensions, responsive `srcSet` and high fetch priority. Interference images have 480/960px variants and load lazily with async decoding. View chunks and Markdown rendering load on demand. Generation prompts and asset provenance are in `docs/v2/artwork.md`.

## Do's and Don'ts

Use the centered frame, `.page-heading`, `.panel` and semantic tokens for another view. Give it a hash route, a single h1, labeled controls and explicit mode/provenance. Reuse native disclosure and table patterns. Verify 320px reflow, keyboard behavior and reduced motion before extending it.

Never label browser output as live state, research background as empirical validation, or decorative artwork as a measurement. Do not place readable copy over bright image pixels. Keep the full values behind compact wallet labels accessible. Preserve the existing immutable deployment and transaction gates. Do not imply rewards, a running collector or automatic profit.

Design guidance: Jakub Krehel’s Better Interface (MIT), pinned `267330e1adfc66a718fb65fa6918c1f06d0a689e`; documentation method: Paul Bakaus / Impeccable (Apache-2.0), pinned `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. Full notices are retained in `docs/frontend/BETTER-INTERFACE-LICENSE.txt`.
