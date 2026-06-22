import { z } from "zod";
import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withAdmin, withApiHandler } from "@/server/lib";
import { reassignInspection } from "@/server/services/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z
	.object({
		inspectorId: z.string().trim().min(1),
	})
	.strict();

// Admin-only: reassigning an in-flight inspection changes who gets paid and
// who shows up at the seller's address — too high-impact to delegate via a
// flat `live.view` permission.
export const POST = withApiHandler<Ctx>(
	{
		route: "/api/admin/inspections/:id/reassign",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAdmin<Ctx>(async ({ req, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = bodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const inspection = await reassignInspection({
			id,
			inspectorId: parsed.data.inspectorId,
		});
		return ok({ inspection });
	}),
);
