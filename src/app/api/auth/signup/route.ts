import type { NextRequest } from "next/server";
import {
	ErrInvalidFields,
	ErrInvalidPassword,
} from "@/server/constants/errors";
import { created, withApiHandler } from "@/server/lib";
import { attachSession, toSessionUser } from "@/server/lib/session";
import { signup } from "@/server/services/auth";
import { signupBodySchema } from "@/server/validators/auth/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/auth/signup",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	async ({ req }: { req: NextRequest; context: unknown }) => {
		const body = await req.json().catch(() => null);
		const parsed = signupBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;
		if (parsed.data.password.length < 8) throw ErrInvalidPassword;

		const user = await signup({ payload: parsed.data });

		const res = created({ user: toSessionUser(user) }, "Account created");
		return attachSession(res, user);
	},
);
