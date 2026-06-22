import {
	ErrForbidden,
	ErrInspectionNotFound,
	ErrInvalidFields,
} from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import {
	getInspectionById,
	type IReport,
	submitReport,
} from "@/server/services/inspections";
import { reportBodySchema } from "@/server/validators/inspections/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler<Ctx>(
	{
		route: "/api/inspections/:id/report",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAuth<Ctx>(async ({ req, auth, context }) => {
		if (auth.role !== "inspector" && auth.role !== "admin")
			throw ErrForbidden;
		const { id } = await context.params;
		const ins = await getInspectionById({ id });
		if (!ins) throw ErrInspectionNotFound;
		if (
			auth.role === "inspector" &&
			(
				ins.inspectorId as { toString(): string } | undefined
			)?.toString() !== auth.userId &&
			(
				ins.assignedInspectorId as { toString(): string } | undefined
			)?.toString() !== auth.userId
		) {
			throw ErrForbidden;
		}

		const body = await req.json().catch(() => null);
		const parsed = reportBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const updated = await submitReport({
			id,
			current: ins,
			report: parsed.data.report as unknown as IReport,
			lock: parsed.data.lock,
		});

		return ok({ inspection: updated });
	}),
);
