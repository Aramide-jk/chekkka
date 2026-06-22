import { ErrForbidden, ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { setAvailability } from "@/server/services/inspectorProfiles";
import { setAvailabilityBodySchema } from "@/server/validators/inspectorProfiles/validate";

export const runtime = "nodejs";

export const PATCH = withApiHandler(
	{
		route: "/api/inspector-profiles/availability",
		rateLimit: { windowMs: 60_000, maxRequests: 120 },
	},
	withAuth(async ({ req, auth }) => {
		if (auth.role !== "inspector") throw ErrForbidden;
		const body = await req.json().catch(() => null);
		const parsed = setAvailabilityBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;
		await setAvailability({
			userId: auth.userId,
			toggleOn: parsed.data.toggleOn,
		});
		return ok({ toggleOn: parsed.data.toggleOn });
	}),
);
