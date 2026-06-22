import { ok, withApiHandler, withPermission } from "@/server/lib";
import { listAuditLogs } from "@/server/services/adminAuditLogs";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/admin/audit-logs",
		rateLimit: { windowMs: 60_000, maxRequests: 120 },
	},
	withPermission("audit.view", async ({ req }) => {
		const { searchParams } = new URL(req.url);
		const limit = Math.min(200, Number(searchParams.get("limit") ?? 50));
		const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));
		const action = searchParams.get("action") ?? undefined;
		const actorId = searchParams.get("actorId") ?? undefined;
		const logs = await listAuditLogs({ limit, offset, action, actorId });
		return ok({ logs });
	}),
);
