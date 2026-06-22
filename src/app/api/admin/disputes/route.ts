import { ok, withApiHandler, withPermission } from "@/server/lib";
import { listAll } from "@/server/services/disputes";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/admin/disputes",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withPermission("disputes.view", async () => {
		const disputes = await listAll();
		return ok({ disputes });
	}),
);
