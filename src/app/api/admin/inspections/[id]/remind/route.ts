import { ok, withApiHandler, withPermission } from "@/server/lib";
import { remindInspector } from "@/server/services/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Ctx>(
	{
		route: "/api/admin/inspections/:id/remind",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withPermission<Ctx>("overdue.view", async ({ context }) => {
		const { id } = await context.params;
		const result = await remindInspector({ id });
		return ok(result);
	}),
);
