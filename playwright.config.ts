import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3300);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: BASE_URL,
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: process.env.E2E_USE_BUILD
			? `next start -p ${PORT}`
			: `next dev -p ${PORT}`,
		url: BASE_URL,
		reuseExistingServer: false,
		timeout: 180_000,
		env: {
			DISABLE_RATE_LIMIT: "1",
		},
	},
});
