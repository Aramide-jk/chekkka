import { expect, test } from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const BUYER_EMAIL = "buyer@test.local";
const INSPECTOR_EMAIL = "inspector@test.local";

// Bytes of a real 1x1 white JPEG. Identical to inspection-flow.spec.ts so any
// dev quirk that breaks one test breaks both — easier to diagnose.
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
	return Buffer.concat([JPEG_1x1_WHITE, Buffer.from(`-${label}`)]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Drives the actual UI on /inspector/inspections/[id]/live: click "Capture",
// pass bytes via setInputFiles, then verify the server stored the photo. This
// catches client-side bugs (wrong Content-Type, FormData mishandling) that
// pure API-level tests can't see.
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Inspector live capture UI uploads photos", () => {
	test("clicking Capture in the browser uploads the picked file", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		const inspectorCtx = await browser.newContext();
		try {
			const buyerLogin = await buyerCtx.request.post("/api/auth/login", {
				data: { email: BUYER_EMAIL, password: PASSWORD },
			});
			if (buyerLogin.status() !== 200) {
				test.skip(true, "Run `yarn seed` first.");
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

			const meRes = await inspectorCtx.request.get("/api/users/me");
			const me = await meRes.json();
			const assignedInspectorId: string =
				me?.data?.user?._id ?? me?.data?.user?.id;
			expect(assignedInspectorId).toBeTruthy();

			// Buyer books with inspector pre-assigned.
			const created = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "standard",
					car: {
						make: "UIUpload",
						model: "Spec",
						year: 2024,
						sellerType: "private",
						city: "Lagos",
						address: "UI upload address",
					},
					assignedInspectorId,
				},
			});
			expect(
				created.ok(),
				`create inspection (${created.status()})`,
			).toBeTruthy();
			const inspectionId: string = (await created.json()).data?.inspection
				?._id;
			expect(inspectionId).toBeTruthy();

			// Move to in_progress so the inspector can upload.
			const startRes = await inspectorCtx.request.patch(
				`/api/inspections/${inspectionId}`,
				{
					data: {
						acceptedAt: new Date().toISOString(),
						startedAt: new Date().toISOString(),
						status: "in_progress",
					},
				},
			);
			expect(startRes.ok(), "inspector starts").toBeTruthy();

			// Drive the UI as the inspector.
			const page = await inspectorCtx.newPage();
			const consoleErrors: string[] = [];
			page.on("console", (m) => {
				if (m.type() === "error") consoleErrors.push(m.text());
			});
			const failedRequests: Array<{ url: string; status: number }> = [];
			const uploadResponses: Array<{
				url: string;
				status: number;
				method: string;
				contentType: string | null;
			}> = [];
			page.on("response", async (r) => {
				const url = r.url();
				if (url.includes("/api/inspections/")) {
					const ct = r.request().headers()["content-type"] ?? null;
					uploadResponses.push({
						url,
						status: r.status(),
						method: r.request().method(),
						contentType: ct,
					});
				}
				if (url.includes("/api/inspections/") && r.status() >= 400) {
					failedRequests.push({ url, status: r.status() });
				}
			});

			await page.goto(`/inspector/inspections/${inspectionId}/live`);
			await expect(page.getByTestId("section-picker")).toBeVisible({
				timeout: 10_000,
			});

			// The capture button triggers a hidden <input type=file>. Setting
			// input files directly is the documented Playwright pattern for
			// hidden file inputs — equivalent to a real user picking a file in
			// the OS dialog.
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles({
				name: "ui-capture.jpg",
				mimeType: "image/jpeg",
				buffer: jpegFor("ui-capture-1"),
			});

			// Wait for the server to actually persist the photo, not just the
			// optimistic local count to bump. Polling the photo list is the
			// cleanest cross-stack signal.
			await expect
				.poll(
					async () => {
						const res = await inspectorCtx.request.get(
							`/api/inspections/${inspectionId}/photos`,
						);
						if (!res.ok()) return -1;
						const body = await res.json();
						return (body?.data?.photos ?? []).length;
					},
					{
						timeout: 15_000,
						message:
							"Photo upload via UI never landed on the server. " +
							`console errors: ${JSON.stringify(consoleErrors)}; ` +
							`failed requests: ${JSON.stringify(failedRequests)}; ` +
							`upload responses: ${JSON.stringify(uploadResponses)}`,
					},
				)
				.toBeGreaterThanOrEqual(1);

			// Inspect what the server actually persisted.
			const photosRes = await inspectorCtx.request.get(
				`/api/inspections/${inspectionId}/photos`,
			);
			const photoList = (await photosRes.json()).data?.photos ?? [];
			console.log(
				"[upload-test] first photo:",
				JSON.stringify(photoList[0], null, 2),
			);
			console.log(
				"[upload-test] upload responses captured:",
				JSON.stringify(uploadResponses, null, 2),
			);

			// Find the POST response specifically.
			const postResp = uploadResponses.find(
				(r) => r.method === "POST" && r.url.endsWith("/photos"),
			);
			expect(postResp, "POST /photos was fired").toBeTruthy();
			expect(
				postResp?.status,
				`POST returned ${postResp?.status}, body should be 2xx`,
			).toBeLessThan(300);

			// Second upload — same input, fresh bytes. Confirms the flow
			// is repeatable and the optimistic counter doesn't accumulate.
			await fileInput.setInputFiles({
				name: "ui-capture-2.jpg",
				mimeType: "image/jpeg",
				buffer: jpegFor("ui-capture-2"),
			});
			await expect
				.poll(
					async () => {
						const res = await inspectorCtx.request.get(
							`/api/inspections/${inspectionId}/photos`,
						);
						if (!res.ok()) return -1;
						const body = await res.json();
						return (body?.data?.photos ?? []).length;
					},
					{ timeout: 15_000 },
				)
				.toBeGreaterThanOrEqual(2);

			// On-screen counter reflects the two uploads (not 4, which was the
			// pre-fix drift from never resetting the optimistic local count).
			await expect(page.getByTestId("photo-count-pill")).toContainText(
				"2/30 photos",
				{ timeout: 10_000 },
			);

			// Captures grid renders one thumbnail per stored photo, with a
			// real `<img src=…>` from the resolved S3/CDN url.
			const thumbs = page.getByTestId("capture-thumb");
			await expect(thumbs).toHaveCount(2, { timeout: 10_000 });
			const firstSrc = await thumbs
				.first()
				.locator("img")
				.getAttribute("src");
			expect(
				firstSrc,
				`thumbnail should render an <img src=…> (got: ${firstSrc})`,
			).toBeTruthy();
			expect(firstSrc).toMatch(/^(https?:|\/)/);

			await page.close();
		} finally {
			await buyerCtx.close();
			await inspectorCtx.close();
		}
	});
});
