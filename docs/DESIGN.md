# Quantum Observatory design

## Overview

Quantum Observatory is an interface for QOBS holders and readers exploring an eight-state classical model on Ethereum. The implemented direction is a quiet scientific notebook: an off-white canvas, dark green ink, serif introduction, restrained technical labels and a locally drawn orbital diagram. This is an implementation choice inferred from the product, not a requester-supplied brand specification.

The reusable hierarchy is: orientation, live-state status, epoch summary, observation/exchange controls, model context, deployed contract verification. Research is a separate hash view with the full bundled notes. The interface intentionally uses one light theme; it contains no theme toggle or alternate dark palette.

This document is under `docs/` because the assignment's overriding write budget excludes a repository-root `DESIGN.md`.

## Colors

Canonical source: `web/src/styles.css`, `:root`. Colors use hex primitives and role aliases; components consume the roles.

| Role | Primitive/value | Use |
| --- | --- | --- |
| `--page` | `--neutral-50`, `#f7f8f4` | Page and state tile background |
| `--surface` | `--neutral-0`, `#ffffff` | Panels, fields and secondary actions |
| `--surface-soft` | `--neutral-100`, `#eef0e9` | Notices, segmented controls, code blocks |
| `--ink` | `--neutral-900`, `#16251f` | Primary text, titles, line icon |
| `--muted` | `--neutral-500`, `#616b60` | Supporting copy, labels, metadata |
| `--line` | `--neutral-200`, `#dce1d7` | Structural divisions, inactive tiles |
| `--accent` | `--green-300`, `#c1e998` | Main connection/observation action fill |
| `--accent-ink` | `--green-800`, `#344c2c` | Selected radio, research links and display emphasis |
| `--selected` | `--green-100`, `#e4eed9` | Chosen state and network notice |
| `--bar` | `--green-500`, `#6b8654` | Probability marks and live indicator |
| `--error` | `--red-800`, `#9a3027` | Recoverable request/validation errors |
| `--focus` | `#365bc4` | Two-pixel focus perimeter |

Status always has text as well as color. Selected tiles have a native radio state, border and filled indicator. Disabled controls use native `disabled` plus 0.48 opacity; explanatory copy remains at normal contrast. Measured rendered text/background pairs are recorded in `docs/frontend/contrast.json`; the accessibility reports are adjacent. There are no gradients or image backgrounds underneath text.

## Typography

`web/src/styles.css` uses local system stacks: Arial / Helvetica / sans-serif for the interface; Georgia / Times New Roman / serif for the introduction; UI monospace / SFMono-Regular / Consolas for addresses, binary labels and code. No font request or font asset is needed. The browser selects available faces from these stacks; exact physical font availability varies by operating system.

- Base: 16px, regular 400, unitless 1.55 line height. Article text uses 1.7.
- Main heading: `clamp(2.6rem, 4.7vw, 4.2rem)`, 1.07 line height, −0.045em tracking; italic emphasis uses the serif face. Mobile overrides step to 3rem, 2.8rem and 2.5rem.
- Section title: 1.625rem, 1.2 line height, −0.035em; smaller responsive section titles use 1.4rem. Component headings use 1rem / 600.
- Interface copy: mostly 0.875rem. Metadata uses 0.625–0.8125rem, regular or semibold. Small display labels use uppercase via CSS with 0.13em tracking.
- Epoch metrics: 2rem / 500 (1.8rem and 1.75rem responsive). Numbers use `tabular-nums` on metrics, percentages and quote details.
- Long research content has a `74ch` measure. Headings balance; descriptions use `text-wrap: pretty`. Addresses and code wrap rather than hiding critical characters. Header wallet addresses are compact, with a full-address explorer accessible name, title and copy control.

Do not render base-unit token integers as amounts. Use `units` in `web/src/domain.ts` and decimals read from the contracts. All eight probabilities show four fractional percentage places, preserving the integer model's displayed precision.

## Layout

Shared source: the `base`, `layout`, `components` and `responsive` CSS layers in `web/src/styles.css`.

The outer content width is `--content:1280px`, centered. Desktop inline padding is 40px; it becomes 28px at 1100px, 20px at 580px and 16px at 360px. Most groups use 8px-based spacing: 12–16px within a control group, 24–32px between functional groups. Panel padding is 28px, then 22/20/16px as space narrows.

