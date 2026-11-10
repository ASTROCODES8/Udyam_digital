import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3005",
    launchOptions: {
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    },
    viewport: { width: 390, height: 844 },
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start -p 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
