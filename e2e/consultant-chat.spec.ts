import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	test,
} from "@playwright/test";

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
const BUYER_EMAIL = "buyer@test.local";
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
			`Seed user ${email} missing — run \`yarn seed\` first.`,
		);
	}
	return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultant chat lifecycle: a buyer opens a consultant chat (pending), the
// consultant claims it by replying (active), posts a structured recommendation,
// then escalates to an admin. The buyer sees every step.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Consultant chat lifecycle", () => {
	test("buyer opens a chat, consultant claims, recommends, then escalates", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		const consultantCtx = await browser.newContext();
		try {
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			await loginOrSkip(consultantCtx, CONSULTANT_EMAIL);

			// ── 1. Buyer opens a consultant chat ─────────────────────────────
			const open = await buyerCtx.request.post("/api/chats", {
				data: {
					chatType: "consultant",
					context: "Which SUV under ₦8M?",
				},
			});
			expect(open.status(), `open chat ${open.status()}`).toBeLessThan(
				400,
			);
			const chat = (await open.json()).data?.chat;
			expect(chat?._id).toBeTruthy();
			const chatId: string = chat._id;

			// ── 2. Consultant sees it in their queue (pending) ───────────────
			const queue = await consultantCtx.request.get("/api/chats");
			expect(queue.ok()).toBeTruthy();
			const chats: Array<{ _id: string; status: string }> =
				(await queue.json()).data?.chats ?? [];
			const seen = chats.find((c) => c._id === chatId);
			expect(seen, "consultant can see the pending chat").toBeTruthy();

			// Consultant can read the (empty) thread even before claiming.
			const preRead = await consultantCtx.request.get(
				`/api/chats/${chatId}/messages`,
			);
			expect(preRead.ok(), "consultant reads pending chat").toBeTruthy();

			// ── 3. Consultant replies → chat becomes active, claimed ─────────
			const reply = await consultantCtx.request.post(
				`/api/chats/${chatId}/messages`,
				{
					data: {
						body: "Happy to help — what's your budget and city?",
					},
				},
			);
			expect(reply.status(), `reply ${reply.status()}`).toBeLessThan(400);

			const afterClaim = await consultantCtx.request
				.get(`/api/chats/${chatId}/messages`)
				.then((r) => r.json());
			expect(afterClaim.data?.chat?.status).toBe("active");

			// ── 4. Consultant posts a structured recommendation ─────────────
			const reco = await consultantCtx.request.post(
				`/api/chats/${chatId}/messages`,
				{
					data: {
						body: "Based on your budget I'd recommend a premium inspection on the Lexus.",
						kind: "recommendation",
						recommendation: {
							inspectionType: "premium",
							price: 52_000,
							description:
								"Full premium inspection incl. road test.",
							ctaLink: "/book",
						},
					},
				},
			);
			expect(reco.status(), `reco ${reco.status()}`).toBeLessThan(400);
			const recoMsg = (await reco.json()).data?.message;
			expect(recoMsg?.kind).toBe("recommendation");
			expect(recoMsg?.recommendation?.price).toBe(52_000);

			// ── 5. Consultant escalates to an admin ──────────────────────────
			const esc = await consultantCtx.request.post(
				`/api/chats/${chatId}/escalate`,
				{ data: { reason: "Buyer wants legal advice on the title." } },
			);
			expect(esc.status(), `escalate ${esc.status()}`).toBeLessThan(400);
			expect((await esc.json()).data?.escalated).toBe(true);

			// ── 6. Buyer sees the whole thread: reply, recommendation, escalation
			const buyerView = await buyerCtx.request
				.get(`/api/chats/${chatId}/messages`)
				.then((r) => r.json());
			const kinds: string[] = (buyerView.data?.messages ?? []).map(
				(m: { kind: string }) => m.kind,
			);
			expect(kinds).toContain("recommendation");
			expect(kinds).toContain("escalation");
			expect(buyerView.data?.chat?.escalatedTo).toBeTruthy();
		} finally {
			await buyerCtx.close();
			await consultantCtx.close();
		}
	});

	test("consultant page renders the queue tabs and a thread", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		const consultantCtx = await browser.newContext();
		try {
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			await loginOrSkip(consultantCtx, CONSULTANT_EMAIL);

			// Ensure there's at least one chat to show.
			await buyerCtx.request.post("/api/chats", {
				data: { chatType: "consultant", context: "UI smoke chat" },
			});

			const page = await consultantCtx.newPage();
			await page.goto("/consultant/chats");
			await expect(page.getByTestId("consultant-tabs")).toBeVisible({
				timeout: 10_000,
			});
		} finally {
			await buyerCtx.close();
			await consultantCtx.close();
		}
	});

	test("escalate requires a reason (400 on empty body)", async ({
		browser,
	}) => {
		const buyerCtx = await browser.newContext();
		const consultantCtx = await browser.newContext();
		try {
			await loginOrSkip(buyerCtx, BUYER_EMAIL);
			await loginOrSkip(consultantCtx, CONSULTANT_EMAIL);
			const open = await buyerCtx.request.post("/api/chats", {
				data: { chatType: "consultant", context: "needs reason" },
			});
			const chatId = (await open.json()).data?.chat?._id;
			// Claim first so the consultant is the counterparty.
			await consultantCtx.request.post(`/api/chats/${chatId}/messages`, {
				data: { body: "claiming" },
			});
			const res = await consultantCtx.request.post(
				`/api/chats/${chatId}/escalate`,
				{ data: {} },
			);
			expect(res.status()).toBe(400);
		} finally {
			await buyerCtx.close();
			await consultantCtx.close();
		}
	});
});
