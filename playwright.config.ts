import { defineConfig, devices } from "@playwright/test";

/**
 * Testes end-to-end. Utilizam uma base de dados de testes própria (ol4_test)
 * e uma pasta de armazenamento temporária. Os dados criados pelos testes são
 * identificados como [DEMO] e nunca são utilizados noutro ambiente.
 *
 * Pré-requisito: npm run build
 */
const PORT = 3100;
export const E2E_ENV = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://ol4_app:ol4_app_dev@localhost:5432/ol4_test",
  MIGRATION_DATABASE_URL: process.env.E2E_MIGRATION_DATABASE_URL ?? "postgres://ol4_owner:ol4_owner_dev@localhost:5432/ol4_test",
  APP_DB_PASSWORD: process.env.E2E_APP_DB_PASSWORD ?? "ol4_app_dev",
  APP_SECRET: "e2e-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
  SITE_URL: `http://localhost:${PORT}`,
  SITE_INDEXING: "false",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: "./e2e/.storage",
  COOKIE_SECURE: "false",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: E2E_ENV,
  },
});
