import { z } from "zod";
import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withAdmin, withApiHandler } from "@/server/lib";
import { assignSpecialRequest } from "@/server/services/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z
	.object({
		inspectorId: z.string().trim().min(1),
		customPrice: z.number().int().positive().max(100_000_000),
	})
	.strict();

// Admin-only: pricing + assigning a job determines who gets paid and how much.
export const POST = withApiHandler<Ctx>(
	{
		route: "/api/admin/special-requests/:id/assign",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAdmin<Ctx>(async ({ req, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = bodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const inspection = await assignSpecialRequest({
			id,
			inspectorId: parsed.data.inspectorId,
			customPrice: parsed.data.customPrice,
		});
		return ok({ inspection });
	}),
);
