import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { initialize } from "@/server/services/transactions";
import { initializeBodySchema } from "@/server/validators/transactions/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/transactions/initialize",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	withAuth(async ({ req, auth }) => {
		const body = await req.json().catch(() => null);
		const parsed = initializeBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const result = await initialize({
			buyerId: auth.userId,
			inspectionId: parsed.data.inspectionId,
		});

		return ok(result, "Payment confirmed (mock)");
	}),
);
