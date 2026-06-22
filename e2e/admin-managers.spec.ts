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
const SEEDED_MANAGER_EMAIL = "manager@test.local";

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

// Each test that creates a manager uses a unique email so reruns don't trip
// the unique-email constraint. The audit-log entries from these are TTL'd so
// they don't accumulate forever.
//
// We deliberately keep the email/username SHORT (≤ 40 chars after the local
// part) so they pass the Zod validator's username max-length rule.
function freshEmail(label: string): string {
	const slug = label
		.replace(/[^a-z0-9]+/gi, "")
		.slice(0, 6)
		.toLowerCase();
	const suffix = Math.random().toString(36).slice(2, 10);
	return `m-${slug}-${suffix}@test.local`;
}

// Creates a manager AND walks the invite handshake so most tests don't have
// to think about it. A pending manager can't log in or be granted permissions
// — those tests use `inviteManager` (below) to stay pending on purpose.
//
// IMPORTANT: the accept endpoint mints a fresh session for the manager. We
// MUST run it in a throwaway context — otherwise the admin context's cookies
// get clobbered to the manager's session and the next admin call 403s.
async function createManager(
	adminCtx: BrowserContext,
	email: string,
	permissions: string[] = [],
): Promise<string> {
	const { managerId, token } = await inviteManager(adminCtx, email);
	const acceptCtx = await adminCtx.browser()?.newContext();
	if (!acceptCtx) throw new Error("Could not create accept context");
	try {
		const accept = await acceptCtx.request.post(
			`/api/auth/invites/${token}/accept`,
			{ data: { password: PASSWORD } },
		);
		expect(
			accept.ok(),
			`manager accept (status ${accept.status()})`,
		).toBeTruthy();
	} finally {
		await acceptCtx.close();
	}
	// If the test asked for starter permissions, grant them now that the
	// manager has flipped from pending → active. The server rejects grants
	// on pending rows, so this MUST happen after accept.
	if (permissions.length > 0) {
		const grant = await adminCtx.request.patch(
			`/api/admin/managers/${managerId}`,
			{ data: { permissions } },
		);
		expect(
			grant.ok(),
			`manager grant (status ${grant.status()})`,
		).toBeTruthy();
	}
	return managerId;
}

