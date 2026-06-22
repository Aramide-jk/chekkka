import { ErrNotFound } from "@/server/constants/errors";
import { ok, withApiHandler } from "@/server/lib";
import { getManagerInviteByToken } from "@/server/services/managers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

// Public preview — used by the /invite/<token> page to greet the manager
// before they enter a password. We don't authenticate the caller because the
// token IS the credential. To avoid leaking which-emails-exist we ALWAYS
// return the same envelope shape and just flip `openable` when the token is
// dead. A bad token gets a 404 only when there's no matching row at all.
export const GET = withApiHandler<Ctx>(
	{
		route: "/api/auth/invites/:token",
		// Generous rate-limit so a manager refreshing the page or clicking
		// the link a few times never gets locked out.
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	async ({ context }) => {
		const { token } = await context.params;
		const preview = await getManagerInviteByToken(token);
		if (!preview) throw ErrNotFound;
		return ok({ invite: preview });
	},
);
