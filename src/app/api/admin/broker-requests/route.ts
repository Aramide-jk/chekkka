import { ok, withApiHandler, withPermission } from "@/server/lib";
import { listAll } from "@/server/services/brokerRequests";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/admin/broker-requests",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withPermission("broker_requests.view", async () => {
		const requests = await listAll();
		return ok({ requests });
	}),
);
