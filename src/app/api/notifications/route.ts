import { ok, withApiHandler, withAuth } from "@/server/lib";
import { listForUser, unreadCount } from "@/server/services/notifications";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/notifications",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ req, auth }) => {
		const { searchParams } = new URL(req.url);
		const limit = Math.min(100, Number(searchParams.get("limit") ?? 30));

		const [items, count] = await Promise.all([
			listForUser({ userId: auth.userId, limit }),
			unreadCount({ userId: auth.userId }),
		]);

		return ok({
			notifications: items.map((n) => ({
				_id: n._id.toString(),
				kind: n.kind,
				title: n.title,
				body: n.body,
				link: n.link,
				read: n.read,
				// `listForUser` is Redis-cached; on a cache hit createdAt
				// comes back as an ISO string, not a Date.
				createdAt: new Date(n.createdAt).toISOString(),
			})),
			unreadCount: count,
		});
	}),
);
