import { ErrForbidden } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { getInspectorDashboard } from "@/server/services/dashboard";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/dashboard/inspector",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ auth }) => {
		if (auth.role !== "inspector" && auth.role !== "admin")
			throw ErrForbidden;
		const data = await getInspectorDashboard({ userId: auth.userId });
		return ok(data);
	}),
);
