import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	test,
} from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const BUYER_EMAIL = "buyer@test.local";
const OTHER_BUYER_EMAIL = "buyer2@test.local";

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
			`Seed user ${email} missing — run \`yarn seed\` first.`,
		);
	}
	return res;
}

async function firstCompletedInspectionId(
	req: APIRequestContext,
): Promise<string | undefined> {
	const list = await req.get("/api/inspections");
	const body = await list.json();
	const inspections: Array<{ _id: string; status: string }> =
		body.data?.inspections ?? [];
	return (
		inspections.find((i) => i.status === "completed")?._id ??
		inspections[0]?._id
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Share links: an owner mints a nonce, anyone with the link reads the report
// (no auth), and the report is read-only. A bogus nonce 404s, and a non-owner
// cannot mint a link.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Inspection share links", () => {
	test("owner mints a share link and an anonymous visitor can read it", async ({
		browser,
	}) => {
		const ownerCtx = await browser.newContext();
		const anonCtx = await browser.newContext();
		try {
			await loginOrSkip(ownerCtx, BUYER_EMAIL);
			const id = await firstCompletedInspectionId(ownerCtx.request);
			if (!id) test.skip(true, "Seed has no buyer inspections.");

			// Mint the share link.
			const share = await ownerCtx.request.post(
				`/api/inspections/${id}/share`,
			);
			expect(
				share.status(),
				`share mint status ${share.status()}`,
			).toBeLessThan(400);
			const shareBody = await share.json();
			const nonce: string | undefined = shareBody.data?.nonce;
			const path: string | undefined = shareBody.data?.path;
			expect(nonce, "nonce returned").toBeTruthy();
			expect(path).toBe(`/share/${nonce}`);

			// Anonymous (separate context, no cookies) opens the link.
			await anonCtx.clearCookies();
			const anonPage = await anonCtx.newPage();
			const resp = await anonPage.goto(`/share/${nonce}`);
			expect(
				resp?.status(),
				`anon share page status ${resp?.status()}`,
			).toBeLessThan(400);
			// Did NOT get bounced to login — share pages are public.
			expect(anonPage.url()).not.toMatch(/\/login(\?|$)/);
			await expect(anonPage.getByTestId("inspection-tabs")).toBeVisible({
				timeout: 10_000,
			});
			await anonPage.close();
		} finally {
			await ownerCtx.close();
			await anonCtx.close();
		}
	});

	test("a bogus share nonce returns 404", async ({ page, context }) => {
		await context.clearCookies();
		const resp = await page.goto("/share/this-nonce-does-not-exist", {
			waitUntil: "domcontentloaded",
		});
		expect(resp?.status()).toBe(404);
	});

	test("a non-owner cannot mint a share link (403)", async ({ browser }) => {
		const ownerCtx = await browser.newContext();
		const otherCtx = await browser.newContext();
		try {
			await loginOrSkip(ownerCtx, BUYER_EMAIL);
			const id = await firstCompletedInspectionId(ownerCtx.request);
			if (!id) test.skip(true, "Seed has no buyer inspections.");

			await loginOrSkip(otherCtx, OTHER_BUYER_EMAIL);
			const res = await otherCtx.request.post(
				`/api/inspections/${id}/share`,
			);
			expect(res.status()).toBe(403);
		} finally {
			await ownerCtx.close();
			await otherCtx.close();
		}
	});

	test("minting a share link requires auth (401 when anonymous)", async ({
		context,
	}) => {
		await context.clearCookies();
		// Use a syntactically-valid-looking id; auth is checked before lookup.
		const res = await context.request.post(
			"/api/inspections/000000000000000000000000/share",
		);
		expect(res.status()).toBe(401);
	});
});
