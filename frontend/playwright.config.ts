import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "npm run dev --workspace backend", cwd: "..", url: "http://127.0.0.1:3001/api/health", reuseExistingServer: !process.env.CI },
    { command: "npm run dev --workspace frontend -- --host 127.0.0.1", cwd: "..", url: "http://127.0.0.1:5173", reuseExistingServer: !process.env.CI },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["Pixel 7"] } }],
});
