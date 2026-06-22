import { ErrInvalidFields } from "@/server/constants/errors";
import { ok, withApiHandler, withPermission } from "@/server/lib";
import { setInspectorStatus } from "@/server/services/admin";
import { setInspectorStatusBodySchema } from "@/server/validators/admin/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ userId: string }> };

export const PATCH = withApiHandler<Ctx>(
	{
		route: "/api/admin/inspectors/:userId",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withPermission<Ctx>("inspectors.approve", async ({ req, context }) => {
		const { userId } = await context.params;
		const body = await req.json().catch(() => null);
		const parsed = setInspectorStatusBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		const user = await setInspectorStatus({
			userId,
			action: parsed.data.action,
		});

		return ok({ user });
	}),
);
