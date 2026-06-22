import { z } from "zod";
import { ErrInvalidFields, ErrNotFound } from "@/server/constants/errors";
import { ok, withApiHandler, withPermission } from "@/server/lib";
import { resolveDispute } from "@/server/services/disputes";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z
	.object({
		resolution: z.enum(["buyer", "inspector", "closed"]),
	})
	.strict();

export const POST = withApiHandler<Ctx>(
	{
		route: "/api/admin/disputes/:id/resolve",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withPermission<Ctx>("disputes.resolve", async ({ req, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = bodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const dispute = await resolveDispute({
			id,
			resolution: parsed.data.resolution,
		});
		if (!dispute) throw ErrNotFound;
		return ok({ dispute });
	}),
);
