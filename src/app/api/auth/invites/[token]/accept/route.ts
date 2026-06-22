import { ErrInvalidFields } from "@/server/constants/errors";
import { getClientIp, ok, withApiHandler } from "@/server/lib";
import { attachSession, toSessionUser } from "@/server/lib/session";
import { acceptManagerInvite } from "@/server/services/managers";
import { getUserById } from "@/server/services/users";
import { acceptManagerInviteBodySchema } from "@/server/validators/managers/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

// POST /api/auth/invites/:token/accept — the manager-facing endpoint that
// consumes the invite. Body is a single `{ password }`. On success we attach
// a fresh session so the manager lands in `/admin` already signed-in.
export const POST = withApiHandler<Ctx>(
	{
		route: "/api/auth/invites/:token/accept",
		// Tighter limit than the preview — this minted a credential.
		rateLimit: { windowMs: 60_000, maxRequests: 20 },
	},
	async ({ req, context }) => {
		const { token } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = acceptManagerInviteBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const result = await acceptManagerInvite({
			token,
			password: parsed.data.password,
			request: {
				ip: getClientIp(req),
				userAgent: req.headers.get("user-agent") ?? undefined,
			},
		});

		// Build the same response shape /api/auth/login uses, so the invite
		// page can hand off to /admin directly without a second round-trip.
		const user = await getUserById({ id: result.userId });
		if (!user) {
			return ok({ manager: result.manager }, "Invite accepted");
		}
		const res = ok({
			manager: result.manager,
			user: toSessionUser(user),
		});
		return attachSession(res, user);
	},
);
