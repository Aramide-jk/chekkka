import type { NextRequest } from "next/server";
import { ErrForbidden } from "@/server/constants/errors";
import { hasPermission, ok, withApiHandler, withAuth } from "@/server/lib";
import {
	listAll,
	listByStatus,
	listOverdue,
} from "@/server/services/inspections";
import type { InspectionStatus } from "@/server/types";

export const runtime = "nodejs";

const VALID_STATUSES = new Set<InspectionStatus>([
	"submitted",
	"assigned",
	"declined",
	"scheduled",
	"in_progress",
	"report_processing",
	"completed",
]);

// Mixed-role endpoint:
//   - admin: full access (superuser)
//   - consultant: needs the in-progress feed for the live monitor
//   - manager: needs `live.view` for the standard feed or `overdue.view` when
//              ?filter=overdue
// Everyone else is 403.
export const GET = withApiHandler(
	{
		route: "/api/admin/inspections",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ req, auth }) => {
		const { searchParams } = new URL((req as NextRequest).url);
		const flag = searchParams.get("filter");
		const wantsOverdue = flag === "overdue";

		if (auth.role !== "admin" && auth.role !== "consultant") {
			const required = wantsOverdue ? "overdue.view" : "live.view";
			const allowed = await hasPermission(auth, required);
			if (!allowed) throw ErrForbidden;
		}

		if (wantsOverdue) {
			const items = await listOverdue();
			return ok({ inspections: items });
		}
		const limit = Math.min(200, Number(searchParams.get("limit") ?? 100));
		const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));
		const statusParam = searchParams.get("status") ?? "in_progress";

		// `status=any` returns every inspection across statuses — the admin
		// browse view needs this; the live monitor and queue tiles keep
		// passing concrete statuses and get the existing cached path.
		if (statusParam === "any") {
			const items = await listAll({ limit, offset });
			return ok({ inspections: items });
		}
		const status = statusParam as InspectionStatus;
		if (!VALID_STATUSES.has(status)) {
			return ok({ inspections: [] });
		}
		const items = await listByStatus({ status, limit });
		return ok({ inspections: items });
	}),
);
