import { ErrInvalidFields, ErrUserNotFound } from "@/server/constants/errors";
import { ok, withApiHandler, withAuth } from "@/server/lib";
import { toSessionUser } from "@/server/lib/session";
import { getUserById, updateUser } from "@/server/services/users";
import { updateMeBodySchema } from "@/server/validators/users/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/users/me",
		rateLimit: { windowMs: 60_000, maxRequests: 300 },
	},
	withAuth(async ({ auth }) => {
		const user = await getUserById({ id: auth.userId });
		if (!user) throw ErrUserNotFound;
		return ok({ user: toSessionUser(user) });
	}),
);

export const PATCH = withApiHandler(
	{
		route: "/api/users/me",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAuth(async ({ req, auth }) => {
		const body = await req.json().catch(() => null);
		const parsed = updateMeBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const user = await updateUser({
			id: auth.userId,
			payload: parsed.data,
		});
		if (!user) throw ErrUserNotFound;
		return ok({ user: toSessionUser(user) });
	}),
);
