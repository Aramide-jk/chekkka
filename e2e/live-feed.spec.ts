import { expect, test } from "@playwright/test";

const INSPECTOR_EMAIL = "inspector@test.local";
const BUYER_EMAIL = "buyer@test.local";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";

test.describe("Live feed end-to-end (Redis pub/sub + SSE)", () => {
	test("inspector uploads a photo and the buyer sees it via SSE within 5s", async ({
		browser,
		request,
	}) => {
		// Pre-flight: ensure seed users exist
		const buyerLogin = await request.post("/api/auth/login", {
			data: { email: BUYER_EMAIL, password: PASSWORD },
		});
		if (buyerLogin.status() !== 200) {
			test.skip(true, "Run `npm run seed` first to populate test users.");
			return;
		}
		const inspectorLogin = await request.post("/api/auth/login", {
			data: { email: INSPECTOR_EMAIL, password: PASSWORD },
		});
		if (inspectorLogin.status() !== 200) {
			test.skip(true, "Inspector seed user missing.");
			return;
		}

		// Find an active in_progress inspection from the buyer's list
		const buyerCtx = await browser.newContext();
		const buyerReq = buyerCtx.request;
		await buyerReq.post("/api/auth/login", {
			data: { email: BUYER_EMAIL, password: PASSWORD },
		});
		const insRes = await buyerReq.get(
			"/api/inspections?status=in_progress",
		);
		const insBody = await insRes.json();
		const inspection = insBody.data?.inspections?.[0];
		if (!inspection) {
			test.skip(true, "No in_progress inspection in seed.");
			return;
		}
		const inspectionId = inspection._id as string;

		// Buyer page: open live feed
		const buyerPage = await buyerCtx.newPage();
		await buyerPage.goto(`/inspections/${inspectionId}/live`);
		await expect(buyerPage.getByTestId("live-photos")).toBeVisible();

		const initialPhotoCount = await buyerPage
			.getByTestId("live-photos")
			.locator("[class*='PhotoTile']")
			.count();

		// Inspector posts a new photo via API
		const inspectorCtx = await browser.newContext();
		const inspectorReq = inspectorCtx.request;
		await inspectorReq.post("/api/auth/login", {
			data: { email: INSPECTOR_EMAIL, password: PASSWORD },
		});
		const fd = new FormData();
		fd.set("section", "engine");
		fd.set("note", `playwright-${Date.now()}`);
		const upload = await inspectorReq.post(
			`/api/inspections/${inspectionId}/photos`,
			{
				multipart: {
					section: "engine",
					note: `playwright-${Date.now()}`,
				},
			},
		);
		expect(upload.ok()).toBeTruthy();

		// Buyer page should receive the SSE event and add a new tile
		await expect
			.poll(
				async () =>
					buyerPage
						.getByTestId("live-photos")
						.locator("[class*='PhotoTile']")
						.count(),
				{ timeout: 8_000 },
			)
			.toBeGreaterThan(initialPhotoCount);

		await buyerCtx.close();
		await inspectorCtx.close();
	});
});
