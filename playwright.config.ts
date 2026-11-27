import { defineConfig, devices } from "@playwright/test";

/**
 * Com BASE_URL (serviço `e2e` do compose) o app já está no ar em outro container.
 * Sem BASE_URL (CI) o Playwright sobe o app com `webServer`.
 */
const baseURLExterna = process.env.BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  // Os testes dividem o mesmo banco e o reiniciam no começo: um de cada vez.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: {
    baseURL: baseURLExterna ?? "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: baseURLExterna
    ? undefined
    : {
        command: "pnpm build && pnpm start -p 3000",
        url: "http://localhost:3000/entrar",
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
      },
});
