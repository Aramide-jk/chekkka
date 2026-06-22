import type { NextRequest } from "next/server";
import { fail, ok, withApiHandler } from "@/server/lib";
import { setAuthCookies } from "@/server/lib/cookies";
import { toSessionUser } from "@/server/lib/session";
import { getSession } from "@/server/services/auth";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/auth/session",
		rateLimit: { windowMs: 60_000, maxRequests: 600 },
	},
	async ({ req }: { req: NextRequest; context: unknown }) => {
		const session = await getSession({ req });
		if (!session) return fail(401, "Not signed in");

		const res = ok({ user: toSessionUser(session.user) }, "Session active");
		if (session.auth.refreshed && session.auth.newTokens) {
			setAuthCookies(res, session.auth.newTokens);
		}
		return res;
	},
);
