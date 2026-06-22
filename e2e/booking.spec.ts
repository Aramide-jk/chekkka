import { expect, test } from "@playwright/test";

const BUYER_EMAIL = "buyer@test.local";
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";

test.describe("Booking flow with mock payment", () => {
	test("buyer can create an inspection via API then see it in their list", async ({
		request,
	}) => {
		const login = await request.post("/api/auth/login", {
			data: { email: BUYER_EMAIL, password: PASSWORD },
		});
		if (login.status() !== 200) {
			test.skip(true, "Run `npm run seed` to populate users.");
			return;
		}

		const create = await request.post("/api/inspections", {
			data: {
				inspectionType: "standard",
				car: {
					make: "Test",
					model: "E2E",
					year: 2024,
					sellerType: "private",
					city: "Lagos",
					address: "Test address",
				},
			},
		});
		expect(create.status()).toBeLessThan(400);
		const created = await create.json();
		const id = created.data?.inspection?._id;
		expect(id).toBeTruthy();

		const pay = await request.post("/api/transactions/initialize", {
			data: { inspectionId: id },
		});
		expect(pay.ok()).toBeTruthy();

		const list = await request.get("/api/inspections");
		const body = await list.json();
		const ids = (body.data?.inspections ?? []).map(
			(i: { _id: string }) => i._id,
		);
		expect(ids).toContain(id);
	});
});
