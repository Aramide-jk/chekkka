import { ErrInvalidFields } from "@/server/constants/errors";
import {
	created,
	getClientIp,
	ok,
	withAdmin,
	withApiHandler,
} from "@/server/lib";
import { createManager, listManagers } from "@/server/services/managers";
import { getUserById } from "@/server/services/users";
import { createManagerBodySchema } from "@/server/validators/managers/validate";

export const runtime = "nodejs";

// GET — list every manager. Admin-only by design (regular managers don't see
// the roster).
export const GET = withApiHandler(
	{
		route: "/api/admin/managers",
		rateLimit: { windowMs: 60_000, maxRequests: 120 },
	},
	withAdmin(async () => {
		const managers = await listManagers({ refreshCache: true });
		return ok({ managers });
	}),
);

// POST — create a new manager. Default permission set is the empty array; the
// admin grants individual permissions via PATCH after creation. The Zod
// schema allows passing a starter list, but `createManager` still filters it
// against the canonical permission catalogue so unknown strings can't slip in.
export const POST = withApiHandler(
	{
		route: "/api/admin/managers",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	withAdmin(async ({ req, auth }) => {
		const body = await req.json().catch(() => null);
		const parsed = createManagerBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const actor = await getUserById({ id: auth.userId }).catch(() => null);

		const result = await createManager({
			fullName: parsed.data.fullName,
			username: parsed.data.username,
			email: parsed.data.email,
			phone: parsed.data.phone,
			// Allow zero permissions — explicit by design.
			permissions: parsed.data.permissions ?? [],
			actor: { userId: auth.userId, email: actor?.email },
			request: {
				ip: getClientIp(req),
				userAgent: req.headers.get("user-agent") ?? undefined,
			},
		});

		// Return the invite token + URL to the admin caller exactly ONCE. The
		// list endpoint never exposes it; if the admin loses it they must
		// hit the resend endpoint to mint a fresh one.
		return created(
			{
				manager: result.manager,
				invite: {
					token: result.inviteToken,
					path: result.invitePath,
					expiresAt: result.inviteTokenExpiresAt.toISOString(),
				},
			},
			"Manager invited",
		);
	}),
);
