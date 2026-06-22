import { ErrNotFound } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { markRead } from "@/server/services/notifications";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler<Ctx>(
	{
		route: "/api/notifications/:id/read",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth<Ctx>(async ({ auth, context }) => {
		const { id } = await context.params;
		const result = await markRead({
			notificationId: id,
			userId: auth.userId,
		});
		if (!result.updated) throw ErrNotFound;

		return ok({ unreadCount: result.unreadCount });
	}),
);
