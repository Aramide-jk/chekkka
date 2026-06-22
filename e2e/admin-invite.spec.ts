import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	test,
} from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const ADMIN_EMAIL = "admin@test.local";
const BUYER_EMAIL = "buyer@test.local";

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

function freshEmail(label: string): string {
	const slug = label
		.replace(/[^a-z0-9]+/gi, "")
		.slice(0, 6)
		.toLowerCase();
	const suffix = Math.random().toString(36).slice(2, 10);
	return `inv-${slug}-${suffix}@test.local`;
}

async function inviteManager(
	adminCtx: BrowserContext | APIRequestContext,
	email: string,
): Promise<{ managerId: string; token: string; expiresAt: string }> {
	const req: APIRequestContext =
		"request" in adminCtx ? adminCtx.request : adminCtx;
	const local = email.split("@")[0].toLowerCase().slice(0, 38);
	const res = await req.post("/api/admin/managers", {
		data: {
			fullName: `Invite ${local}`,
			username: local,
			email,
		},
	});
	expect(res.ok(), `invite (status ${res.status()})`).toBeTruthy();
	const body = await res.json();
	return {
		managerId: body.data.manager.id as string,
		token: body.data.invite.token as string,
		expiresAt: body.data.invite.expiresAt as string,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Create-time contract: new managers are pending, zero-access, and the
// admin gets exactly one chance to capture the invite token.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("manager invite — create-time contract", () => {
	test("POST /api/admin/managers creates a pending manager and returns one-shot token", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("contract");
			const { managerId, token, expiresAt } = await inviteManager(
				adminCtx,
				email,
			);
			expect(managerId).toBeTruthy();
			expect(token.length).toBeGreaterThan(20);
			expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

			// List view reflects pending state and DOES NOT leak the token.
			const list = await adminCtx.request
				.get("/api/admin/managers")
				.then((r) => r.json());
			const row = list.data.managers.find(
				(m: { id: string }) => m.id === managerId,
			);
			expect(row).toBeTruthy();
			expect(row.status).toBe("pending");
			expect(row.permissions).toEqual([]);
			expect(row.hasOutstandingInvite).toBe(true);
			expect(row.inviteToken).toBeUndefined();
		} finally {
			await adminCtx.close();
		}
	});

	test("pending manager cannot log in (no password set)", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const otherCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("nologin");
			await inviteManager(adminCtx, email);
			const res = await otherCtx.request.post("/api/auth/login", {
				data: { email, password: PASSWORD },
			});
			expect(res.status(), "pending manager has no creds yet").toBe(401);
		} finally {
			await adminCtx.close();
			await otherCtx.close();
		}
	});

	test("permissions cannot be granted while pending — PATCH returns 4xx", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("nogrant");
			const { managerId } = await inviteManager(adminCtx, email);

			const grant = await adminCtx.request.patch(
				`/api/admin/managers/${managerId}`,
				{ data: { permissions: ["audit.view"] } },
			);
			// Server uses ErrInvalidAction (400) for "wrong state for this op".
			expect(grant.status()).toBeGreaterThanOrEqual(400);
			expect(grant.status()).toBeLessThan(500);

			// Permission set must still be empty.
			const after = await adminCtx.request
				.get(`/api/admin/managers/${managerId}`)
				.then((r) => r.json());
			expect(after.data.manager.permissions).toEqual([]);
		} finally {
			await adminCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Public preview + accept + reject
// ─────────────────────────────────────────────────────────────────────────────

test.describe("manager invite — public flow", () => {
	test("GET /api/auth/invites/<token> returns the invite preview (no auth needed)", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const anonCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("preview");
			const { token } = await inviteManager(adminCtx, email);

			const res = await anonCtx.request.get(`/api/auth/invites/${token}`);
			expect(res.ok()).toBeTruthy();
			const body = await res.json();
			expect(body.data.invite.email).toBe(email);
			expect(body.data.invite.openable).toBe(true);
			// We should NOT leak the token back even though the caller has
			// it — the response shape is fixed and the token isn't echoed.
			expect(JSON.stringify(body)).not.toContain(token);
		} finally {
			await adminCtx.close();
			await anonCtx.close();
		}
	});

	test("accept flow: sets password, flips status to active, mints session, is single-use", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const inviteCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("accept");
			const { managerId, token } = await inviteManager(adminCtx, email);

			// Manager accepts with a new password.
			const newPassword = "manager-set-this-1";
			const accept = await inviteCtx.request.post(
				`/api/auth/invites/${token}/accept`,
				{ data: { password: newPassword } },
			);
			expect(
				accept.ok(),
				`accept (status ${accept.status()})`,
			).toBeTruthy();

			// Session cookies were set on the invite context (login was
			// performed as part of accept) — probe /api/auth/session.
			const probe = await inviteCtx.request
				.get("/api/auth/session")
				.then((r) => r.json());
			expect(probe.data?.user?.email).toBe(email);
			expect(probe.data?.user?.role).toBe("manager");

			// Roster reflects the new state.
			const list = await adminCtx.request
				.get("/api/admin/managers")
				.then((r) => r.json());
			const row = list.data.managers.find(
				(m: { id: string }) => m.id === managerId,
			);
			expect(row.status).toBe("active");
			expect(row.hasOutstandingInvite).toBe(false);
			expect(row.inviteAcceptedAt).toBeTruthy();

			// Single-use: a second accept with the same token fails.
			const dup = await inviteCtx.request.post(
				`/api/auth/invites/${token}/accept`,
				{ data: { password: "second-attempt-1" } },
			);
			expect(dup.status()).toBeGreaterThanOrEqual(400);
			expect(dup.status()).toBeLessThan(500);

			// Independent login with the new password also works.
			const fresh = await browser.newContext();
			try {
				const login = await fresh.request.post("/api/auth/login", {
					data: { email, password: newPassword },
				});
				expect(login.ok()).toBeTruthy();
			} finally {
				await fresh.close();
			}
		} finally {
			await adminCtx.close();
			await inviteCtx.close();
		}
	});

	test("reject flow: closes the invite and locks the account out", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const inviteCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("reject");
			const { managerId, token } = await inviteManager(adminCtx, email);

			const reject = await inviteCtx.request.post(
				`/api/auth/invites/${token}/reject`,
			);
			expect(reject.ok()).toBeTruthy();

			// Listing now shows the rejection.
			const list = await adminCtx.request
				.get("/api/admin/managers")
				.then((r) => r.json());
			const row = list.data.managers.find(
				(m: { id: string }) => m.id === managerId,
			);
			expect(row.status).toBe("rejected");
			expect(row.inviteRejectedAt).toBeTruthy();
			expect(row.hasOutstandingInvite).toBe(false);

			// A subsequent accept on the same token must fail (single-use).
			const acceptAfter = await inviteCtx.request.post(
				`/api/auth/invites/${token}/accept`,
				{ data: { password: "should-not-work-1" } },
			);
			expect(acceptAfter.status()).toBeGreaterThanOrEqual(400);

			// And granting permissions is still blocked (rejected ≠ active).
			const grant = await adminCtx.request.patch(
				`/api/admin/managers/${managerId}`,
				{ data: { permissions: ["audit.view"] } },
			);
			expect(grant.status()).toBeGreaterThanOrEqual(400);
		} finally {
			await adminCtx.close();
			await inviteCtx.close();
		}
	});

	test("preview endpoint returns 404 on a bogus token", async ({
		browser,
	}) => {
		const ctx = await browser.newContext();
		try {
			const res = await ctx.request.get(
				"/api/auth/invites/not-a-real-token",
			);
			expect(res.status()).toBe(404);
		} finally {
			await ctx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Resend invite
// ─────────────────────────────────────────────────────────────────────────────

test.describe("manager invite — resend", () => {
	test("admin can resend, old token becomes invalid, new one accepts", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const inviteCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("resend");
			const { managerId, token: original } = await inviteManager(
				adminCtx,
				email,
			);

			const resend = await adminCtx.request.post(
				`/api/admin/managers/${managerId}/resend-invite`,
			);
			expect(resend.ok()).toBeTruthy();
			const resendBody = await resend.json();
			const fresh: string = resendBody.data.invite.token;
			expect(fresh).not.toBe(original);

			// Old token no longer accepts.
			const oldAccept = await inviteCtx.request.post(
				`/api/auth/invites/${original}/accept`,
				{ data: { password: "old-token-attempt-1" } },
			);
			expect(oldAccept.status()).toBeGreaterThanOrEqual(400);

			// New token accepts.
			const newAccept = await inviteCtx.request.post(
				`/api/auth/invites/${fresh}/accept`,
				{ data: { password: "new-token-1" } },
			);
			expect(newAccept.ok()).toBeTruthy();
		} finally {
			await adminCtx.close();
			await inviteCtx.close();
		}
	});

	test("resend-invite is admin-only (manager cannot resend their own)", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const otherCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("resend-acl");
			const { managerId } = await inviteManager(adminCtx, email);

			// Buyer tries to resend → 403.
			await loginOrSkip(otherCtx, BUYER_EMAIL);
			const res = await otherCtx.request.post(
				`/api/admin/managers/${managerId}/resend-invite`,
			);
			expect(res.status()).toBe(403);
		} finally {
			await adminCtx.close();
			await otherCtx.close();
		}
	});

	test("resend after a previously-active manager refuses (different flow than reset)", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const inviteCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("resend-active");
			const { managerId, token } = await inviteManager(adminCtx, email);

			// Accept normally first.
			const accept = await inviteCtx.request.post(
				`/api/auth/invites/${token}/accept`,
				{ data: { password: "first-set-1" } },
			);
			expect(accept.ok()).toBeTruthy();

			// Now try to resend on an active manager → 400.
			const resend = await adminCtx.request.post(
				`/api/admin/managers/${managerId}/resend-invite`,
			);
			expect(resend.status()).toBeGreaterThanOrEqual(400);
			expect(resend.status()).toBeLessThan(500);
		} finally {
			await adminCtx.close();
			await inviteCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Public page renders (anonymous access)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/invite/<token> page", () => {
	test("anonymous user can reach the invite page (it is public)", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const anonCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("page");
			const { token } = await inviteManager(adminCtx, email);

			const page = await anonCtx.newPage();
			await page.goto(`/invite/${token}`);
			// Should NOT have been bounced to /login.
			await expect(page).toHaveURL(/\/invite\//, { timeout: 10_000 });
			// Either the form (openable) or the closed-state shows up; pending
			// invites always show the form.
			await expect(page.getByTestId("invite-form")).toBeVisible({
				timeout: 10_000,
			});
		} finally {
			await adminCtx.close();
			await anonCtx.close();
		}
	});

	test("decline path renders the rejected state", async ({ browser }) => {
		const adminCtx = await browser.newContext();
		const anonCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			const email = freshEmail("page-decline");
			const { token } = await inviteManager(adminCtx, email);

			const page = await anonCtx.newPage();
			await page.goto(`/invite/${token}`);
			await expect(page.getByTestId("invite-form")).toBeVisible();
			await page.getByTestId("invite-decline").click();
			await expect(page.getByTestId("invite-rejected")).toBeVisible({
				timeout: 10_000,
			});
		} finally {
			await adminCtx.close();
			await anonCtx.close();
		}
	});
});
