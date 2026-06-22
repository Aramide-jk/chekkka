import { ErrForbidden, ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import {
	getByUserId,
	resolveDocumentLinks,
	updateProfile,
} from "@/server/services/inspectorProfiles";
import { updateProfileBodySchema } from "@/server/validators/inspectorProfiles/validate";

export const runtime = "nodejs";

// Presigned-link window for the inspector's own profile — matches the
// `getByUserId` cache TTL (the data being processed).
const PROFILE_DOC_LINK_TTL_SECONDS = 60 * 5;

export const GET = withApiHandler(
	{
		route: "/api/inspector-profiles/me",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ auth }) => {
		if (auth.role !== "inspector" && auth.role !== "admin")
			throw ErrForbidden;
		const profile = await getByUserId({ userId: auth.userId });
		const resolved = profile
			? await resolveDocumentLinks(profile, PROFILE_DOC_LINK_TTL_SECONDS)
			: profile;
		return ok({ profile: resolved });
	}),
);

export const PATCH = withApiHandler(
	{
		route: "/api/inspector-profiles/me",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAuth(async ({ req, auth }) => {
		if (auth.role !== "inspector") throw ErrForbidden;
		const body = await req.json().catch(() => null);
		const parsed = updateProfileBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;
		const profile = await updateProfile({
			userId: auth.userId,
			patch: parsed.data,
		});
		return ok({ profile });
	}),
);