The desktop introduction has a 1.4:1 text/diagram split. The work area has a 1.9:1 observation/swap split, adapting to 1.6:1 at 1100px and a single column at 850px. State choices use four columns, switching to two below 580px. This keeps all eight choices visible without horizontal scrolling. At 850px the header navigation gets its own row; at 580px the decorative orbit is omitted, epoch metrics wrap, token tool fields stack and contract addresses wrap. Actions stay inside page/panel margins.

Research content remains in normal document flow. Code blocks use wrapping and `overflow-wrap:anywhere`, including at 320px. Nothing in the interface requires server-routed pages or a horizontal content carousel.

Observed automated viewports: 1440, 850, 768, 390 and 320 CSS pixels, plus research at 320px. Desktop text enlargement to 200% was checked separately from native browser zoom. See `responsive.json` for actual results.

## Elevation & Depth

This is a mostly flat interface. One-pixel borders group panels and separate data sections; tone establishes containment. The selected segment uses a restrained `0 1px 3px #16251f14` shadow. There are no dialogs, backdrops, floating panels, fixed headers or sticky footers. The first keyboard stop is a skip link that becomes visible above the page.

## Shapes

`--radius:12px` is the panel radius. Controls, state tiles and notices use 8px; tags use 5px, text-button focus areas 4px. Radio indicators are circles. The orbital diagram in `Orbit` is an inline SVG with shared stroke color; it is decorative and hidden from assistive technology. The favicon uses the same orbital geometry.

## Components

| Component/pattern | Source | Behavior and reuse |
| --- | --- | --- |
| `.primary`, `.secondary`, `.text-button` | `styles.css` | Primary connection/observation emphasis; neutral transaction and review actions; text actions for refresh/disconnect. All have visible keyboard focus. Touch actions aim for 44px; compact copy and utility actions are at least 30–36px. |
| `AddressLink` | `src/components.tsx` | Full or compact checksummed address, explorer link, copy button and polite copy feedback. `address`, `r`, optional `label` and `compact` props. |
| `TxFeedback` | `src/components.tsx` | Stable polite status region per action ID, transaction explorer link, explicit delayed-confirmation recheck. Errors persist near the action. |
| State selector | `src/App.tsx`, `.states` / `.state` | Native radio group; Space/arrow-key operation, selected indicator, textual probability/count. Loading uses dashes, never invented live values. A chosen state survives an incoming snapshot but resets on actual account/epoch changes. |
| Snapshot/status patterns | `src/App.tsx` | Block number, age, refresh, unavailable-state notice; transaction controls require a verified fresh snapshot matching the connected account. |
| `Swap` | `src/Swap.tsx` | Buy/sell pressed-button group, labeled amount and slippage inputs, quote details, explicit approval steps and expiration. Amount validation and recoverable errors stay adjacent; invalid fields regain focus. |
| `TokenTools` | `src/TokenTools.tsx` | Native `details` disclosure, labeled action/address/amount fields and a transaction review. Simulation precedes confirmation. |
| Research `.prose` | `src/App.tsx` | React Markdown renders the bundled source notes without enabling raw HTML. Heading levels are shifted below the page's single h1. External research links are descriptive and open separately. |

All page states share the same colors and component shapes. Motion is restricted to 120ms button background/press feedback and a 0.96 press scale, only under `prefers-reduced-motion:no-preference`. Forced-colors mode retains system-adjusted controls, uses `Highlight` for focus/selection, and exposes native radio controls. There are no loading spinners or entrance animations requiring timing to understand state.

## Do's and Don'ts

- Start another section with the existing page container, `.panel`, `.section-title` and semantic heading levels. Preserve document reading order as the layout stacks.
- Use the primary style for the next observation/connection action and secondary styling for advanced or exchange actions. Keep disabled reasons visible outside controls.
- Keep protocol behavior in the runtime/configuration, state and transaction modules. Never display an illustrative value as a live balance or probability.
- Retain token units, exact selected state, recipient/spender, minimum received and fee context before a consequential action. Do not add speculative dollar prices or quantum randomness claims.
- Extend the existing role tokens and plain CSS system when needed. Do not introduce another font download, color system, icon package or background animation for one section.
- New hash views should reuse header/footer and `AddressLink`/`TxFeedback` where appropriate; use a single page h1, a visible recovery path, and test the `/preview/` subpath at 320px.

Guidance attribution and licenses are preserved in `docs/frontend/BETTER-INTERFACE-LICENSE.txt` and `ETH-UX-LICENSE.txt`. This document adapts the pinned Impeccable documentation method to the actual final implementation.
