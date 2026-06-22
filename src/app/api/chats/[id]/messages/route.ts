import { ErrInvalidFields } from "@/server/constants/errors";
import { created, ok, withApiHandler, withAuth } from "@/server/lib";
import { getChatMessages, postMessage } from "@/server/services/messages";
import { postMessageBodySchema } from "@/server/validators/chats/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler<Ctx>(
	{
		route: "/api/chats/:id/messages",
		rateLimit: { windowMs: 60_000, maxRequests: 600 },
	},
	withAuth<Ctx>(async ({ auth, context }) => {
		const { id } = await context.params;
		const result = await getChatMessages({
			chatId: id,
			caller: { id: auth.userId, role: auth.role },
		});
		return ok(result);
	}),
);

export const POST = withApiHandler<Ctx>(
	{
		route: "/api/chats/:id/messages",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth<Ctx>(async ({ req, auth, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = postMessageBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const { message } = await postMessage({
			chatId: id,
			sender: { id: auth.userId, role: auth.role },
			body: parsed.data.body,
			kind: parsed.data.kind,
			recommendation: parsed.data.recommendation,
		});

		return created({ message });
	}),
);
