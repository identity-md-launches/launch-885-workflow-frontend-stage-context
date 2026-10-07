import { test as base, expect, chromium } from "@playwright/test";
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
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { setup, open } from "./mock";

test("lab compares fixed baseline, responds to keyboard, resets and exports provenance", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await page.getByRole("link", { name: "Model lab", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Change a parameter",
  );
  await expect(page.getByTestId("distance")).toHaveText("0.0000%");
  await expect(page.locator("tbody tr").first()).toContainText("78.1250%");
  await page.getByLabel("Uniform mixing").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Uniform mixing")).toHaveValue("26");
  await expect(page.getByTestId("distance")).not.toHaveText("0.0000%");
  await page.getByRole("button", { name: "Try stronger feedback" }).click();
  await expect(page.getByLabel("Observation feedback")).toHaveValue("50");
  const downloadWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export experiment JSON" }).click();
  const download = await downloadWait;
  const data = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(data.mode).toBe("browser-experiment");
  expect(data.parameters).toEqual({ noise: 10, feedback: 50, steps: 1 });
  expect(data.baselineParameters).toEqual({ noise: 25, feedback: 25 });
  expect(data.candidate.reduce((a: number, b: number) => a + b, 0)).toBe(
    1000000,
  );
  await page.getByRole("button", { name: "Reset experiment" }).click();
  await expect(page.getByTestId("distance")).toHaveText("0.0000%");
  expect(m.sendCount).toBe(0);
});

test("live input is explicitly copied and remains frozen while Ethereum changes", async ({
  page,
}) => {
  const m = await setup(page);
  await open(page);
  await page.getByRole("link", { name: "Model lab", exact: true }).click();
  await page.getByRole("button", { name: "Copy live state as input" }).click();
  await expect(page.locator(".input-provenance")).toContainText(
    "Ethereum block",
  );
  await expect(page.locator(".lab-status")).toContainText("frozen input");
  const provenance = await page.locator(".input-provenance").textContent();
  m.epoch = 15n;
  await page.waitForTimeout(5500);
  expect(await page.locator(".input-provenance").textContent()).toBe(
    provenance,
  );
  expect(m.sendCount).toBe(0);
});

test("static library searches, filters, recovers from empty results and downloads snapshot", async ({
  page,
}) => {
  await setup(page);
  await open(page);
  await page
    .getByRole("link", { name: "Learning library", exact: true })
    .click();
  await expect(page.locator(".source-card")).toHaveCount(10);
  await expect(page.locator(".mode-banner")).toContainText(
    "No live research endpoint",
  );
  await page.getByLabel("Topic", { exact: true }).selectOption("Decoherence");
  await expect(page.locator(".source-card")).toHaveCount(5);
  await page.getByLabel("Search the library").fill("not-a-real-paper");
  await expect(
    page.getByRole("heading", { name: /No sources match/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".source-card")).toHaveCount(10);
  await page.getByLabel("Search the library").fill("Schlosshauer");
  await expect(page.locator(".source-card")).toHaveCount(1);
  await page.getByText("Read relevance & limitations", { exact: true }).click();
  await expect(page.locator(".source-card details")).toContainText(
    "measurement problem",
  );
  const downloadWait = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download snapshot", exact: false })
    .first()
    .click();
  const data = JSON.parse(
    readFileSync((await (await downloadWait).path())!, "utf8"),
  );
  expect(data.sources.length).toBe(10);
  expect(data.mode).toBe("static");
  expect(data.provenance.sourceCommit).toHaveLength(40);
});

test("snapshot failures offer retry and the lab works with unavailable RPCs", async ({
  page,
}) => {
  const m = await setup(page);
  m.failRead = true;
  await page.route("**/research/initial.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("./#library");
  await expect(
    page.getByRole("button", { name: "Retry snapshot" }),
  ).toBeVisible();
  await page.unroute("**/research/initial.json");
  await page.getByRole("button", { name: "Retry snapshot" }).click();
  await expect(page.locator(".source-card")).toHaveCount(10);
  await page.getByRole("link", { name: "Model lab", exact: true }).click();
  await page.getByRole("button", { name: "Copy live state as input" }).click();
  await expect(page.locator(".lab-status")).toContainText(
    "unavailable or stale",
  );
  await page.getByRole("button", { name: "Try stronger feedback" }).click();
  await expect(page.getByTestId("distance")).not.toHaveText("0.0000%");
});

test("v2 routes have no overflow, broken local assets or axe violations; reduced motion is static", async ({
  page,
}) => {
  const errors: string[] = [],
    failed: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("127.0.0.1") && r.status() >= 400)
      failed.push(r.url());
  });
  await setup(page);
  await open(page);
  const report: unknown[] = [];
  mkdirSync("../artifacts", { recursive: true });
  for (const route of ["laboratory", "library"]) {
    await page.goto(`./#${route}`);
    await expect(
      page
        .locator(route === "library" ? ".source-card" : ".result-table")
        .first(),
    ).toBeVisible();
    for (const width of [1440, 950, 850, 580, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
      report.push({ route, width, overflow: false });
    }
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    report.push({ route, axeViolations: a.violations });
    expect(a.violations).toEqual([]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  }
  await page.goto("./#laboratory");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".experiment-bar").first()).toBeVisible();
  expect(
    await page
      .locator(".experiment-bar")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe("0s");
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  writeFileSync(
    "../artifacts/v2-browser-results.json",
    JSON.stringify(
      {
        report,
        errors,
        failed,
        reducedMotion: "0s chart transitions",
        textResize: "200% at 1440, both routes, no overflow",
      },
      null,
      2,
    ) + "\n",
  );
});
