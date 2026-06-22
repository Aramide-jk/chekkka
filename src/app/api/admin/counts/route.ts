import { ErrForbidden } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { getCounts } from "@/server/services/admin";

export const runtime = "nodejs";

// Single round trip for the admin dashboard tile/stat counts. Each count is
// already permission-gated inside `getCounts`, so a manager only sees the
// numbers behind the tiles they can open.
export const GET = withApiHandler(
	{
		route: "/api/admin/counts",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ auth }) => {
		if (auth.role !== "admin" && auth.role !== "manager") {
			throw ErrForbidden;
		}
		const counts = await getCounts(auth);
		return ok({ counts });
	}),
);
