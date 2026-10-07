import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  outputDir: "../test/scratch/playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/frontend/browser-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173/preview/",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.BROWSER_EXECUTABLE,
      args: process.env.BROWSER_LOW_RESOURCE
        ? [
            "--single-process",
            "--no-zygote",
            "--disable-gpu",
            "--disable-crash-reporter",
          ]
        : [],
    },
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4173/preview/",
    reuseExistingServer: true,
    timeout: 10000,
  },
});
