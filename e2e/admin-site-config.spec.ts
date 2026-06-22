import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	test,
} from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const ADMIN_EMAIL = "admin@test.local";
const BUYER_EMAIL = "buyer@test.local";
const INSPECTOR_EMAIL = "inspector@test.local";
const CONSULTANT_EMAIL = "consultant@test.local";

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

// ─────────────────────────────────────────────────────────────────────────────
// /api/admin/site-config — ACL + read/write contract
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/api/admin/site-config — ACL", () => {
	test("anonymous GET -> 401", async ({ context }) => {
		await context.clearCookies();
		const res = await context.request.get("/api/admin/site-config");
		expect(res.status()).toBe(401);
	});

	test("anonymous PATCH -> 401", async ({ context }) => {
		await context.clearCookies();
		const res = await context.request.patch("/api/admin/site-config", {
			data: { general: { maintenanceMode: true } },
		});
		expect(res.status()).toBe(401);
	});

	for (const email of [BUYER_EMAIL, INSPECTOR_EMAIL, CONSULTANT_EMAIL]) {
		test(`${email} GET -> 403`, async ({ context }) => {
			await context.clearCookies();
			await loginOrSkip(context, email);
			const res = await context.request.get("/api/admin/site-config");
			expect(res.status()).toBe(403);
		});

		test(`${email} PATCH -> 403`, async ({ context }) => {
			await context.clearCookies();
			await loginOrSkip(context, email);
			const res = await context.request.patch("/api/admin/site-config", {
				data: { general: { maintenanceMode: true } },
			});
			expect(res.status()).toBe(403);
		});
	}

	test("admin GET returns the resolved config with every section", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.get("/api/admin/site-config");
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		const cfg = body?.data?.config;
		expect(cfg).toBeTruthy();
		for (const section of [
			"general",
			"pricing",
			"inspections",
			"rateLimit",
			"audit",
		] as const) {
			expect(cfg[section], `section ${section} present`).toBeTruthy();
		}
		// Spot-check a couple of default values from SITE_CONFIG_DEFAULTS.
		expect(typeof cfg.general.maintenanceMode).toBe("boolean");
		expect(typeof cfg.pricing.standardInspectionPrice).toBe("number");
		expect(cfg.inspections.minPhotos).toBeGreaterThan(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH persists + invalidates cache (next GET reflects the change)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/api/admin/site-config — persistence", () => {
	test("admin PATCH updates and the next GET reflects it", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);

		// Read the current value so we can restore it after the test.
		const before = await context.request
			.get("/api/admin/site-config")
			.then((r) => r.json());
		const originalPrice: number =
			before.data.config.pricing.standardInspectionPrice;

		const target = originalPrice + 1_000;
		const patch = await context.request.patch("/api/admin/site-config", {
			data: { pricing: { standardInspectionPrice: target } },
		});
		expect(patch.ok(), `patch status ${patch.status()}`).toBeTruthy();
		const patchBody = await patch.json();
		expect(
			patchBody.data.config.pricing.standardInspectionPrice,
			"patch response reflects new value",
		).toBe(target);

		// Re-read — second admin session, same context. Must see the new value.
		const after = await context.request
			.get("/api/admin/site-config")
			.then((r) => r.json());
		expect(after.data.config.pricing.standardInspectionPrice).toBe(target);

		// Restore so subsequent runs / specs aren't surprised.
		await context.request.patch("/api/admin/site-config", {
			data: { pricing: { standardInspectionPrice: originalPrice } },
		});
	});

	test("PATCH with empty body -> 400", async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.patch("/api/admin/site-config", {
			data: {},
		});
		expect(res.status()).toBe(400);
	});

	test("PATCH with invalid field -> 400", async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.patch("/api/admin/site-config", {
			data: {
				pricing: { standardInspectionPrice: "not-a-number" },
			},
		});
		expect(res.status()).toBe(400);
	});

	test("PATCH with unknown section -> 400 (strict schema)", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.patch("/api/admin/site-config", {
			data: { telemetry: { enabled: true } },
		});
		expect(res.status()).toBe(400);
	});

	test("PATCH out-of-range value (payoutPercent > 100) -> 400", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.patch("/api/admin/site-config", {
			data: { pricing: { inspectorPayoutPercent: 250 } },
		});
		expect(res.status()).toBe(400);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Booking flow honours the configured price (live consumer test)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("createInspection honours siteConfigs pricing", () => {
	test("changing the standard price changes the next booking's price field", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const buyerCtx = await browser.newContext();
		try {
			const adminLogin = await adminCtx.request.post("/api/auth/login", {
				data: { email: ADMIN_EMAIL, password: PASSWORD },
			});
			if (adminLogin.status() !== 200) {
				test.skip(true, "Admin seed user missing.");
				return;
			}
			const buyerLogin = await buyerCtx.request.post("/api/auth/login", {
				data: { email: BUYER_EMAIL, password: PASSWORD },
			});
			if (buyerLogin.status() !== 200) {
				test.skip(true, "Buyer seed user missing.");
				return;
			}

			// Capture original price.
			const initial = await adminCtx.request
				.get("/api/admin/site-config")
				.then((r) => r.json());
			const originalPrice: number =
				initial.data.config.pricing.standardInspectionPrice;
			const target = originalPrice + 7_777;

			try {
				const setPatch = await adminCtx.request.patch(
					"/api/admin/site-config",
					{
						data: {
							pricing: { standardInspectionPrice: target },
						},
					},
				);
				expect(setPatch.ok()).toBeTruthy();

				// Force a fresh read on the buyer side too — the in-process
				// cache is per-process, so the only one we need to worry
				// about is the dev server's. We pause briefly because the
				// invalidate is async-fire-and-forget.
				await new Promise((r) => setTimeout(r, 200));

				const create = await buyerCtx.request.post("/api/inspections", {
					data: {
						inspectionType: "standard",
						car: {
							make: "PriceProbe",
							model: "Test",
							year: 2024,
							sellerType: "private",
							city: "Lagos",
							address: "Pricing probe address",
						},
					},
				});
				expect(create.ok()).toBeTruthy();
				const body = await create.json();
				expect(
					body.data.inspection.price,
					"new booking uses configured price",
				).toBe(target);
			} finally {
				// Restore so we don't poison subsequent tests.
				await adminCtx.request.patch("/api/admin/site-config", {
					data: {
						pricing: { standardInspectionPrice: originalPrice },
					},
				});
			}
		} finally {
			await adminCtx.close();
			await buyerCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit log records every PATCH
// ─────────────────────────────────────────────────────────────────────────────

test.describe("admin audit log", () => {
	test("PATCH /site-config writes an audit log entry", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);

		const before = await context.request
			.get("/api/admin/site-config")
			.then((r) => r.json());
		const original: boolean = before.data.config.general.signupEnabled;

		await context.request.patch("/api/admin/site-config", {
			data: { general: { signupEnabled: !original } },
		});

		const logs = await context.request
			.get("/api/admin/audit-logs?limit=10")
			.then((r) => r.json());
		const items: Array<{ action: string; target?: string }> =
			logs.data?.logs ?? [];
		const hit = items.find(
			(l) =>
				l.action === "site_config.update" && l.target === "site_config",
		);
		expect(hit, "audit log entry for site_config.update").toBeTruthy();

		// Restore.
		await context.request.patch("/api/admin/site-config", {
			data: { general: { signupEnabled: original } },
		});
	});

	test("non-admin GET /api/admin/audit-logs -> 403", async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);
		const res = await context.request.get("/api/admin/audit-logs");
		expect(res.status()).toBe(403);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// /admin/settings page — render + redirect gating
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/admin/settings page", () => {
	test("anonymous GET -> /login?next=/admin/settings", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await page.goto("/admin/settings");
		await expect(page).toHaveURL(/\/login\?.*next=/, { timeout: 10_000 });
		const next = new URL(page.url()).searchParams.get("next");
		expect(decodeURIComponent(next ?? "")).toContain("/admin/settings");
	});

	test("buyer GET -> /dashboard", async ({ page, context }) => {
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);
		await page.goto("/admin/settings");
		await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
	});

	test("admin GET renders the settings page", async ({ page, context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		await page.goto("/admin/settings");
		await expect(page.getByTestId("settings-page")).toBeVisible({
			timeout: 10_000,
		});
		await expect(page.getByTestId("settings-general")).toBeVisible();
		await expect(page.getByTestId("settings-pricing")).toBeVisible();
		await expect(page.getByTestId("settings-inspections")).toBeVisible();
		await expect(page.getByTestId("settings-rate-limit")).toBeVisible();
		await expect(page.getByTestId("settings-audit")).toBeVisible();
	});

	test("admin can edit a number field and save", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		await page.goto("/admin/settings");
		await expect(page.getByTestId("settings-pricing")).toBeVisible({
			timeout: 10_000,
		});

		const field = page.getByTestId("field-platform-fee");
		const original = await field.inputValue();
		const next = String(Number(original) + 100);

		await field.fill(next);
		// Save button enables when dirty.
		const saveBtn = page.getByTestId("settings-pricing-save");
		await expect(saveBtn).toBeEnabled();
		await saveBtn.click();

		// Confirm the change persists on the server.
		const res = await context.request.get("/api/admin/site-config");
		const body = await res.json();
		expect(body.data.config.pricing.platformFee).toBe(Number(next));

		// Restore.
		await context.request.patch("/api/admin/site-config", {
			data: { pricing: { platformFee: Number(original) } },
		});
	});
});
