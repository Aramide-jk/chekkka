import { ErrForbidden } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { getBuyerDashboard } from "@/server/services/dashboard";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/dashboard/buyer",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ auth }) => {
		if (auth.role !== "buyer" && auth.role !== "admin") throw ErrForbidden;
		const data = await getBuyerDashboard({ buyerId: auth.userId });
		return ok(data);
	}),
);
