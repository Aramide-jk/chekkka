import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	test,
} from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const BUYER_EMAIL = "buyer@test.local";
const INSPECTOR_EMAIL = "inspector@test.local";

// A real (1x1 white) JPEG. The server doesn't run sharp in dev (no S3 creds),
// so we just need a deterministic byte string we can re-upload to test dedup.
const JPEG_1x1_WHITE = Buffer.from(
	"/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB" +
		"AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AAEQgAAQABAwEiAAIRAQMRAf/E" +
		"AB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAE" +
		"EQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZH" +
		"SElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1" +
		"tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAAwDAQACEQMRAD8A" +
		"/v4r/wD2Q==",
	"base64",
);

function jpegFor(label: string): Buffer {
	// Each photo gets unique trailing bytes so they're considered distinct.
	return Buffer.concat([JPEG_1x1_WHITE, Buffer.from(`-${label}`)]);
}

async function _loginOrSkip(
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

async function inspectorUserId(req: APIRequestContext): Promise<string> {
	const res = await req.get("/api/users/me");
	expect(res.ok(), "users/me ok").toBeTruthy();
	const body = await res.json();
	const id: string | undefined =
		body?.data?.user?._id ?? body?.data?.user?.id;
	expect(id, "inspector user id").toBeTruthy();
	return id as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full inspection lifecycle: book → pay → inspector accepts → starts → uploads
// photos → buyer watches live → inspector submits report → buyer reads it.
//
// Each test creates its own inspection so it doesn't depend on / mutate seed
// data shared with other specs.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Inspection lifecycle (book → accept → live → report)", () => {
	test("buyer books with inspector pre-assigned, inspector captures, buyer sees live, report is filed", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		const inspectorCtx = await browser.newContext();
		try {
			// ── 0. Both roles sign in (separate browser contexts so the two
			//    auth cookies don't clobber each other) ─────────────────────
			const buyerLogin = await buyerCtx.request.post("/api/auth/login", {
				data: { email: BUYER_EMAIL, password: PASSWORD },
			});
			if (buyerLogin.status() !== 200) {
				test.skip(true, "Run `npm run seed` first.");
				return;
			}
			const inspLogin = await inspectorCtx.request.post(
				"/api/auth/login",
				{
					data: { email: INSPECTOR_EMAIL, password: PASSWORD },
				},
			);
			if (inspLogin.status() !== 200) {
				test.skip(true, "Inspector seed user missing.");
				return;
			}

			const assignedInspectorId = await inspectorUserId(
				inspectorCtx.request,
			);

			// ── 1. Buyer books an inspection — and pre-assigns the test
			//    inspector. The buyer is the owner so they can later watch
			//    the live feed. ─────────────────────────────────────────────
			const create = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "premium",
					car: {
						make: "Playwright",
						model: "Flow",
						year: 2024,
						sellerType: "private",
						city: "Lagos",
						address: "127 Test Avenue",
						sellerContact: "+2348010000099",
					},
					assignedInspectorId,
				},
			});
			expect(
				create.status(),
				`create inspection (got ${create.status()})`,
			).toBeLessThan(400);
			const inspectionId: string | undefined = (await create.json()).data
				?.inspection?._id;
			expect(inspectionId, "new inspection id").toBeTruthy();
			if (!inspectionId) return;

			// ── 2. Pay (mock) — moves status forward ─────────────────────
			const pay = await buyerCtx.request.post(
				"/api/transactions/initialize",
				{
					data: { inspectionId },
				},
			);
			expect(pay.ok(), "mock payment ok").toBeTruthy();

			// Buyer sees it in their inspection list
			const list = await buyerCtx.request.get("/api/inspections");
			const buyerIds = ((await list.json()).data?.inspections ?? []).map(
				(i: { _id: string }) => i._id,
			);
			expect(buyerIds).toContain(inspectionId);

			// ── 3. Inspector accepts ─────────────────────────────────────
			const accept = await inspectorCtx.request.patch(
				`/api/inspections/${inspectionId}`,
				{
					data: {
						acceptedAt: new Date().toISOString(),
						status: "scheduled",
					},
				},
			);
			expect(
				accept.ok(),
				`inspector accept (status ${accept.status()})`,
			).toBeTruthy();

			// ── 4. Inspector starts the job (in_progress) ─────────────────
			const start = await inspectorCtx.request.patch(
				`/api/inspections/${inspectionId}`,
				{
					data: {
						startedAt: new Date().toISOString(),
						status: "in_progress",
						currentSection: "Exterior",
					},
				},
			);
			expect(start.ok(), "inspector starts").toBeTruthy();

			// ── 5. Buyer opens the live feed page ────────────────────────
			const buyerPage = await buyerCtx.newPage();
			await buyerPage.goto(`/inspections/${inspectionId}/live`);
			await expect(buyerPage.getByTestId("live-photos")).toBeVisible({
				timeout: 10_000,
			});
			const initialTiles = await buyerPage
				.getByTestId("live-photos")
				.locator("[class*='PhotoTile']")
				.count();

			// ── 6. Inspector uploads 3 unique photos ─────────────────────
			const sections = ["exterior", "interior", "engine"] as const;
			for (let i = 0; i < sections.length; i++) {
				const upload = await inspectorCtx.request.post(
					`/api/inspections/${inspectionId}/photos`,
					{
						multipart: {
							section: sections[i],
							note: `playwright-${i}-${Date.now()}`,
							photo: {
								name: `photo-${i}.jpg`,
								mimeType: "image/jpeg",
								buffer: jpegFor(`unique-${i}`),
							},
						},
					},
				);
				expect(
					upload.ok(),
					`upload ${i} ok (status ${upload.status()})`,
				).toBeTruthy();
				const photoId: string | undefined = (await upload.json()).data
					?.photo?._id;
				expect(photoId, `photo ${i} id returned`).toBeTruthy();
			}

			// ── 7. Buyer's live feed shows the new photos via SSE ────────
			await expect
				.poll(
					async () =>
						buyerPage
							.getByTestId("live-photos")
							.locator("[class*='PhotoTile']")
							.count(),
					{ timeout: 12_000 },
				)
				.toBeGreaterThanOrEqual(initialTiles + 3);

			// ── 8. Dedup probe: upload the SAME bytes again ──────────────
			//
			// A correct system should refuse the duplicate (4xx) or silently
			// reuse the existing record. What is NOT acceptable is a fresh
			// 2xx with a new _id — that would mean the server happily stored
			// the file twice.
			const photosBefore = await inspectorCtx.request.get(
				`/api/inspections/${inspectionId}/photos`,
			);
			const countBefore = ((await photosBefore.json()).data?.photos ?? [])
				.length;

			const dup = await inspectorCtx.request.post(
				`/api/inspections/${inspectionId}/photos`,
				{
					multipart: {
						section: "exterior",
						note: "duplicate-attempt",
						photo: {
							name: "photo-0.jpg",
							mimeType: "image/jpeg",
							buffer: jpegFor("unique-0"),
						},
					},
				},
			);

			const photosAfter = await inspectorCtx.request.get(
				`/api/inspections/${inspectionId}/photos`,
			);
			const photosAfterList: Array<{ _id: string; url: string }> =
				(await photosAfter.json()).data?.photos ?? [];
			const countAfter = photosAfterList.length;

			expect(
				countAfter,
				`uploading the same bytes twice MUST NOT add a new photo ` +
					`(before=${countBefore}, after=${countAfter}, ` +
					`dup-response-status=${dup.status()})`,
			).toBe(countBefore);

			// Sanity: every stored photo url is unique within one inspection.
			const urls = photosAfterList.map((p) => p.url);
			expect(
				new Set(urls).size,
				"all photo URLs in a single inspection must be unique",
			).toBe(urls.length);
			const ids = photosAfterList.map((p) => p._id);
			expect(
				new Set(ids).size,
				"all photo _ids in a single inspection must be unique",
			).toBe(ids.length);

			// ── 9. Inspector submits the final report ────────────────────
			const submit = await inspectorCtx.request.patch(
				`/api/inspections/${inspectionId}/report`,
				{
					data: {
						report: {
							overview: {
								year: 2024,
								make: "Playwright",
								model: "Flow",
							},
							exterior: [
								{ label: "Body alignment", status: "good" },
							],
							interior: [{ label: "Dashboard", status: "good" }],
							mechanical: [
								{ label: "Engine condition", status: "good" },
							],
							roadTest: [{ label: "Braking", status: "good" }],
							verdict: "good",
							summary: {
								passed: 0,
								minor: 0,
								serious: 0,
								written:
									"Auto-generated by Playwright e2e flow.",
								fixes: [],
							},
						},
						lock: true,
					},
				},
			);
			expect(
				submit.ok(),
				`submit report (status ${submit.status()})`,
			).toBeTruthy();

			// ── 10. Buyer sees the inspection marked completed ───────────
			const final = await buyerCtx.request.get(
				`/api/inspections/${inspectionId}`,
			);
			const finalIns = (await final.json()).data?.inspection;
			expect(finalIns?.status).toBe("completed");
			expect(finalIns?.reportLockedAt).toBeTruthy();

			await buyerPage.close();
		} finally {
			await buyerCtx.close();
			await inspectorCtx.close();
		}
	});

	// ─────────────────────────────────────────────────────────────────────
	// Standalone, focused dedup spec. This isolates the "same file uploaded
	// twice" check from the noise of the full lifecycle test so a future
	// failure points at the right place.
	// ─────────────────────────────────────────────────────────────────────
	test("uploading the same photo bytes twice does not create a duplicate record", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		const inspectorCtx = await browser.newContext();
		try {
			const buyerLogin = await buyerCtx.request.post("/api/auth/login", {
				data: { email: BUYER_EMAIL, password: PASSWORD },
			});
			if (buyerLogin.status() !== 200) {
				test.skip(true, "Run `npm run seed` first.");
				return;
			}
			const inspLogin = await inspectorCtx.request.post(
				"/api/auth/login",
				{
					data: { email: INSPECTOR_EMAIL, password: PASSWORD },
				},
			);
			if (inspLogin.status() !== 200) {
				test.skip(true, "Inspector seed user missing.");
				return;
			}

			const assignedInspectorId = await inspectorUserId(
				inspectorCtx.request,
			);

			// Buyer creates an inspection with the inspector pre-assigned.
			const created = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "standard",
					car: {
						make: "Dedup",
						model: "Probe",
						year: 2024,
						sellerType: "private",
						city: "Lagos",
						address: "Dedup test address",
					},
					assignedInspectorId,
				},
			});
			expect(
				created.ok(),
				`buyer create inspection (status ${created.status()})`,
			).toBeTruthy();
			const inspectionId: string = (await created.json()).data?.inspection
				?._id;
			expect(inspectionId).toBeTruthy();

			// Move to in_progress so the inspector is allowed to upload.
			await inspectorCtx.request.patch(
				`/api/inspections/${inspectionId}`,
				{
					data: {
						startedAt: new Date().toISOString(),
						status: "in_progress",
						currentSection: "Exterior",
					},
				},
			);

			const buffer = jpegFor("dedup-probe");

			// First upload — must succeed.
			const first = await inspectorCtx.request.post(
				`/api/inspections/${inspectionId}/photos`,
				{
					multipart: {
						section: "exterior",
						note: "first",
						photo: {
							name: "probe.jpg",
							mimeType: "image/jpeg",
							buffer,
						},
					},
				},
			);
			expect(
				first.ok(),
				`first upload (status ${first.status()})`,
			).toBeTruthy();
			const firstId: string | undefined = (await first.json()).data?.photo
				?._id;
			expect(firstId).toBeTruthy();

			// Second upload of the EXACT same bytes — must NOT add a new
			// record (either reject with 4xx, or return the same _id).
			const second = await inspectorCtx.request.post(
				`/api/inspections/${inspectionId}/photos`,
				{
					multipart: {
						section: "exterior",
						note: "second (should dedup)",
						photo: {
							name: "probe.jpg",
							mimeType: "image/jpeg",
							buffer,
						},
					},
				},
			);

			const list = await inspectorCtx.request.get(
				`/api/inspections/${inspectionId}/photos`,
			);
			const items: Array<{ _id: string; url: string }> =
				(await list.json()).data?.photos ?? [];

			expect(
				items.length,
				`expected 1 photo after re-uploading identical bytes, ` +
					`got ${items.length} (second-response-status ${second.status()})`,
			).toBe(1);

			expect(new Set(items.map((p) => p._id)).size).toBe(items.length);
			expect(new Set(items.map((p) => p.url)).size).toBe(items.length);
		} finally {
			await buyerCtx.close();
			await inspectorCtx.close();
		}
	});

	// ─────────────────────────────────────────────────────────────────────
	// No two photos in a single inspection should share content/url, even
	// across many "rapid double-tap" style submissions.
	// ─────────────────────────────────────────────────────────────────────
	test("no two photos in a single inspection share the same url or bytes", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		const inspectorCtx = await browser.newContext();
		try {
			const buyerLogin = await buyerCtx.request.post("/api/auth/login", {
				data: { email: BUYER_EMAIL, password: PASSWORD },
			});
			if (buyerLogin.status() !== 200) {
				test.skip(true, "Run `npm run seed` first.");
				return;
			}
			const inspLogin = await inspectorCtx.request.post(
				"/api/auth/login",
				{
					data: { email: INSPECTOR_EMAIL, password: PASSWORD },
				},
			);
			if (inspLogin.status() !== 200) {
				test.skip(true, "Inspector seed user missing.");
				return;
			}

			const assignedInspectorId = await inspectorUserId(
				inspectorCtx.request,
			);

			const created = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "standard",
					car: {
						make: "RapidDoubleTap",
						model: "Probe",
						year: 2024,
						sellerType: "private",
						city: "Lagos",
						address: "RapidDoubleTap address",
					},
					assignedInspectorId,
				},
			});
			expect(created.ok()).toBeTruthy();
			const inspectionId: string = (await created.json()).data?.inspection
				?._id;

			await inspectorCtx.request.patch(
				`/api/inspections/${inspectionId}`,
				{
					data: {
						startedAt: new Date().toISOString(),
						status: "in_progress",
					},
				},
			);

			// Upload 4 distinct photos plus one rapid retry of #2 to simulate
			// a flaky network where the client retries after the server has
			// already persisted the first attempt.
			const buffers = [
				jpegFor("front"),
				jpegFor("rear"),
				jpegFor("side-left"),
				jpegFor("side-right"),
			];
			for (let i = 0; i < buffers.length; i++) {
				const r = await inspectorCtx.request.post(
					`/api/inspections/${inspectionId}/photos`,
					{
						multipart: {
							section: "exterior",
							photo: {
								name: `p-${i}.jpg`,
								mimeType: "image/jpeg",
								buffer: buffers[i],
							},
						},
					},
				);
				expect(r.ok(), `upload ${i} ok`).toBeTruthy();
			}
			// Retry of #2 (same bytes).
			await inspectorCtx.request.post(
				`/api/inspections/${inspectionId}/photos`,
				{
					multipart: {
						section: "exterior",
						photo: {
							name: "p-1.jpg",
							mimeType: "image/jpeg",
							buffer: buffers[1],
						},
					},
				},
			);

			const list = await inspectorCtx.request.get(
				`/api/inspections/${inspectionId}/photos`,
			);
			const items: Array<{ _id: string; url: string }> =
				(await list.json()).data?.photos ?? [];

			// 4 unique uploads + 1 retry → still 4 records.
			expect(
				items.length,
				`got ${items.length} photos; the retry must not have created a new record`,
			).toBe(4);
			expect(
				new Set(items.map((p) => p.url)).size,
				"every photo url in one inspection must be unique",
			).toBe(items.length);
			expect(new Set(items.map((p) => p._id)).size).toBe(items.length);
		} finally {
			await buyerCtx.close();
			await inspectorCtx.close();
		}
	});
});
