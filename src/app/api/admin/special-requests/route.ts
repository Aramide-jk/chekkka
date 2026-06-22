import { ok, withApiHandler, withPermission } from "@/server/lib";
import { listSpecialRequests } from "@/server/services/inspections";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/admin/special-requests",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withPermission("special_requests.view", async () => {
		const inspections = await listSpecialRequests();
		return ok({ inspections });
	}),
);
