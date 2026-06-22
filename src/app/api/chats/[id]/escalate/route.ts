import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { escalateChat } from "@/server/services/chats";
import { escalateBodySchema } from "@/server/validators/chats/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Ctx>(
	{
		route: "/api/chats/:id/escalate",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	withAuth<Ctx>(async ({ req, auth, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = escalateBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const result = await escalateChat({
			chatId: id,
			caller: { id: auth.userId, role: auth.role },
			reason: parsed.data.reason,
		});
		return ok(result);
	}),
);
