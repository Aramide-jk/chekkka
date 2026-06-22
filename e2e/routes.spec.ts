import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	test,
} from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const BUYER_EMAIL = "buyer@test.local";
const INSPECTOR_EMAIL = "inspector@test.local";
const PENDING_INSPECTOR_EMAIL = "inspector-pending@test.local";
const CONSULTANT_EMAIL = "consultant@test.local";
const ADMIN_EMAIL = "admin@test.local";

// IMPORTANT: Playwright's top-level `request` fixture has its own storage
// jar — cookies set through it are not visible to `page.goto()`. Use the
// browser context's request so both share cookies.
async function loginOrSkip(
	ctx: BrowserContext | APIRequestContext,
	email: string,
) {
	const req: APIRequestContext = "request" in ctx ? ctx.request : ctx;
	const res = await req.post("/api/auth/login", {
		data: { email, password: PASSWORD },
	});
	if (res.status() !== 200) {
		test.skip(
			true,
			`Seed user ${email} missing — run \`npm run seed\` first.`,
		);
	}
	return res;
}

const PUBLIC_ROUTES: Array<{
	path: string;
	expectText?: RegExp;
	testid?: string;
}> = [
	{ path: "/", expectText: /Before you/i },
	{ path: "/login", testid: "login-form" },
	{ path: "/signup", testid: "signup-form" },
	{ path: "/forgot-password", testid: "forgot-password-form" },
	{ path: "/inspector", expectText: /Earn for the work/i },
	{ path: "/terms", expectText: /Terms of/i },
	{ path: "/privacy", expectText: /Privacy/i },
	{ path: "/sample-report", testid: "inspection-tabs" },
];

const BUYER_ROUTES: Array<{
	path: string;
	testid?: string;
	expectText?: RegExp;
}> = [
	{ path: "/onboarding", testid: "onboarding-slide-0" },
	{ path: "/dashboard", testid: "dashboard-stats" },
	{ path: "/book", expectText: /Book an/i },
	{ path: "/book/1", testid: "booking-step-1" },
	{ path: "/book/2", testid: "booking-step-2" },
	{ path: "/book/3", testid: "booking-step-3" },
	{ path: "/book/4", testid: "booking-step-4" },
	{ path: "/book/5", testid: "booking-step-5" },
	{ path: "/chat", testid: "chat-messages" },
];

const INSPECTOR_APPROVED_ROUTES: Array<{
	path: string;
	testid?: string;
	expectText?: RegExp;
}> = [
	{ path: "/inspector/apply", testid: "apply-stepper" },
	{ path: "/inspector/dashboard", testid: "availability-toggle" },
	{ path: "/inspector/schedule", testid: "schedule-grid" },
	{ path: "/inspector/earnings", testid: "payouts-table" },
	{ path: "/inspector/inspections/ins_005", testid: "countdown" },
	{ path: "/inspector/inspections/ins_005/live", testid: "section-picker" },
	{ path: "/inspector/inspections/ins_005/report", testid: "report-tabs" },
];

