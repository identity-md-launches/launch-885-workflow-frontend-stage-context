import { test as base, expect, chromium } from "@playwright/test";
// A fresh process per test avoids Chromium single-process context reuse failures
// on constrained workers; ordinary local runs use the standard Playwright fixture.
const test = process.env.BROWSER_LOW_RESOURCE
  ? base.extend({
      page: async ({ baseURL, launchOptions }, use) => {
        const browser = await chromium.launch(launchOptions);
        const context = await browser.newContext({
          baseURL,
          viewport: { width: 1440, height: 1000 },
        });
        try {
          await use(await context.newPage());
        } finally {
          await browser.close();
        }
      },
    })
  : base;
import AxeBuilder from "@axe-core/playwright";
import {
  decodeAbiParameters,
  decodeFunctionData,
  parseAbiParameters,
} from "viem";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  setup,
  open,
  connect,
  engineAbi,
  tokenAbi,
  secondAccount,
} from "./mock";
import { poolTuple, routerAbi } from "../src/protocol";
const manifest = JSON.parse(
  readFileSync("../dist/imd-deployment.json", "utf8"),
);
test("disconnected, missing wallet and static research content", async ({
  page,
}) => {
  await setup(page, { wallet: false });
  await open(page);
  await expect(
    page.getByRole("button", { name: "Advance epoch", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Get quote", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await expect(page.locator(".wallet-message")).toContainText(
    "No browser wallet found",
  );
  await page.getByRole("link", { name: "The model", exact: true }).click();
  await expect(page.locator(".prose")).toContainText(
    "Approximations and unknowns",
  );
  await expect(
    page.locator('.prose a[href^="https://arxiv.org/pdf/"]'),
  ).toHaveCount(10);
  expect(await page.locator(".prose").innerText()).toContain(
    "a_j = floor(sqrt(P_j * S))",
  );
});
test("wallet rejection is recoverable and unknown chain is added exactly", async ({
  page,
}) => {
  await setup(page, { wrongChain: true });
  await open(page);
  await page.evaluate(() => {
    (window as any).mockWallet.reject = true;
  });
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await expect(page.locator(".wallet-message")).toContainText("declined");
  await page.evaluate(() => {
    (window as any).mockWallet.reject = false;
    (window as any).mockWallet.unknownChain = true;
  });
  await connect(page);
  await page.getByRole("radio", { name: "State 3", exact: true }).check();
  await expect(
    page.getByRole("button", { name: "Submit observation" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Switch to Ethereum" }).click();
  await expect(
    page.getByRole("button", { name: "Submit observation" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => (window as any).addedChain)).toEqual(
    manifest.walletAddChain,
  );
  expect(await page.evaluate(() => (window as any).mockWallet.switches)).toBe(
    2,
  );
});
test("observe simulates, handles rejection, confirms once and blocks duplicates", async ({
  page,
}) => {
  const model = await setup(page);
  await open(page);
  await connect(page);
  const radio = page.getByRole("radio", { name: "State 4", exact: true });
  await radio.focus();
  await page.keyboard.press("Space");
  const submit = page.getByRole("button", { name: "Submit observation" });
  await expect(submit).toBeEnabled();
  await page.evaluate(() => {
    (window as any).mockWallet.reject = true;
  });
  await submit.click();
  await expect(page.locator("#observe .tx-feedback").first()).toContainText(
    "declined",
  );
  await expect(submit).toBeEnabled();
  await page.evaluate(() => {
    (window as any).mockWallet.reject = false;
  });
  await submit.click();
  await expect(page.locator("#observe .tx-feedback").first()).toContainText(
    "Confirmed",
  );
  await expect(submit).toBeDisabled();
  expect(model.sendCount).toBe(1);
  expect(
    decodeFunctionData({ abi: engineAbi, data: model.txs[0].data }).args,
  ).toEqual([4]);
  await expect(
    page.getByText("Observation recorded. Come back next epoch.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("eligibility: low balance, capacity, expiry and advance epoch", async ({
  page,
}) => {
  const m = await setup(page);
  m.balance = 0n;
  await open(page);
  await connect(page);
  await page.getByRole("radio", { name: "State 0", exact: true }).check();
  await expect(page.locator("#observe-reason")).toHaveText(
    "Hold at least 1 QOBS to submit an observation.",
  );
  m.balance = 10n ** 18n;
  m.count = 1024;
  await page.getByRole("button", { name: "Refresh state" }).click();
  await expect(page.locator("#observe-reason")).toContainText("full");
  m.end = m.now;
  await page.getByRole("button", { name: "Refresh state" }).click();
  await expect(
    page.getByRole("button", { name: "Advance epoch", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Advance epoch", exact: true })
    .click();
  await expect(page.locator("#observe .tx-feedback").last()).toContainText(
    "Confirmed",
  );
  expect(m.epoch).toBe(2n);
  expect(m.count).toBe(0);
  await expect(
    page.getByRole("button", { name: "Advance epoch", exact: true }),
  ).toBeDisabled();
});
test("simulation reverts never request a wallet transaction", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await connect(page);
  await page.getByRole("radio", { name: "State 2", exact: true }).check();
  m.revertObserve = true;
  await page.getByRole("button", { name: "Submit observation" }).click();
  await expect(page.locator("#observe .tx-feedback").first()).toContainText(
    "already observed",
  );
  expect(m.sendCount).toBe(0);
});
test("native buy uses attested pool, minimum output, deadline and native value", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await connect(page);
  await page.getByLabel("You pay").fill("0.01");
  await page.getByRole("button", { name: "Get quote", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm swap", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Approve ETH to Permit2" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Confirm swap", exact: true }).click();
  await expect(page.locator("#swap .tx-feedback").last()).toContainText(
    "Confirmed",
  );
  expect(m.sendCount).toBe(1);
  expect(m.txs[0].to.toLowerCase()).toBe(
    manifest.network.uniswapV4.universalRouter,
  );
  expect(BigInt(m.txs[0].value)).toBe(10n ** 16n);
  const fn = decodeFunctionData({ abi: routerAbi, data: m.txs[0].data });
  const [commands, inputs, deadline] = fn.args!;
  expect(commands).toBe("0x10");
  expect(deadline).toBeGreaterThan(BigInt(Math.floor(Date.now() / 1000)));
  const [actions, params] = decodeAbiParameters(
    parseAbiParameters("bytes,bytes[]"),
    inputs[0],
  );
  expect(actions).toBe("0x060c0f");
  const [swap] = decodeAbiParameters(
    parseAbiParameters(
      `(${poolTuple} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)`,
    ),
    params[0],
  );
  expect(swap.poolKey.hooks.toLowerCase()).toBe(manifest.poolKey.hooks);
  expect(swap.poolKey.fee).toBe(12500);
  expect(swap.amountOutMinimum).toBe(199n * 10n ** 17n);
  expect(swap.zeroForOne).toBe(true);
});
test("sell performs token and Permit2 approvals as separate confirmed steps", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await connect(page);
  await page.getByRole("button", { name: "Sell QOBS", exact: true }).click();
  await page.getByLabel("You pay").fill("2");
  const quote = () =>
    page.getByRole("button", { name: "Get quote", exact: true }).click();
  await quote();
  await page
    .getByRole("button", { name: "Approve QOBS to Permit2", exact: true })
    .click();
  await expect(page.locator("#swap .tx-feedback").first()).toContainText(
    "Confirmed",
  );
  expect(m.allowance).toBe(2n * 10n ** 18n);
  await quote();
  await page
    .getByRole("button", { name: "Approve router in Permit2", exact: true })
    .click();
  await expect(page.locator("#swap .tx-feedback").nth(1)).toContainText(
    "Confirmed",
  );
  expect(m.permit).toBe(2n * 10n ** 18n);
  await quote();
  await page.getByRole("button", { name: "Confirm swap", exact: true }).click();
  await expect(page.locator("#swap .tx-feedback").last()).toContainText(
    "Confirmed",
  );
  expect(m.txs.map((t) => t.to.toLowerCase())).toEqual([
    manifest.contracts[0].address,
    manifest.network.uniswapV4.permit2,
    manifest.network.uniswapV4.universalRouter,
  ]);
  expect(BigInt(m.txs[2].value ?? 0)).toBe(0n);
});
test("invalid amount, slippage, expired quote and router revert fail safely", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await connect(page);
  await page.getByLabel("You pay").fill("1e6");
  await page.getByRole("button", { name: "Get quote", exact: true }).click();
  await expect(page.locator("#swap-error")).toContainText("digits");
  await page.getByLabel("You pay").fill("0.01");
  await page.getByLabel("Slippage tolerance").fill("90");
  await page.getByRole("button", { name: "Get quote", exact: true }).click();
  await expect(page.locator("#swap-error")).toContainText("0.1% and 5%");
  await page.getByLabel("Slippage tolerance").fill("0.5");
  await page.getByRole("button", { name: "Get quote", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm swap", exact: true }),
  ).toBeEnabled();
  await page.clock.install();
  await page.clock.fastForward(31000);
  await expect(
    page.getByRole("button", { name: "Confirm swap", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Quote expired. Refresh it before continuing.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Get quote", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm swap", exact: true }),
  ).toBeVisible();
  m.swapRevert = true;
  await page.getByRole("button", { name: "Confirm swap", exact: true }).click();
  await expect(page.locator("#swap .tx-feedback").last()).toContainText(
    "deadline passed",
  );
  expect(m.sendCount).toBe(0);
});
test("account and network changes invalidate eligibility and quotes", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await connect(page);
  await page.getByLabel("You pay").fill("0.1");
  await page.getByRole("button", { name: "Get quote", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm swap", exact: true }),
  ).toBeEnabled();
  m.balance = 0n;
  await page.evaluate(
    (account) => (window as any).emitWallet("accountsChanged", [account]),
    secondAccount,
  );
  await expect(
    page.getByRole("button", { name: "Confirm swap", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("#observe-reason")).toContainText("Hold at least");
  await page.evaluate(() => (window as any).emitWallet("chainChanged", "0x2"));
  await expect(
    page.getByRole("button", { name: "Switch to Ethereum" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get quote", exact: true }),
  ).toBeDisabled();
});
test("token transfer, allowance revoke, and delegated transfer have review controls", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await connect(page);
  await page.locator("#token-tools summary").click();
  await page.getByLabel("Recipient address").fill("bad");
  await page.getByLabel("Amount (QOBS)", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Review token action" }).click();
  await expect(page.locator("#token-error")).toContainText("complete");
  await page.getByLabel("Recipient address").fill(secondAccount);
  await page.getByRole("button", { name: "Review token action" }).click();
  await expect(page.locator(".review")).toContainText("cannot be reversed");
  await page
    .getByRole("button", { name: "Confirm transfer", exact: true })
    .click();
  await expect(page.locator("#token-tools .tx-feedback")).toContainText(
    "Confirmed",
  );
  await page.getByLabel("Action", { exact: true }).selectOption("approve");
  await page.getByLabel("Amount (QOBS)").fill("0");
  await page.getByRole("button", { name: "Review token action" }).click();
  await page.getByRole("button", { name: "Confirm allowance" }).click();
  await expect(page.locator(".review")).toHaveCount(0);
  await page.getByLabel("Action", { exact: true }).selectOption("transferFrom");
  await page.getByLabel("Token owner address").fill(secondAccount);
  await page.getByLabel("Amount (QOBS)").fill("1");
  await page.getByRole("button", { name: "Review token action" }).click();
  await page
    .getByRole("button", { name: "Confirm transfer", exact: true })
    .click();
  await expect(page.locator(".review")).toHaveCount(0);
  expect(
    m.txs.map(
      (t) => decodeFunctionData({ abi: tokenAbi, data: t.data }).functionName,
    ),
  ).toEqual(["transfer", "approve", "transferFrom"]);
});
test("missing code and invalid ABI prevent actions; network errors recover", async ({
  page,
}) => {
  const m = await setup(page, { noCode: true });
  await page.goto("./");
  await expect(page.getByText(/deployed contract has no code/)).toBeVisible();
  await connect(page, false);
  await expect(
    page.getByRole("button", { name: "Get quote", exact: true }),
  ).toBeDisabled();
  m.noCode = false;
  await page.getByRole("button", { name: "Refresh state" }).click();
  await expect(
    page.getByText("Live on Ethereum", { exact: true }),
  ).toBeVisible();
  m.failRead = true;
  await page.getByRole("button", { name: "Refresh state" }).click();
  await expect(
    page.getByText("State unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get quote", exact: true }),
  ).toBeDisabled();
  m.failRead = false;
  await page.getByRole("button", { name: "Refresh state" }).click();
  await expect(
    page.getByText("Live on Ethereum", { exact: true }),
  ).toBeVisible();
  await page.route("**/abi/QuantumEngine.json", (route) =>
    route.fulfill({ contentType: "application/json", body: "[]" }),
  );
  await page.reload();
  await expect(
    page.getByText(
      "ABI verification failed for QuantumEngine. Transactions are disabled.",
      { exact: true },
    ),
  ).toBeVisible();
});
test("responsive, keyboard, research reflow and automated accessibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failures: string[] = [];
  page.on("requestfailed", (r) => failures.push(r.url()));
  await setup(page);
  await open(page);
  await connect(page);
  await page.getByRole("radio", { name: "State 1", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "State 2", exact: true }),
  ).toBeChecked();
  const evidence: any[] = [];
  mkdirSync("../docs/frontend/screenshots", { recursive: true });
  for (const width of [1440, 850, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    evidence.push({ width, overflow: false });
    if (width === 1440 || width === 390 || width === 320)
      await page.screenshot({
        path: `../docs/frontend/screenshots/observatory-${width}.png`,
        fullPage: true,
      });
  }
  const contrast = await page.evaluate(() => {
    const rgb = (c: string) =>
      (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (c: string) =>
      rgb(c)
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    return [
      ".observation-panel h2",
      ".observation-panel > .muted",
      ".state.selected .probability",
      ".primary",
      ".intro h1 em",
    ].map((selector) => {
      const el = document.querySelector(selector)!;
      const foreground = getComputedStyle(el).color;
      let parent: Element | null = el;
      let background = "";
      while (parent) {
        background = getComputedStyle(parent).backgroundColor;
        if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent")
          break;
        parent = parent.parentElement;
      }
      const a = luminance(foreground),
        b = luminance(background);
      return {
        selector,
        foreground,
        background,
        ratio: Number(
          ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2),
        ),
      };
    });
  });
  writeFileSync(
    "../docs/frontend/contrast.json",
    JSON.stringify(contrast, null, 2),
  );
  expect(contrast.every((pair) => pair.ratio >= 4.5)).toBe(true);
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  writeFileSync(
    "../docs/frontend/axe-observatory.json",
    JSON.stringify(
      {
        violations: results.violations,
        passes: results.passes.map((x) => x.id),
      },
      null,
      2,
    ),
  );
  expect(results.violations).toEqual([]);
  await page.getByRole("link", { name: "The model", exact: true }).click();
  await expect(page.locator(".prose")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  writeFileSync(
    "../docs/frontend/axe-research.json",
    JSON.stringify(
      {
        violations: results.violations,
        passes: results.passes.map((x) => x.id),
      },
      null,
      2,
    ),
  );
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: "../docs/frontend/screenshots/research-320.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "Return to the observatory" }).click();
  expect(
    await page
      .locator(".primary")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe("0s");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  writeFileSync(
    "../docs/frontend/responsive.json",
    JSON.stringify(
      {
        viewports: evidence,
        textResize: "200% at 1440: no overflow",
        nativeZoom: "not tested",
        pageErrors: errors,
        failedRequests: failures,
      },
      null,
      2,
    ),
  );
});

test("pending receipt keeps writes locked until confirmation and prevents duplicate sends", async ({
  page,
}) => {
  const m = await setup(page);
  m.rejectReceipt = true;
  await open(page);
  await connect(page);
  await page.getByRole("radio", { name: "State 1", exact: true }).check();
  await page.getByRole("button", { name: "Submit observation" }).click();
  await expect(page.locator("#observe .tx-feedback").first()).toContainText(
    "Waiting for confirmation",
  );
  await expect(
    page.getByRole("button", { name: "Submitting observation" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Get quote", exact: true }),
  ).toBeDisabled();
  expect(m.sendCount).toBe(1);
  await page.clock.install();
  await page.clock.fastForward(121000);
  await expect(
    page.getByRole("button", { name: "Check pending transaction" }),
  ).toBeVisible({ timeout: 20000 });
  m.rejectReceipt = false;
  await page.getByRole("button", { name: "Check pending transaction" }).click();
  await expect(page.locator("#observe .tx-feedback").first()).toContainText(
    "Confirmed",
    { timeout: 15000 },
  );
  expect(m.sendCount).toBe(1);
});
