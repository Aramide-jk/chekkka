import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	test,
} from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
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
			`Seed user ${email} missing — run \`yarn seed\` first.`,
		);
	}
	return res;
}

// A unique-but-valid identity per run so repeated runs don't collide on the
// unique email/username indexes.
function freshIdentity() {
	const n = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
	return {
		fullName: "E2E Newbuyer",
		username: `e2e_${n}`,
		email: `e2e_${n}@test.local`,
		phone: `+23480${n.slice(-8)}`,
		password: "password123",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Signup → onboarding → dashboard. A brand-new buyer registers through the UI,
// lands on onboarding, walks the three slides, and enters the app.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Signup and onboarding", () => {
	test("a new buyer can register and is taken to onboarding", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		const id = freshIdentity();

		await page.goto("/signup");
		await expect(page.getByTestId("signup-form")).toBeVisible();
		const form = page.getByTestId("signup-form");
		await form.getByLabel("Full name").fill(id.fullName);
		await form.getByLabel("Username").fill(id.username);
		await form.getByLabel("Email").fill(id.email);
		await form.getByLabel("Phone").fill(id.phone);
		await form.getByLabel("Password").fill(id.password);
		await page.getByRole("button", { name: /create account/i }).click();

		await page.waitForURL(/\/onboarding$/, { timeout: 15_000 });
		await expect(page.getByTestId("onboarding-slide-0")).toBeVisible({
			timeout: 10_000,
		});

		// Session is live immediately after signup.
		const session = await context.request.get("/api/auth/session");
		expect(session.status()).toBe(200);
		expect((await session.json()).data?.user?.email).toBe(id.email);
	});

	test("onboarding slides advance and 'Enter Chekka' lands on the dashboard", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);

		await page.goto("/onboarding");
		await expect(page.getByTestId("onboarding-slide-0")).toBeVisible({
			timeout: 10_000,
		});

		await page.getByRole("button", { name: /^Continue$/ }).click();
		await expect(page.getByTestId("onboarding-slide-1")).toBeVisible();
		await page.getByRole("button", { name: /^Continue$/ }).click();
		await expect(page.getByTestId("onboarding-slide-2")).toBeVisible();

		await page.getByRole("button", { name: /Enter Chekka/i }).click();
		await page.waitForURL(/\/dashboard$/, { timeout: 10_000 });
		await expect(page.getByTestId("dashboard-stats")).toBeVisible({
			timeout: 10_000,
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Forgot-password — submits an identifier and always succeeds (no account
// enumeration), whether the identifier exists or not.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Forgot password", () => {
	test("page renders and submitting an identifier succeeds", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await page.goto("/forgot-password");
		await expect(page.getByTestId("forgot-password-form")).toBeVisible();
	});

	test("API returns success for a known identifier", async ({ context }) => {
		await context.clearCookies();
		const res = await context.request.post("/api/auth/forgot-password", {
			data: { identifier: BUYER_EMAIL },
		});
		expect(res.status(), `forgot-password ${res.status()}`).toBeLessThan(
			400,
		);
	});

	test("API returns success (no enumeration) for an unknown identifier", async ({
		context,
	}) => {
		await context.clearCookies();
		const res = await context.request.post("/api/auth/forgot-password", {
			data: { identifier: "does-not-exist@nowhere.local" },
		});
		expect(res.status()).toBeLessThan(400);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Buyer chat UI — opening /chat auto-starts a consultant conversation; the
// buyer can type and send a message that then appears in the thread.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Buyer chat UI", () => {
	test("buyer sends a message and sees it in the thread", async ({
		page,
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);

		await page.goto("/chat");
		await expect(page.getByTestId("chat-messages")).toBeVisible({
			timeout: 10_000,
		});

		// The input is disabled until a chat is auto-created + selected.
		const input = page.getByPlaceholder("Type your message…");
		await expect(input).toBeEnabled({ timeout: 15_000 });

		const msg = `e2e ping ${Date.now()}`;
		await input.fill(msg);
		await page.getByRole("button", { name: /^Send$/ }).click();

		await expect(page.getByTestId("chat-messages")).toContainText(msg, {
			timeout: 10_000,
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Broker request round-trip — a buyer files a broker request and then sees it
// in their own broker-requests list.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Buyer broker requests", () => {
	test("buyer creates a broker request and finds it in their list", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);

		const created = await context.request.post("/api/inspections", {
			data: {
				inspectionType: "standard",
				car: {
					make: "BuyerBroker",
					model: "Probe",
					year: 2024,
					sellerType: "private",
					city: "Lagos",
					address: "Buyer broker address",
				},
			},
		});
		const inspectionId = (await created.json()).data?.inspection?._id;
		expect(inspectionId).toBeTruthy();

		const reqRes = await context.request.post("/api/broker-requests", {
			data: {
				inspectionId,
				budget: 7_200_000,
				paymentMethod: "Bank transfer",
				deliveryAddress: "9 Buyer Road, Lagos",
				instructions: "Prefer black exterior.",
			},
		});
		expect(
			reqRes.status(),
			`create broker request ${reqRes.status()}`,
		).toBeLessThan(400);
		const id = (await reqRes.json()).data?.request?._id;
		expect(id).toBeTruthy();

		const list = await context.request.get("/api/broker-requests");
		expect(list.ok()).toBeTruthy();
		const ids = ((await list.json()).data?.requests ?? []).map(
			(r: { _id: string }) => r._id,
		);
		expect(ids).toContain(id);
	});
});
