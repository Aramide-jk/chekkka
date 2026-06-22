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

async function userId(req: APIRequestContext): Promise<string> {
	const res = await req.get("/api/users/me");
	const body = await res.json();
	const id: string | undefined =
		body?.data?.user?._id ?? body?.data?.user?.id;
	expect(id, "user id").toBeTruthy();
	return id as string;
}

const SPECIAL_CAR = {
	make: "QueueProbe",
	model: "Special",
	year: 2023,
	sellerType: "private" as const,
	city: "Lagos",
	address: "Special-request probe address",
};

// ─────────────────────────────────────────────────────────────────────────────
// Dispute resolution — admin flips an open dispute to resolved with an outcome.
// Uses the seeded open dispute; the assertion is resolve-idempotent so it holds
// on local re-runs (resolving an already-resolved dispute still returns the
// resolved state).
// ─────────────────────────────────────────────────────────────────────────────

test.describe("admin disputes — resolve", () => {
	test("admin resolves a dispute in favour of the buyer", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);

		const list = await context.request.get("/api/admin/disputes");
		expect(list.ok()).toBeTruthy();
		const disputes: Array<{ _id: string; status: string }> =
			(await list.json()).data?.disputes ?? [];
		if (disputes.length === 0) {
			test.skip(true, "No seeded disputes — run `yarn seed`.");
			return;
		}
		const target = disputes.find((d) => d.status === "open") ?? disputes[0];

		const res = await context.request.post(
			`/api/admin/disputes/${target._id}/resolve`,
			{ data: { resolution: "buyer" } },
		);
		expect(res.ok(), `resolve status ${res.status()}`).toBeTruthy();
		const updated = (await res.json()).data?.dispute;
		expect(updated?.status).toBe("resolved");
		expect(updated?.resolution).toBe("buyer");
	});

	test("resolve rejects an unknown resolution value (400)", async ({
		context,
	}) => {
		await context.clearCookies();
		await loginOrSkip(context, ADMIN_EMAIL);
		const list = await context.request.get("/api/admin/disputes");
		const disputes: Array<{ _id: string }> =
			(await list.json()).data?.disputes ?? [];
		if (disputes.length === 0) {
			test.skip(true, "No seeded disputes.");
			return;
		}
		const res = await context.request.post(
			`/api/admin/disputes/${disputes[0]._id}/resolve`,
			{ data: { resolution: "aliens" } },
		);
		expect(res.status()).toBe(400);
	});

	test("buyer cannot resolve a dispute (403)", async ({ context }) => {
		await context.clearCookies();
		// Grab an id as admin first.
		const adminCtx = context;
		await loginOrSkip(adminCtx, ADMIN_EMAIL);
		const disputes: Array<{ _id: string }> =
			(
				await adminCtx.request
					.get("/api/admin/disputes")
					.then((r) => r.json())
			).data?.disputes ?? [];
		if (disputes.length === 0) {
			test.skip(true, "No seeded disputes.");
			return;
		}
		const id = disputes[0]._id;

		await context.clearCookies();
		await loginOrSkip(context, BUYER_EMAIL);
		const res = await context.request.post(
			`/api/admin/disputes/${id}/resolve`,
			{ data: { resolution: "buyer" } },
		);
		expect(res.status()).toBe(403);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Special-request assignment — a buyer files a special_request inspection
// (price 0, unassigned). Admin assigns an inspector and sets the custom price.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("admin special-requests — assign", () => {
	test("admin assigns an inspector and custom price to a special request", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const buyerCtx = await browser.newContext();
		const inspectorCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			await loginOrSkip(inspectorCtx, INSPECTOR_EMAIL);
			const inspectorId = await userId(inspectorCtx.request);

			// Buyer files a special request.
			const created = await buyerCtx.request.post("/api/inspections", {
				data: { inspectionType: "special_request", car: SPECIAL_CAR },
			});
			expect(
				created.ok(),
				`create special request ${created.status()}`,
			).toBeTruthy();
			const ins = (await created.json()).data?.inspection;
			expect(ins?._id).toBeTruthy();
			expect(ins.inspectionType).toBe("special_request");
			expect(ins.price).toBe(0);

			// It shows up on the admin special-requests queue.
			const queue = await adminCtx.request.get(
				"/api/admin/special-requests",
			);
			expect(queue.ok()).toBeTruthy();
			const queueIds = ((await queue.json()).data?.inspections ?? []).map(
				(i: { _id: string }) => i._id,
			);
			expect(queueIds).toContain(ins._id);

			// Admin assigns.
			const assign = await adminCtx.request.post(
				`/api/admin/special-requests/${ins._id}/assign`,
				{ data: { inspectorId, customPrice: 75_000 } },
			);
			expect(
				assign.ok(),
				`assign status ${assign.status()}`,
			).toBeTruthy();
			const updated = (await assign.json()).data?.inspection;
			expect(updated.status).toBe("assigned");
			expect(updated.price).toBe(75_000);
			expect(String(updated.assignedInspectorId)).toBe(inspectorId);
		} finally {
			await adminCtx.close();
			await buyerCtx.close();
			await inspectorCtx.close();
		}
	});

	test("assigning a non-special inspection is rejected (400)", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const buyerCtx = await browser.newContext();
		const inspectorCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			await loginOrSkip(inspectorCtx, INSPECTOR_EMAIL);
			const inspectorId = await userId(inspectorCtx.request);

			// A standard inspection is NOT a special request.
			const created = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "standard",
					car: { ...SPECIAL_CAR, make: "NotSpecial" },
				},
			});
			const ins = (await created.json()).data?.inspection;
			const res = await adminCtx.request.post(
				`/api/admin/special-requests/${ins._id}/assign`,
				{ data: { inspectorId, customPrice: 50_000 } },
			);
			// The service guards inspectionType and throws ErrInvalidAction (400).
			expect(res.status()).toBe(400);
		} finally {
			await adminCtx.close();
			await buyerCtx.close();
			await inspectorCtx.close();
		}
	});

	test("assign validates the body (400 on missing price)", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const buyerCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			const created = await buyerCtx.request.post("/api/inspections", {
				data: { inspectionType: "special_request", car: SPECIAL_CAR },
			});
			const ins = (await created.json()).data?.inspection;
			const res = await adminCtx.request.post(
				`/api/admin/special-requests/${ins._id}/assign`,
				{ data: { inspectorId: "abc" } },
			);
			expect(res.status()).toBe(400);
		} finally {
			await adminCtx.close();
			await buyerCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Broker-request assignment — a buyer files a broker request against an
// inspection; admin claims it ("assign to me"), which flips status and opens a
// broker chat.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("admin broker-requests — assign", () => {
	test("admin claims a broker request and it flips to broker_assigned", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const buyerCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			const adminId = await userId(adminCtx.request);

			// Buyer needs an inspection to attach the broker request to.
			const created = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "standard",
					car: { ...SPECIAL_CAR, make: "BrokerProbe" },
				},
			});
			const inspectionId = (await created.json()).data?.inspection?._id;
			expect(inspectionId).toBeTruthy();

			const reqRes = await buyerCtx.request.post("/api/broker-requests", {
				data: {
					inspectionId,
					budget: 5_000_000,
					paymentMethod: "Bank transfer",
					deliveryAddress: "1 Test Close, Lagos",
					instructions: "Be firm.",
				},
			});
			expect(
				reqRes.status(),
				`create broker request ${reqRes.status()}`,
			).toBeLessThan(400);
			const brokerReq = (await reqRes.json()).data?.request;
			expect(brokerReq?._id).toBeTruthy();
			expect(brokerReq.status).toBeNull();

			// Admin claims it (no brokerId → admin becomes the broker).
			const assign = await adminCtx.request.post(
				`/api/admin/broker-requests/${brokerReq._id}/assign`,
				{ data: {} },
			);
			expect(assign.ok(), `assign ${assign.status()}`).toBeTruthy();
			const updated = (await assign.json()).data?.request;
			expect(updated.status).toBe("broker_assigned");
			expect(String(updated.brokerId)).toBe(adminId);
		} finally {
			await adminCtx.close();
			await buyerCtx.close();
		}
	});

	test("buyer cannot assign a broker request (admin-only, 403/401)", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		try {
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			const created = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "standard",
					car: { ...SPECIAL_CAR, make: "BrokerAcl" },
				},
			});
			const inspectionId = (await created.json()).data?.inspection?._id;
			const reqRes = await buyerCtx.request.post("/api/broker-requests", {
				data: {
					inspectionId,
					budget: 4_000_000,
					paymentMethod: "Cash",
					deliveryAddress: "2 Test Close, Lagos",
				},
			});
			const brokerReq = (await reqRes.json()).data?.request;
			const res = await buyerCtx.request.post(
				`/api/admin/broker-requests/${brokerReq._id}/assign`,
				{ data: {} },
			);
			expect([401, 403]).toContain(res.status());
		} finally {
			await buyerCtx.close();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Overdue reminder — admin nudges an inspector whose report is overdue.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("admin overdue — remind", () => {
	test("admin reminds the inspector on an assigned inspection", async ({
		browser,
	}) => {
		const adminCtx = await browser.newContext();
		const buyerCtx = await browser.newContext();
		const inspectorCtx = await browser.newContext();
		try {
			await loginOrSkip(adminCtx, ADMIN_EMAIL);
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			await loginOrSkip(inspectorCtx, INSPECTOR_EMAIL);
			const inspectorId = await userId(inspectorCtx.request);

			const created = await buyerCtx.request.post("/api/inspections", {
				data: {
					inspectionType: "standard",
					car: { ...SPECIAL_CAR, make: "OverdueProbe" },
					assignedInspectorId: inspectorId,
				},
			});
			const inspectionId = (await created.json()).data?.inspection?._id;
			expect(inspectionId).toBeTruthy();

			const res = await adminCtx.request.post(
				`/api/admin/inspections/${inspectionId}/remind`,
			);
			expect(res.ok(), `remind status ${res.status()}`).toBeTruthy();
			expect((await res.json()).data?.reminded).toBe(true);
		} finally {
			await adminCtx.close();
			await buyerCtx.close();
			await inspectorCtx.close();
		}
	});

	test("remind requires auth (401 when anonymous)", async ({ context }) => {
		await context.clearCookies();
		const res = await context.request.post(
			"/api/admin/inspections/000000000000000000000000/remind",
		);
		expect(res.status()).toBe(401);
	});
});
