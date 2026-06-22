import { getClientIp, ok, withAdmin, withApiHandler } from "@/server/lib";
import { resendManagerInvite } from "@/server/services/managers";
import { getUserById } from "@/server/services/users";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/managers/:id/resend-invite — mint a fresh single-use token
// for a manager that hasn't yet accepted. Service rejects active/suspended
// managers so this endpoint can't be abused as a credential-reset shortcut.
export const POST = withApiHandler<Ctx>(
	{
		route: "/api/admin/managers/:id/resend-invite",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	withAdmin<Ctx>(async ({ req, auth, context }) => {
		const { id } = await context.params;
		const actor = await getUserById({ id: auth.userId }).catch(() => null);

		const result = await resendManagerInvite({
			managerId: id,
			actor: { userId: auth.userId, email: actor?.email },
			request: {
				ip: getClientIp(req),
				userAgent: req.headers.get("user-agent") ?? undefined,
			},
		});

		return ok(
			{
				manager: result.manager,
				invite: {
					token: result.inviteToken,
					path: result.invitePath,
					expiresAt: result.inviteTokenExpiresAt.toISOString(),
				},
			},
			"Invite resent",
		);
	}),
);
