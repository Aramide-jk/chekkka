import { ok, withApiHandler, withRole } from "@/server/lib";
import { listForBooking } from "@/server/services/inspectorProfiles";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/inspectors",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withRole(["buyer", "admin"], async ({ req }) => {
		const { searchParams } = new URL(req.url);
		const city = searchParams.get("city") || undefined;
		const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
		const items = await listForBooking({ city, limit, offset: 0 });
		return ok({ inspectors: items });
	}),
);
