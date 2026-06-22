import { ok, withApiHandler, withAuth } from "@/server/lib";
import { markAllRead } from "@/server/services/notifications";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/notifications/read-all",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAuth(async ({ auth }) => {
		const result = await markAllRead({ userId: auth.userId });
		return ok(result);
	}),
);
