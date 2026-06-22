import { ErrInvalidFields } from "@/server/constants/errors";
import { getClientIp, ok, withApiHandler, withPermission } from "@/server/lib";
import { getSiteConfig, updateSiteConfig } from "@/server/services/siteConfigs";
import { getUserById } from "@/server/services/users";
import { updateSiteConfigBodySchema } from "@/server/validators/siteConfigs/validate";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{
		route: "/api/admin/site-config",
		rateLimit: { windowMs: 60_000, maxRequests: 120 },
	},
	withPermission("site_config.view", async () => {
		const config = await getSiteConfig();
		return ok({ config });
	}),
);

export const PATCH = withApiHandler(
	{
		route: "/api/admin/site-config",
		// Tighter than the GET — writes are rare and audit-logged.
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	withPermission("site_config.edit", async ({ req, auth }) => {
		const body = await req.json().catch(() => null);
		const parsed = updateSiteConfigBodySchema.safeParse(body);
		if (!parsed.success) throw ErrInvalidFields;

		// Look up the actor email so the audit log is greppable without a join.
		const actor = await getUserById({ id: auth.userId }).catch(() => null);

		const config = await updateSiteConfig({
			patch: parsed.data,
			actor: { userId: auth.userId, email: actor?.email },
			request: {
				ip: getClientIp(req),
				userAgent: req.headers.get("user-agent") ?? undefined,
			},
		});

		return ok({ config }, "Settings updated");
	}),
);