// Lower-level helper that just mints a pending manager — for tests of the
// invite flow itself and for "can't grant on pending" assertions.
async function inviteManager(
	adminCtx: BrowserContext,
	email: string,
): Promise<{ managerId: string; token: string; expiresAt: string }> {
	const local = email.split("@")[0].toLowerCase().slice(0, 38);
	const res = await adminCtx.request.post("/api/admin/managers", {
		data: {
			fullName: `Test Manager ${local}`,
			username: local,
			email,
		},
	});
	expect(res.ok(), `manager invite (status ${res.status()})`).toBeTruthy();
	const body = await res.json();
	return {
		managerId: body.data.manager.id as string,
		token: body.data.invite.token as string,
		expiresAt: body.data.invite.expiresAt as string,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// /api/admin/managers — ACL (anonymous, buyer, inspector, consultant, manager)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/api/admin/managers — ACL", () => {
	test("anonymous GET -> 401", async ({ context }) => {
		await context.clearCookies();
		const res = await context.request.get("/api/admin/managers");
		expect(res.status()).toBe(401);
	});

	test("anonymous POST -> 401", async ({ context }) => {
		await context.clearCookies();
		const res = await context.request.post("/api/admin/managers", {
			data: {
				fullName: "x",
				username: "x",
				email: "x@x.com",
				password: "xxxxxxxx",
			},
		});
		expect(res.status()).toBe(401);
	});

	for (const email of [
		BUYER_EMAIL,
		INSPECTOR_EMAIL,
		CONSULTANT_EMAIL,
		SEEDED_MANAGER_EMAIL,
	]) {
		test(`${email} cannot list managers (403)`, async ({ context }) => {
			await context.clearCookies();
			await loginOrSkip(context, email);
			const res = await context.request.get("/api/admin/managers");
			expect(res.status()).toBe(403);
		});

		test(`${email} cannot create managers (403)`, async ({ context }) => {
			await context.clearCookies();
			await loginOrSkip(context, email);
			const res = await context.request.post("/api/admin/managers", {
				data: {
					fullName: "x",
					username: "x",
					email: "x@x.com",
					password: "xxxxxxxx",
				},
			});
			expect(res.status()).toBe(403);
		});
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin can list / create / read / update / suspend managers
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/api/admin/managers — admin flows", () => {
	test("admin GET returns the seeded manager", async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.get("/api/admin/managers");
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		const managers: Array<{ email: string; permissions: string[] }> =
			body.data?.managers ?? [];
		const seeded = managers.find((m) => m.email === SEEDED_MANAGER_EMAIL);
		expect(seeded, "seeded manager present").toBeTruthy();
		// Default-zero-access invariant — the seeded manager has NO perms.
		expect(seeded?.permissions).toEqual([]);
	});

	test("admin POST creates a PENDING manager with empty permissions and returns an invite token", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const email = freshEmail("default-perms");
		const res = await context.request.post("/api/admin/managers", {
			data: {
				fullName: "Default Perms",
				username: email.split("@")[0],
				email,
				// No password — the manager sets one when accepting the invite.
				// No permissions — defaults to [] per the zero-access contract.
			},
		});
		expect(res.ok(), `create status ${res.status()}`).toBeTruthy();
		const body = await res.json();
		expect(body.data.manager.permissions).toEqual([]);
		// The invite handshake: new managers are pending until acceptance.
		expect(body.data.manager.status).toBe("pending");
		expect(body.data.manager.hasOutstandingInvite).toBe(true);
		expect(body.data.manager.email).toBe(email);
		// Single-shot invite token + path are returned ONCE on create.
		expect(typeof body.data.invite?.token).toBe("string");
		expect(body.data.invite.token.length).toBeGreaterThan(20);
		expect(body.data.invite.path).toBe(`/invite/${body.data.invite.token}`);
		// Expiry is in the future (default TTL is 7 days).
		expect(new Date(body.data.invite.expiresAt).getTime()).toBeGreaterThan(
			Date.now(),
		);
	});

	test("admin POST rejects duplicate email (409)", async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.post("/api/admin/managers", {
			data: {
				fullName: "Dup",
				username: "dup-conflict",
				email: SEEDED_MANAGER_EMAIL,
				password: PASSWORD,
			},
		});
		expect(res.status()).toBe(409);
	});

	test("admin POST rejects malformed body (400)", async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.post("/api/admin/managers", {
			data: { fullName: "missing-everything-else" },
		});
		expect(res.status()).toBe(400);
	});

	test("admin POST rejects unknown permission strings (400)", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const res = await context.request.post("/api/admin/managers", {
			data: {
				fullName: "Bad Perm",
				username: "badperm",
				email: freshEmail("badperm"),
				password: PASSWORD,
				permissions: ["root.everything"],
			},
		});
		expect(res.status()).toBe(400);
	});

	test("DELETE /api/admin/managers/:id is intentionally forbidden", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const list = await context.request
			.get("/api/admin/managers")
			.then((r) => r.json());
		const seeded = list.data.managers.find(
			(m: { email: string; id: string }) =>
				m.email === SEEDED_MANAGER_EMAIL,
		);
		if (!seeded) test.skip(true, "Seeded manager missing.");

		const res = await context.request.delete(
			`/api/admin/managers/${seeded.id}`,
		);
		expect(res.status()).toBe(403);
	});

	test("admin PATCH ignores unknown sections (400)", async ({ context }) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const list = await context.request
			.get("/api/admin/managers")
			.then((r) => r.json());
		const seeded = list.data.managers.find(
			(m: { email: string; id: string }) =>
				m.email === SEEDED_MANAGER_EMAIL,
		);
		if (!seeded) test.skip(true, "Seeded manager missing.");

		const res = await context.request.patch(
			`/api/admin/managers/${seeded.id}`,
			{
				data: { wat: ["root"] },
			},
		);
		expect(res.status()).toBe(400);
	});

	test("admin PATCH rejects unknown permission strings (400)", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const list = await context.request
			.get("/api/admin/managers")
			.then((r) => r.json());
		const seeded = list.data.managers.find(
			(m: { email: string; id: string }) =>
				m.email === SEEDED_MANAGER_EMAIL,
		);
		if (!seeded) test.skip(true, "Seeded manager missing.");

		const res = await context.request.patch(
			`/api/admin/managers/${seeded.id}`,
			{
				data: { permissions: ["god.mode"] },
			},
		);
		expect(res.status()).toBe(400);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Zero-access invariant: a manager with [] permissions hits 403 EVERYWHERE.
// This is the headline requirement: "managers default to zero access".
// ─────────────────────────────────────────────────────────────────────────────

test.describe("zero-access invariant", () => {
	test("a manager with [] permissions can sign in but is 403'd from every gated endpoint", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("zero");
			const id = await createManager(adminCtx, email, []);
			expect(id).toBeTruthy();

			// New manager logs in fine.
			const login = await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});
			expect(
				login.ok(),
				`new manager login (status ${login.status()})`,
			).toBeTruthy();

			// Session probe confirms role + empty permissions.
			const session = await mgrCtx.request
				.get("/api/auth/session")
				.then((r) => r.json());
			expect(session.data.user.role).toBe("manager");
			expect(session.data.user.permissions).toEqual([]);

			// Every gated admin endpoint must 403 for a zero-access manager.
			const gated: Array<{
				method: "GET" | "POST" | "PATCH";
				path: string;
			}> = [
				{ method: "GET", path: "/api/admin/inspectors" },
				{ method: "GET", path: "/api/admin/disputes" },
				{ method: "GET", path: "/api/admin/broker-requests" },
				{ method: "GET", path: "/api/admin/special-requests" },
				{
					method: "GET",
					path: "/api/admin/inspections?filter=overdue",
				},
				{
					method: "GET",
					path: "/api/admin/inspections?status=in_progress",
				},
				{ method: "GET", path: "/api/admin/site-config" },
				{ method: "GET", path: "/api/admin/audit-logs" },
				{ method: "GET", path: "/api/admin/managers" }, // admin-only
			];
			for (const g of gated) {
				const r =
					g.method === "GET"
						? await mgrCtx.request.get(g.path)
						: await mgrCtx.request.patch(g.path, { data: {} });
				expect(
					r.status(),
					`${g.method} ${g.path} for zero-access manager`,
				).toBe(403);
			}
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Grant → manager gains access. Revoke → manager loses access. Round-trip.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("grant / revoke round-trip", () => {
	test("admin grants inspectors.view → manager gets 200; revokes → 403", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("grant-revoke");
			const id = await createManager(adminCtx, email, []);
			const login = await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});
			expect(login.ok()).toBeTruthy();

			// Before grant: 403
			const before = await mgrCtx.request.get("/api/admin/inspectors");
			expect(before.status()).toBe(403);

			// Grant inspectors.view
			const grant = await adminCtx.request.patch(
				`/api/admin/managers/${id}`,
				{
					data: { permissions: ["inspectors.view"] },
				},
			);
			expect(grant.ok(), `grant status ${grant.status()}`).toBeTruthy();
			expect((await grant.json()).data.manager.permissions).toContain(
				"inspectors.view",
			);

			// Cache invalidation: next call must reflect the grant. The
			// in-process cache TTL is short and `invalidateManagerPermissions`
			// is called synchronously on the write path, so the next request
			// inside the same dev process sees the change.
			const allowed = await mgrCtx.request.get("/api/admin/inspectors");
			expect(
				allowed.status(),
				`after grant: GET /api/admin/inspectors`,
			).toBe(200);

			// Sibling permission still 403.
			const sibling = await mgrCtx.request.get("/api/admin/disputes");
			expect(sibling.status()).toBe(403);

			// Revoke by sending an empty array.
			const revoke = await adminCtx.request.patch(
				`/api/admin/managers/${id}`,
				{
					data: { permissions: [] },
				},
			);
			expect(revoke.ok()).toBeTruthy();
			expect((await revoke.json()).data.manager.permissions).toEqual([]);

			const after = await mgrCtx.request.get("/api/admin/inspectors");
			expect(after.status(), "after revoke").toBe(403);
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});

	test("permission grants are isolated — granting one perm doesn't unlock others", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("isolation");
			const id = await createManager(adminCtx, email, []);
			await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});

			// Grant *only* disputes.view
			const grant = await adminCtx.request.patch(
				`/api/admin/managers/${id}`,
				{
					data: { permissions: ["disputes.view"] },
				},
			);
			expect(grant.ok()).toBeTruthy();

			// Allowed:
			const disputes = await mgrCtx.request.get("/api/admin/disputes");
			expect(disputes.status()).toBe(200);

			// Each other endpoint must remain 403 — no spill-over.
			for (const p of [
				"/api/admin/inspectors",
				"/api/admin/broker-requests",
				"/api/admin/special-requests",
				"/api/admin/site-config",
				"/api/admin/audit-logs",
				"/api/admin/managers",
			]) {
				const r = await mgrCtx.request.get(p);
				expect(r.status(), `${p} should be 403`).toBe(403);
			}
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});

	test("site_config.edit grant lets a manager PATCH but inspectors.approve does not", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("siteedit");
			const id = await createManager(adminCtx, email, []);
			await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});

			// Without site_config.edit: PATCH 403
			const denied = await mgrCtx.request.patch(
				"/api/admin/site-config",
				{
					data: {
						general: { signupEnabled: true },
					},
				},
			);
			expect(denied.status()).toBe(403);

			// Grant site_config.view (read only)
			await adminCtx.request.patch(`/api/admin/managers/${id}`, {
				data: { permissions: ["site_config.view"] },
			});
			const canRead = await mgrCtx.request.get("/api/admin/site-config");
			expect(canRead.status()).toBe(200);
			const stillDenied = await mgrCtx.request.patch(
				"/api/admin/site-config",
				{
					data: { general: { signupEnabled: true } },
				},
			);
			expect(
				stillDenied.status(),
				"site_config.view doesn't grant edit",
			).toBe(403);

			// Grant edit too:
			await adminCtx.request.patch(`/api/admin/managers/${id}`, {
				data: {
					permissions: ["site_config.view", "site_config.edit"],
				},
			});
			const initial = await mgrCtx.request
				.get("/api/admin/site-config")
				.then((r) => r.json());
			const originalSignup: boolean =
				initial.data.config.general.signupEnabled;

			const allowed = await mgrCtx.request.patch(
				"/api/admin/site-config",
				{
					data: {
						general: { signupEnabled: !originalSignup },
					},
				},
			);
			expect(allowed.status(), "with site_config.edit grant").toBe(200);

			// Restore so we don't leak state.
			await adminCtx.request.patch("/api/admin/site-config", {
				data: { general: { signupEnabled: originalSignup } },
			});
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit trail — every grant / revoke / create writes an audit entry.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("audit trail", () => {
	test("create + grant + revoke all show up in /api/admin/audit-logs", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("audit");
			const id = await createManager(adminCtx, email, []);

			await adminCtx.request.patch(`/api/admin/managers/${id}`, {
				data: { permissions: ["audit.view"] },
			});
			await adminCtx.request.patch(`/api/admin/managers/${id}`, {
				data: { permissions: [] },
			});

			const logs = await adminCtx.request
				.get(`/api/admin/audit-logs?limit=50`)
				.then((r) => r.json());
			const entries: Array<{
				action: string;
				target?: string;
				before?: { permissions: string[] };
				after?: {
					permissions: string[];
					granted?: string[];
					revoked?: string[];
				};
			}> = logs.data?.logs ?? [];
			const forThis = entries.filter((e) => e.target === id);
			// The create flow now records as `manager.invite` (since the
			// admin issues an invite rather than handing out a credential).
			expect(forThis.some((e) => e.action === "manager.invite")).toBe(
				true,
			);
			// And the invite-accept path leaves its own audit row.
			expect(
				forThis.some((e) => e.action === "manager.invite.accept"),
				"accept entry recorded",
			).toBe(true);
			const granted = forThis.find(
				(e) =>
					e.action === "manager.permissions.update" &&
					(e.after?.granted ?? []).includes("audit.view"),
			);
			expect(granted, "grant entry recorded").toBeTruthy();
			const revoked = forThis.find(
				(e) =>
					e.action === "manager.permissions.update" &&
					(e.after?.revoked ?? []).includes("audit.view"),
			);
			expect(revoked, "revoke entry recorded").toBeTruthy();
		} finally {
			await adminCtx.close();
		}
	});

	test("a manager with audit.view can read the audit log", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("auditreader");
			const id = await createManager(adminCtx, email, []);
			await adminCtx.request.patch(`/api/admin/managers/${id}`, {
				data: { permissions: ["audit.view"] },
			});

			await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});
			const res = await mgrCtx.request.get(
				"/api/admin/audit-logs?limit=5",
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(Array.isArray(body.data?.logs)).toBe(true);
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Proxy / page-level gating
// ─────────────────────────────────────────────────────────────────────────────

test.describe("page-level gating", () => {
	test("manager can reach /admin (shell), even with zero permissions", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("shell");
			await createManager(adminCtx, email, []);
			await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});

			const page = await mgrCtx.newPage();
			await page.goto("/admin");
			// Doesn't get bounced to /login (manager is signed in).
			await expect(page).not.toHaveURL(/\/login/);
			// Zero-access banner is visible.
			await expect(page.getByTestId("manager-zero-access")).toBeVisible({
				timeout: 10_000,
			});
			await page.close();
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});

	test("manager is blocked from /admin/managers (admin-only) and bounced to /admin", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("nomgmt");
			await createManager(adminCtx, email, ["inspectors.view"]);
			await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});

			const page = await mgrCtx.newPage();
			await page.goto("/admin/managers");
			// Proxy redirects role-home → /admin
			await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
			await page.close();
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});

	test("manager with inspectors.view sees the inspectors tile on /admin", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("inspectortile");
			const id = await createManager(adminCtx, email, [
				"inspectors.view",
			]);
			expect(id).toBeTruthy();
			await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});

			const page = await mgrCtx.newPage();
			await page.goto("/admin");
			await expect(
				page.getByTestId("tile-/admin/inspectors"),
			).toBeVisible({ timeout: 10_000 });
			// Disputes tile must NOT render (no perm).
			await expect(page.getByTestId("tile-/admin/disputes")).toHaveCount(
				0,
			);
			// Admin-only manager tile must NOT render.
			await expect(page.getByTestId("tile-/admin/managers")).toHaveCount(
				0,
			);
			await page.close();
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});

	test("admin can reach /admin/managers and see the roster", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		await page.goto("/admin/managers");
		await expect(page.getByTestId("managers-page")).toBeVisible({
			timeout: 10_000,
		});
		await expect(page.getByTestId("managers-list")).toBeVisible();
		await expect(page.getByTestId("manager-invite")).toBeVisible();
	});

	test("buyer hitting /admin/managers is bounced to /dashboard", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);
		await page.goto("/admin/managers");
		await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
	});

	test("anonymous /admin/managers -> /login?next=/admin/managers", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await page.goto("/admin/managers");
		await expect(page).toHaveURL(/\/login\?.*next=/, { timeout: 10_000 });
		const next = new URL(page.url()).searchParams.get("next");
		expect(decodeURIComponent(next ?? "")).toContain("/admin/managers");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Redesigned dashboard affordances: invite-via-modal, search, status filter,
// pagination. These exercise the actual UI rather than the API surface.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/admin/managers UI affordances", () => {
	test("invite-manager button opens a modal that issues an invite URL", async ({
		browser,
	}) => {
		const ctx = await browser.newContext();
		try {
			await loginOrSkip(ctx, ADMIN_EMAIL);
			const page = await ctx.newPage();
			await page.goto("/admin/managers");
			await expect(page.getByTestId("managers-page")).toBeVisible({
				timeout: 10_000,
			});

			// Modal is closed initially.
			await expect(page.getByTestId("invite-modal")).toHaveCount(0);

			// Clicking the header button opens it.
			await page.getByTestId("manager-invite").click();
			await expect(page.getByTestId("invite-modal")).toBeVisible();

			const email = freshEmail("ui-modal");
			const local = email.split("@")[0];
			await page.getByTestId("invite-fullname").fill(`UI Modal ${local}`);
			await page.getByTestId("invite-username").fill(local);
			await page.getByTestId("invite-email").fill(email);
			// No password — that's the manager's job on invite acceptance.
			await page.getByTestId("invite-submit").click();

			// Stage 2: the modal flips to "invite sent" with a one-shot URL.
			await expect(page.getByTestId("invite-issued")).toBeVisible({
				timeout: 10_000,
			});
			const url = await page
				.getByTestId("invite-issued-url")
				.inputValue();
			expect(url).toContain("/invite/");

			// Click Done to close + open the detail modal on the new manager.
			await page.getByTestId("invite-done").click();
			await expect(page.getByTestId("invite-modal")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Detail modal opens on the new manager — confirm the pending
			// banner is showing (permissions locked until acceptance).
			const detail = page.getByTestId("manager-detail");
			await expect(detail).toBeVisible();
			await expect(
				page.getByTestId("manager-pending-banner"),
			).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(detail).toHaveCount(0);

			await expect(
				page.getByTestId(`manager-row-${email}`),
			).toBeVisible();
		} finally {
			await ctx.close();
		}
	});

	test("search narrows the visible cards", async ({ browser }) => {
		const ctx = await browser.newContext();
		try {
			await loginOrSkip(ctx, ADMIN_EMAIL);
			// Two managers with distinct names so we can search for one.
			const a = freshEmail("search-a");
			const b = freshEmail("search-b");
			await createManager(ctx, a);
			await createManager(ctx, b);

			const page = await ctx.newPage();
			await page.goto("/admin/managers");
			await expect(page.getByTestId("managers-list")).toBeVisible();
			await expect(page.getByTestId(`manager-row-${a}`)).toBeVisible();
			await expect(page.getByTestId(`manager-row-${b}`)).toBeVisible();

			// Typing the local-part of `a` should hide `b`.
			await page.getByTestId("managers-search").fill(a.split("@")[0]);
			await expect(page.getByTestId(`manager-row-${a}`)).toBeVisible();
			await expect(page.getByTestId(`manager-row-${b}`)).toHaveCount(0);

			// Clearing the search brings both back.
			await page.getByTestId("managers-search").fill("");
			await expect(page.getByTestId(`manager-row-${a}`)).toBeVisible();
			await expect(page.getByTestId(`manager-row-${b}`)).toBeVisible();
		} finally {
			await ctx.close();
		}
	});

	test("status filter chip hides non-matching managers", async ({
		browser,
	}) => {
		const ctx = await browser.newContext();
		try {
			await loginOrSkip(ctx, ADMIN_EMAIL);
			const active = freshEmail("filt-active");
			const toSuspend = freshEmail("filt-susp");
			await createManager(ctx, active);
			const susId = await createManager(ctx, toSuspend);
			// Suspend the second one so we have one of each status.
			const susResp = await ctx.request.patch(
				`/api/admin/managers/${susId}`,
				{ data: { action: "suspend" } },
			);
			expect(susResp.ok()).toBeTruthy();

			const page = await ctx.newPage();
			await page.goto("/admin/managers");
			await expect(page.getByTestId("managers-list")).toBeVisible();

			// Both visible under the default "All" filter.
			await expect(
				page.getByTestId(`manager-row-${active}`),
			).toBeVisible();
			await expect(
				page.getByTestId(`manager-row-${toSuspend}`),
			).toBeVisible();

			// Click "Suspended" — only the suspended manager should remain.
			await page.getByTestId("managers-filter-suspended").click();
			await expect(
				page.getByTestId(`manager-row-${toSuspend}`),
			).toBeVisible();
			await expect(page.getByTestId(`manager-row-${active}`)).toHaveCount(
				0,
			);

			// Click "Active" — only the active manager should remain.
			await page.getByTestId("managers-filter-active").click();
			await expect(
				page.getByTestId(`manager-row-${active}`),
			).toBeVisible();
			await expect(
				page.getByTestId(`manager-row-${toSuspend}`),
			).toHaveCount(0);

			// Reactivate the suspended one so the seed state is restored.
			await ctx.request.patch(`/api/admin/managers/${susId}`, {
				data: { action: "reactivate" },
			});
		} finally {
			await ctx.close();
		}
	});

	test("pagination renders when results exceed page size and Next advances", async ({
		browser,
	}) => {
		const ctx = await browser.newContext();
		try {
			await loginOrSkip(ctx, ADMIN_EMAIL);

			// PAGE_SIZE is 9; create enough managers to guarantee at least
			// two pages on top of whatever the seed/other tests left behind.
			const created: string[] = [];
			for (let i = 0; i < 10; i++) {
				const email = freshEmail(`pg-${i}`);
				await createManager(ctx, email);
				created.push(email);
			}

			const page = await ctx.newPage();
			await page.goto("/admin/managers");
			await expect(page.getByTestId("managers-pagination")).toBeVisible({
				timeout: 10_000,
			});

			// Prev disabled, Next enabled on page 1.
			await expect(page.getByTestId("managers-page-prev")).toBeDisabled();
			await expect(page.getByTestId("managers-page-next")).toBeEnabled();

			// Page button "1" is the current page.
			await expect(page.getByTestId("managers-page-1")).toBeVisible();

			// Capture the first page's cards, hit Next, confirm the set
			// changes. We don't care which exact cards land where (other
			// tests may have left managers behind) — only that paging shifts
			// the visible set.
			const beforeCards = await page
				.getByTestId("managers-list")
				.locator("button")
				.evaluateAll((els) =>
					els.map((e) => e.getAttribute("data-testid")),
				);
			await page.getByTestId("managers-page-next").click();
			await expect(page.getByTestId("managers-page-2")).toBeVisible();
			const afterCards = await page
				.getByTestId("managers-list")
				.locator("button")
				.evaluateAll((els) =>
					els.map((e) => e.getAttribute("data-testid")),
				);
			expect(afterCards).not.toEqual(beforeCards);

			// Prev now enabled.
			await expect(page.getByTestId("managers-page-prev")).toBeEnabled();
		} finally {
			await ctx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge: managers can't manage other managers (no managers.manage permission)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("managers cannot manage other managers", () => {
	test("a manager with every grantable permission still can't access /api/admin/managers", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const mgrCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("superuser-wannabe");
			const id = await createManager(adminCtx, email, []);
			// Grant *every* permission in the catalogue. There is no
			// "managers.manage" — admin tooling is intentionally admin-only.
			await adminCtx.request.patch(`/api/admin/managers/${id}`, {
				data: {
					permissions: [
						"inspectors.view",
						"inspectors.approve",
						"special_requests.view",
						"live.view",
						"disputes.view",
						"disputes.resolve",
						"broker_requests.view",
						"overdue.view",
						"site_config.view",
						"site_config.edit",
						"audit.view",
					],
				},
			});
			await mgrCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});

			const list = await mgrCtx.request.get("/api/admin/managers");
			expect(list.status()).toBe(403);
			const create = await mgrCtx.request.post("/api/admin/managers", {
				data: {
					fullName: "Should not work",
					username: "nope",
					email: freshEmail("nope"),
					password: PASSWORD,
				},
			});
			expect(create.status()).toBe(403);
			const patch = await mgrCtx.request.patch(
				`/api/admin/managers/${id}`,
				{
					data: { permissions: [] },
				},
			);
			expect(patch.status()).toBe(403);
		} finally {
			await adminCtx.close();
			await mgrCtx.close();
		}
	});
});
