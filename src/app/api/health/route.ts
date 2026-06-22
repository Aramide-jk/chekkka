import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/server/lib";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/health", rateLimit: { windowMs: 60_000, maxRequests: 600 } },
	async (_args: { req: NextRequest; context: unknown }) => {
		return ok({ status: "ok", time: new Date().toISOString() }, "Healthy");
	},
);
