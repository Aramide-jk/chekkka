import { z } from "zod";
import { ErrInvalidFields, ErrNotFound } from "@/server/constants/errors";
import { ok, withAdmin, withApiHandler } from "@/server/lib";
import { assignBroker } from "@/server/services/brokerRequests";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// brokerId is optional — when omitted the acting admin takes the request on
// themselves (they become the broker counterparty in the chat).
const bodySchema = z
	.object({
		brokerId: z.string().trim().min(1).optional(),
	})
	.strict();

export const POST = withApiHandler<Ctx>(
	{
		route: "/api/admin/broker-requests/:id/assign",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAdmin<Ctx>(async ({ req, auth, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => ({}));
		const parsed = bodySchema.safeParse(body ?? {});
		if (!parsed.success) throw ErrInvalidFields;

		const request = await assignBroker({
			requestId: id,
			brokerId: parsed.data.brokerId ?? auth.userId,
		});
		if (!request) throw ErrNotFound;
		return ok({ request });
	}),
);
