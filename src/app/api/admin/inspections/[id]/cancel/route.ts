import { z } from "zod";
import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withAdmin, withApiHandler } from "@/server/lib";
import { cancelInspection } from "@/server/services/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z
	.object({
		reason: z.string().trim().max(500).optional(),
	})
	.strict();

// Admin-only: cancellation soft-deletes the inspection and notifies both
// parties. Too destructive to delegate through `live.view`.
export const POST = withApiHandler<Ctx>(
	{
		route: "/api/admin/inspections/:id/cancel",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAdmin<Ctx>(async ({ req, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = bodySchema.safeParse(body ?? {});
		if (!parsed.success) throw ErrInvalidFields;

		const inspection = await cancelInspection({
			id,
			reason: parsed.data.reason,
		});
		return ok({ inspection });
	}),
);
