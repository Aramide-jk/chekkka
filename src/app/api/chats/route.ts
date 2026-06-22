import { ErrInvalidFields } from "@/server/constants/errors";
import { created, ok, withApiHandler, withAuth } from "@/server/lib";
import { getOrCreateForBuyer, listForUser } from "@/server/services/chats";
import { createChatBodySchema } from "@/server/validators/chats/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/chats", rateLimit: { windowMs: 60_000, maxRequests: 300 } },
	withAuth(async ({ auth }) => {
		const role: "buyer" | "counterparty" =
			auth.role === "buyer" ? "buyer" : "counterparty";
		const chats = await listForUser({ userId: auth.userId, role });
		return ok({ chats });
	}),
);

export const POST = withApiHandler(
	{ route: "/api/chats", rateLimit: { windowMs: 60_000, maxRequests: 30 } },
	withAuth(async ({ req, auth }) => {
		const body = await req.json().catch(() => null);
		const parsed = createChatBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const { chat, created: wasCreated } = await getOrCreateForBuyer({
			buyerId: auth.userId,
			chatType: parsed.data.chatType,
			context: parsed.data.context,
		});
		return wasCreated ? created({ chat }) : ok({ chat });
	}),
);
