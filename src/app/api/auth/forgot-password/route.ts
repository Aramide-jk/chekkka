import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/server/lib";
import { forgotPassword } from "@/server/services/auth";
import { forgotPasswordBodySchema } from "@/server/validators/auth/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/auth/forgot-password",
		rateLimit: { windowMs: 60_000, maxRequests: 5 },
	},
	async ({ req }: { req: NextRequest; context: unknown }) => {
		const body = await req.json().catch(() => null);
		const parsed = forgotPasswordBodySchema.safeParse(body);
		if (!parsed.success) {
			return ok({ sent: true }, "If the account exists, a code was sent");
		}

		const result = await forgotPassword({
			identifier: parsed.data.identifier,
		});
		return ok(result, "If the account exists, a code was sent");
	},
);