const ADMIN_ROUTES: Array<{
	path: string;
	testid?: string;
	expectText?: RegExp;
}> = [
	{ path: "/admin", expectText: /Mission/i },
	{ path: "/admin/inspectors", testid: "admin-inspectors" },
	{ path: "/admin/special-requests", testid: "queue-special-requests" },
	{ path: "/admin/inspections/live", testid: "queue-live" },
	{ path: "/admin/disputes", testid: "queue-disputes" },
	{ path: "/admin/broker-requests", testid: "queue-broker-requests" },
	{ path: "/admin/overdue", testid: "queue-overdue" },
	{ path: "/admin/settings", testid: "settings-page" },
	{ path: "/admin/audit-logs", testid: "audit-logs" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Public routes — anyone, signed in or not, can hit them.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Public routes (no auth required)", () => {
	for (const { path, expectText, testid } of PUBLIC_ROUTES) {
		test(`GET ${path}`, async ({ page, context }) => {
			await context.clearCookies();
			const response = await page.goto(path);
			expect(response?.status(), `status for ${path}`).toBeLessThan(400);
			// For all non-login pages, also confirm the proxy didn't redirect
			// us to /login.
			if (!path.startsWith("/login")) {
				expect(page.url(), `should not redirect ${path}`).not.toMatch(
					/\/login(\?|$)/,
				);
			}
			if (testid) {
				await expect(page.getByTestId(testid)).toBeVisible({
					timeout: 10_000,
				});
			} else if (expectText) {
				await expect(page.locator("body")).toContainText(expectText, {
					timeout: 10_000,
				});
			}
		});
	}

	test("404 page renders for unknown route (signed in)", async ({
		page,
		context,
	}) => {
		// An anonymous user hitting an unknown path is redirected to /login by
		// proxy (catch-all "auth" rule). Sign in first so the request
		// falls through to Next.js's not-found handler.
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);
		const response = await page.goto("/this-page-does-not-exist", {
			waitUntil: "domcontentloaded",
		});
		expect(response?.status()).toBe(404);
		await expect(page.locator("body")).toContainText("404");
	});

	test("API health endpoint responds 200", async ({ request }) => {
		const res = await request.get("/api/health");
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.code).toBeDefined();
		expect(body.data?.status).toBe("ok");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Protected routes — when logged out, every one of these must redirect to
// /login with a ?next= back-pointer.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Protected routes redirect anonymous users to /login", () => {
	const PROTECTED = [
		...BUYER_ROUTES.map((r) => r.path),
		...INSPECTOR_APPROVED_ROUTES.map((r) => r.path),
		...ADMIN_ROUTES.map((r) => r.path),
		"/inspector/pending",
		"/inspector/rejected",
		"/inspector/suspended",
		"/inspections/ins_001",
		"/inspections/ins_001/live",
		"/consultant/chats",
	];

	for (const path of PROTECTED) {
		test(`anonymous GET ${path} -> /login`, async ({ page, context }) => {
			await context.clearCookies();
			await page.goto(path);
			await expect(page).toHaveURL(/\/login\?.*next=/, {
				timeout: 10_000,
			});
			// `next` param should round-trip the original path.
			const url = new URL(page.url());
			const next = url.searchParams.get("next");
			expect(next, `next param missing for ${path}`).toBeTruthy();
			expect(decodeURIComponent(next ?? "")).toContain(path);
		});
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// Logged-in role flows — each role can reach its own pages.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Buyer can reach buyer routes when signed in", () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);
	});

	for (const { path, expectText, testid } of BUYER_ROUTES) {
		test(`buyer GET ${path}`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status(), `status for ${path}`).toBeLessThan(400);
			expect(page.url()).not.toMatch(/\/login(\?|$)/);
			if (testid) {
				await expect(page.getByTestId(testid)).toBeVisible({
					timeout: 10_000,
				});
			} else if (expectText) {
				await expect(page.locator("body")).toContainText(expectText, {
					timeout: 10_000,
				});
			}
		});
	}

	test("buyer can browse a real inspection from their list", async ({
		page,
		context,
	}) => {
		const list = await context.request.get("/api/inspections");
		const body = await list.json();
		const id = body.data?.inspections?.[0]?._id as string | undefined;
		if (!id) test.skip(true, "Seed has no buyer inspections.");
		await page.goto(`/inspections/${id}`);
		await expect(page.getByTestId("inspection-tabs")).toBeVisible({
			timeout: 10_000,
		});
	});
});

test.describe("Approved inspector can reach inspector routes", () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, INSPECTOR_EMAIL);
	});

	for (const { path, expectText, testid } of INSPECTOR_APPROVED_ROUTES) {
		test(`inspector GET ${path}`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status(), `status for ${path}`).toBeLessThan(400);
			expect(page.url()).not.toMatch(/\/login(\?|$)/);
			if (testid) {
				await expect(page.getByTestId(testid)).toBeVisible({
					timeout: 10_000,
				});
			} else if (expectText) {
				await expect(page.locator("body")).toContainText(expectText, {
					timeout: 10_000,
				});
			}
		});
	}
});

test.describe("Admin can reach admin routes", () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
	});

	for (const { path, expectText, testid } of ADMIN_ROUTES) {
		test(`admin GET ${path}`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status(), `status for ${path}`).toBeLessThan(400);
			expect(page.url()).not.toMatch(/\/login(\?|$)/);
			if (testid) {
				await expect(page.getByTestId(testid)).toBeVisible({
					timeout: 10_000,
				});
			} else if (expectText) {
				await expect(page.locator("body")).toContainText(expectText, {
					timeout: 10_000,
				});
			}
		});
	}
});

test.describe("Consultant can reach /consultant/chats", () => {
	test("consultant GET /consultant/chats", async ({ page, context }) => {
		await context.clearCookies();
		await loginOrSkip(context, CONSULTANT_EMAIL);
		await page.goto("/consultant/chats");
		await expect(page.getByTestId("consultant-tabs")).toBeVisible({
			timeout: 10_000,
		});
	});
});

test.describe("Pending inspector lands on /inspector/pending", () => {
	test("pending inspector routed away from /inspector/dashboard", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, PENDING_INSPECTOR_EMAIL);
		await page.goto("/inspector/dashboard");
		await expect(page).toHaveURL(/\/inspector\/pending$/, {
			timeout: 10_000,
		});
		await expect(page.getByTestId("status-pending")).toBeVisible({
			timeout: 10_000,
		});
	});
});
