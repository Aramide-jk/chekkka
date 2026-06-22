import {
	ErrForbidden,
	ErrInspectionNotFound,
	ErrInvalidFields,
} from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import {
	getInspectionById,
	updateInspection,
} from "@/server/services/inspections";
import type { InspectionStatus } from "@/server/types";
import { updateInspectionBodySchema } from "@/server/validators/inspections/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function canAccess(
	role: string,
	userId: string,
	ins: {
		buyerId: { toString(): string };
		inspectorId?: unknown;
		assignedInspectorId?: unknown;
	},
) {
	if (role === "admin" || role === "consultant") return true;
	if (role === "buyer") return ins.buyerId.toString() === userId;
	if (role === "inspector") {
		const insp = (
			ins.inspectorId as { toString(): string } | undefined
		)?.toString();
		const assigned = (
			ins.assignedInspectorId as { toString(): string } | undefined
		)?.toString();
		return insp === userId || assigned === userId;
	}
	return false;
}

export const GET = withApiHandler<Ctx>(
	{
		route: "/api/inspections/:id",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth<Ctx>(async ({ auth, context }) => {
		const { id } = await context.params;
		const ins = await getInspectionById({ id });
		if (!ins) throw ErrInspectionNotFound;
		if (!canAccess(auth.role, auth.userId, ins)) throw ErrForbidden;
		return ok({ inspection: ins });
	}),
);

export const PATCH = withApiHandler<Ctx>(
	{
		route: "/api/inspections/:id",
		rateLimit: { windowMs: 60_000, maxRequests: 120 },
	},
	withAuth<Ctx>(async ({ req, auth, context }) => {
		const { id } = await context.params;
		const ins = await getInspectionById({ id });
		if (!ins) throw ErrInspectionNotFound;
		if (!canAccess(auth.role, auth.userId, ins)) throw ErrForbidden;

		const body = await req.json().catch(() => null);
		const parsed = updateInspectionBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const patch: Record<string, unknown> = { ...parsed.data };
		if (parsed.data.status)
			patch.status = parsed.data.status as InspectionStatus;
		for (const k of [
			"sellerContactedAt",
			"acceptedAt",
			"startedAt",
			"completedPhysicalAt",
			"completedAt",
			"scheduledFor",
		] as const) {
			if (parsed.data[k]) patch[k] = new Date(parsed.data[k] as string);
		}

		const updated = await updateInspection({ id, previous: ins, patch });
		return ok({ inspection: updated });
	}),
);
