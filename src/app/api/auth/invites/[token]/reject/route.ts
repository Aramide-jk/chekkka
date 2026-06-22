import { getClientIp, ok, withApiHandler } from "@/server/lib";
import { rejectManagerInvite } from "@/server/services/managers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

// POST /api/auth/invites/:token/reject — manager declines the invite. Marks
// the account `rejected`, clears the token, and leaves the audit trail in
// place. Admin can call resend-invite to re-issue if needed.
export const POST = withApiHandler<Ctx>(
	{
		route: "/api/auth/invites/:token/reject",
		rateLimit: { windowMs: 60_000, maxRequests: 20 },
	},
	async ({ req, context }) => {
		const { token } = await context.params;
		const manager = await rejectManagerInvite({
			token,
			request: {
				ip: getClientIp(req),
				userAgent: req.headers.get("user-agent") ?? undefined,
			},
		});
		return ok({ manager }, "Invite declined");
	},
);
