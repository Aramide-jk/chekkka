import type { NextRequest } from "next/server";
import { clearAuthCookies, ok, withApiHandler } from "@/server/lib";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/auth/logout",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	async (_args: { req: NextRequest; context: unknown }) => {
		const res = ok({ ok: true }, "Signed out");
		return clearAuthCookies(res);
	},
);
