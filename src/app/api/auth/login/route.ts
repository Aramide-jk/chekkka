import type { NextRequest } from "next/server";
import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler } from "@/server/lib";
import { attachSession, toSessionUser } from "@/server/lib/session";
import { login } from "@/server/services/auth";
import { loginBodySchema } from "@/server/validators/auth/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/auth/login",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	async ({ req }: { req: NextRequest; context: unknown }) => {
		const body = await req.json().catch(() => null);
		const parsed = loginBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const user = await login(parsed.data);

		const res = ok({ user: toSessionUser(user) }, "Signed in");
		return attachSession(res, user);
	},
);
