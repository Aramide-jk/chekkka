import { ErrForbidden, ErrInvalidFields } from "@/server/constants/errors";
import { created, ok, withApiHandler, withAuth } from "@/server/lib";
import {
	createInspection,
	listByStatus,
	listForBuyer,
	listForInspector,
} from "@/server/services/inspections";
import type { InspectionStatus } from "@/server/types";
import { createInspectionBodySchema } from "@/server/validators/inspections/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/inspections",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ req, auth }) => {
		const { searchParams } = new URL(req.url);
		const statusParam = searchParams.get(
			"status",
		) as InspectionStatus | null;
		const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
		const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

		if (auth.role === "inspector") {
			const items = await listForInspector({
				inspectorId: auth.userId,
				status: statusParam ?? undefined,
				limit,
				offset,
			});
			return ok({ inspections: items });
		}
		if (auth.role === "admin" || auth.role === "consultant") {
			if (!statusParam) return ok({ inspections: [] });
			const items = await listByStatus({ status: statusParam, limit });
			return ok({ inspections: items });
		}
		const items = await listForBuyer({
			buyerId: auth.userId,
			status: statusParam ?? undefined,
			limit,
			offset,
		});
		return ok({ inspections: items });
	}),
);

export const POST = withApiHandler(
	{
		route: "/api/inspections",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAuth(async ({ req, auth }) => {
		if (auth.role !== "buyer" && auth.role !== "admin") throw ErrForbidden;

		const body = await req.json().catch(() => null);
		const parsed = createInspectionBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const inspection = await createInspection({
			payload: { ...parsed.data, buyerId: auth.userId },
		});

		return created({ inspection }, "Inspection created");
	}),
);
