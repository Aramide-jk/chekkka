import { ErrForbidden, ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { updateProfile } from "@/server/services/inspectorProfiles";
import { setScheduleBodySchema } from "@/server/validators/inspectorProfiles/validate";

export const runtime = "nodejs";

export const PATCH = withApiHandler(
	{
		route: "/api/inspector-profiles/schedule",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAuth(async ({ req, auth }) => {
		if (auth.role !== "inspector") throw ErrForbidden;
		const body = await req.json().catch(() => null);
		const parsed = setScheduleBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;
		const profile = await updateProfile({
			userId: auth.userId,
			patch: {
				schedule: {
					weekly: parsed.data.weekly,
					blockedDates: (parsed.data.blockedDates ?? []).map(
						(d) => new Date(d),
					),
				},
			},
		});
		return ok({ profile });
	}),
);
