import { ErrForbidden } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import {
	inspectorEarnings,
	listForInspector,
} from "@/server/services/transactions";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/transactions/earnings",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ auth }) => {
		if (auth.role !== "inspector" && auth.role !== "admin")
			throw ErrForbidden;
		const [aggregate, transactions] = await Promise.all([
			inspectorEarnings({ inspectorId: auth.userId }),
			listForInspector({ inspectorId: auth.userId }),
		]);
		return ok({ aggregate, transactions });
	}),
);
